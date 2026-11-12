"""
Find and fix duplicate / mixed-case emails in the users collection.

Default is dry-run (prints only). Use --apply to write changes.

What --apply does:
  1. Lowercases every user email (Abc@gmail.com -> abc@gmail.com)
  2. For remaining duplicates, keeps the oldest account (created_at, then _id)
  3. Renames extra accounts to a unique address so the unique index can be created
     e.g. abc@gmail.com -> abc+dup-<userid>@gmail.com
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "eu_study")


def get_duplicate_groups(db):
    pipeline = [
        {"$match": {"email": {"$type": "string", "$ne": ""}}},
        {
            "$group": {
                "_id": {"$toLower": "$email"},
                "count": {"$sum": 1},
                "users": {
                    "$push": {
                        "_id": "$_id",
                        "email": "$email",
                        "name": "$name",
                        "created_at": "$created_at",
                        "login_type": "$login_type",
                    }
                },
            }
        },
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"count": -1}},
    ]
    return list(db.users.aggregate(pipeline))


def sort_keep_first(users):
    def key(u):
        created = u.get("created_at")
        return (created is None, created, str(u["_id"]))

    return sorted(users, key=key)


def print_groups(groups):
    if not groups:
        print("No duplicate emails found (case-insensitive).")
        return

    print(f"Found {len(groups)} email(s) with more than one account:\n")
    for g in groups:
        print(f"  {g['_id']}  ({g['count']} accounts)")
        for u in sort_keep_first(g["users"]):
            print(
                f"    _id={u['_id']}  stored={u.get('email')!r}  "
                f"name={u.get('name')!r}  created_at={u.get('created_at')}  "
                f"login_type={u.get('login_type')}"
            )
        print()


def apply_fix(db):
    users = list(db.users.find({"email": {"$type": "string", "$ne": ""}}))
    lowercased = 0
    for u in users:
        email = u["email"]
        normalized = email.strip().lower()
        if email != normalized:
            db.users.update_one({"_id": u["_id"]}, {"$set": {"email": normalized}})
            lowercased += 1
            print(f"Lowercased {u['_id']}: {email!r} -> {normalized!r}")

    groups = get_duplicate_groups(db)
    renamed = 0
    for g in groups:
        ordered = sort_keep_first(g["users"])
        keep = ordered[0]
        print(f"Keeping {keep['_id']} for {g['_id']}")
        for extra in ordered[1:]:
            local, _, domain = g["_id"].partition("@")
            new_email = f"{local}+dup-{extra['_id']}@{domain}"
            db.users.update_one({"_id": extra["_id"]}, {"$set": {"email": new_email}})
            renamed += 1
            print(f"  Renamed {extra['_id']}: {extra.get('email')!r} -> {new_email!r}")

    print(f"\nDone. Lowercased={lowercased}, extras renamed={renamed}")
    leftover = get_duplicate_groups(db)
    if leftover:
        print("Still have duplicates. Do not create the unique index yet.")
        print_groups(leftover)
        return False
    print("No duplicates left. Restart the backend to create users_email_unique_idx.")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fix duplicate user emails")
    parser.add_argument("--uri", default=MONGO_URI)
    parser.add_argument("--db", default=MONGO_DB_NAME)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write changes. Without this flag, only prints duplicates.",
    )
    args = parser.parse_args()

    if not args.uri:
        print("Error: MONGO_URI must be set in backend/.env or passed as --uri")
        sys.exit(1)

    client = MongoClient(args.uri)
    db = client[args.db]

    groups = get_duplicate_groups(db)
    print_groups(groups)

    mixed_case = db.users.count_documents(
        {"email": {"$regex": "[A-Z]"}}
    )
    print(f"Users with uppercase letters in email: {mixed_case}")

    if args.apply:
        apply_fix(db)
    else:
        print("Dry run only. Re-run with --apply to lowercase emails and rename extras.")
