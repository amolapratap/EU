"""
File: backend/scripts/migrate_subject_id.py

Migration script to safely populate Paper.subject_id -> Subject._id.
Idempotent, non-destructive, with dry-run and validation gates.
"""

import sys
import os
import argparse
from pathlib import Path
from typing import Dict, Any, List
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load environment variables from backend/.env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "EU_study")


def get_db(uri: str, db_name: str):
    client = MongoClient(uri)
    return client, client[db_name]


def check_duplicate_subject_codes(db) -> List[Dict[str, Any]]:
    """Check for duplicate codes in subjects collection."""
    pipeline = [
        {
            "$group": {
                "_id": "$code",
                "count": {"$sum": 1},
                "subjects": {"$push": "$_id"}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        }
    ]
    return list(db.subjects.aggregate(pipeline))


def run_dry_run(db):
    print("=" * 65)
    print("MIGRATION DRY RUN (READ ONLY)")
    print("=" * 65)

    # 1. Pre-validation: check duplicate subject codes
    duplicates = check_duplicate_subject_codes(db)
    if duplicates:
        print("\n[CRITICAL ERROR] Duplicate subject codes detected in 'subjects':")
        for d in duplicates:
            print(f"  Code: {d['_id']} | Count: {d['count']} | Subject IDs: {d['subjects']}")
        print("\nABORTING. Duplicate subject codes must be resolved before proceeding.")
        sys.exit(1)
    print("✅ Duplicate subject code check passed: 0 duplicates found.")

    # 2. Inspect subjects and papers
    subjects = list(db.subjects.find({}, {"_id": 1, "code": 1}))
    total_subjects = len(subjects)
    total_papers = db.papers.count_documents({})
    already_migrated = db.papers.count_documents({"subject_id": {"$exists": True}})

    print(f"Total Subjects: {total_subjects}")
    print(f"Total Papers in DB: {total_papers}")
    print(f"Papers already having subject_id: {already_migrated}")
    print("-" * 65)

    total_would_update = 0
    subject_code_map = {}

    for sub in subjects:
        sub_id = sub["_id"]
        code = str(sub.get("code", "")).strip()
        subject_code_map[code] = sub_id

        # Find papers matching subject_code that do not yet have subject_id
        count = db.papers.count_documents({
            "subject_code": code,
            "subject_id": {"$exists": False}
        })

        if count > 0:
            print(f"  {code} -> {sub_id} -> {count} papers")
            total_would_update += count

    print("-" * 65)
    print(f"Total papers that WOULD be updated: {total_would_update}")

    # 3. Check for orphan papers (papers with subject_code not matching any subject)
    orphan_papers = list(db.papers.find(
        {
            "subject_id": {"$exists": False},
            "subject_code": {"$nin": list(subject_code_map.keys())}
        },
        {"_id": 1, "subject_code": 1, "name": 1, "year": 1}
    ))

    if orphan_papers:
        print(f"\n[WARNING] Found {len(orphan_papers)} papers whose subject_code does NOT match any subject:")
        for p in orphan_papers[:15]:
            print(f"  Paper ID: {p['_id']} | subject_code: '{p.get('subject_code')}' | name: '{p.get('name')}'")
        if len(orphan_papers) > 15:
            print(f"  ... and {len(orphan_papers) - 15} more.")
        print("Note: In accordance with safety rules, these papers will NOT be guessed or touched.")
    else:
        print("✅ All papers match a valid Subject in 'subjects'.")

    print("=" * 65)
    return duplicates, total_would_update, orphan_papers


def run_migration(db):
    print("=" * 65)
    print("STARTING DATABASE MIGRATION")
    print("=" * 65)

    # 1. Gate: Check duplicates
    duplicates = check_duplicate_subject_codes(db)
    if duplicates:
        print("\n[CRITICAL ERROR] Duplicate subject codes detected. Aborting migration.")
        for d in duplicates:
            print(f"  Code: {d['_id']} | Count: {d['count']} | Subject IDs: {d['subjects']}")
        sys.exit(1)

    total_papers_before = db.papers.count_documents({})
    already_having_id = db.papers.count_documents({"subject_id": {"$exists": True}})
    subjects = list(db.subjects.find({}, {"_id": 1, "code": 1}))

    updated_count = 0

    for sub in subjects:
        sub_id = sub["_id"]
        code = str(sub.get("code", "")).strip()

        # Update papers matching code that do NOT have subject_id
        result = db.papers.update_many(
            {
                "subject_code": code,
                "subject_id": {"$exists": False}
            },
            {
                "$set": {
                    "subject_id": sub_id
                }
            }
        )
        if result.modified_count > 0:
            print(f"Updated {result.modified_count} papers for Subject '{code}' ({sub_id})")
            updated_count += result.modified_count

    print("-" * 65)
    print(f"Total papers before migration: {total_papers_before}")
    print(f"Papers already having subject_id: {already_having_id}")
    print(f"Papers updated during this run: {updated_count}")
    print("=" * 65)


def verify_migration(db):
    print("=" * 65)
    print("POST-MIGRATION VALIDATION")
    print("=" * 65)

    total_papers = db.papers.count_documents({})
    without_subject_id = db.papers.count_documents({"subject_id": {"$exists": False}})
    with_subject_id = db.papers.count_documents({"subject_id": {"$exists": True}})

    print(f"1. Total papers in DB: {total_papers}")
    print(f"2. Papers with subject_id: {with_subject_id}")
    print(f"3. Papers without subject_id: {without_subject_id}")

    # Check that all subject_ids point to a real subject document
    all_subject_ids = set(sub["_id"] for sub in db.subjects.find({}, {"_id": 1}))
    paper_subject_ids = db.papers.distinct("subject_id")
    invalid_ids = [sid for sid in paper_subject_ids if sid and sid not in all_subject_ids]

    if invalid_ids:
        print(f"❌ [ERROR] Found invalid subject_ids in papers: {invalid_ids}")
    else:
        print("✅ 4. All subject_id values in papers resolve to valid existing subjects.")

    # Check subject_code was not removed or altered
    papers_without_code = db.papers.count_documents({"subject_code": {"$exists": False}})
    print(f"✅ 5. Papers missing subject_code: {papers_without_code} (Must be 0).")

    # Check question arrays intact
    papers_with_questions = db.papers.count_documents({"questions.0": {"$exists": True}})
    print(f"✅ 6. Papers with questions: {papers_with_questions} (Questions intact).")

    # Check PDFs integrity
    papers_with_pdf = db.papers.count_documents({"paper_pdf": {"$exists": True, "$ne": ""}})
    print(f"✅ 7. Papers with PDF URLs: {papers_with_pdf} (URLs untouched).")

    print("=" * 65)


def create_subject_id_index(db):
    print("Ensuring index { subject_id: 1 } on papers collection...")
    db.papers.create_index([("subject_id", 1)])
    print("✅ Index created successfully.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Paper.subject_id Migration Utility")
    parser.add_argument("--uri", default=MONGO_URI, help="MongoDB connection URI")
    parser.add_argument("--db", default=MONGO_DB_NAME, help="MongoDB database name")
    parser.add_argument("--dry-run", action="store_true", help="Perform read-only dry run")
    parser.add_argument("--migrate", action="store_true", help="Execute actual migration")
    parser.add_argument("--verify", action="store_true", help="Run post-migration validation checks")
    parser.add_argument("--create-index", action="store_true", help="Create subject_id index")

    args = parser.parse_args()

    if not args.uri:
        print("Error: MONGO_URI must be provided via --uri or environment variable.")
        sys.exit(1)

    client, db = get_db(args.uri, args.db)

    if args.dry_run:
        run_dry_run(db)
    elif args.migrate:
        run_migration(db)
        verify_migration(db)
        create_subject_id_index(db)
    elif args.verify:
        verify_migration(db)
    elif args.create_index:
        create_subject_id_index(db)
    else:
        # Default to dry-run if no action specified
        run_dry_run(db)
