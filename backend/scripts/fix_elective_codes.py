import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

env_path = Path(r"C:\Users\ASUS\Desktop\CUR\EU\backend\.env")
load_dotenv(env_path)

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("MONGO_DB_NAME", "eu_study")]

# Update OE-I
db.elective_subjects.update_one(
    {"_id": ObjectId("6aeb3bc4ae857c3b58bfb722")},
    {"$set": {"code": "OE-I"}}
)

# Update OE-II
db.elective_subjects.update_one(
    {"_id": ObjectId("6aeb3c62fc19755d3bb93537")},
    {"$set": {"code": "OE-II"}}
)

# Update PE- Lab
db.elective_subjects.update_one(
    {"_id": ObjectId("6aeb3cb5fc19755d3bb93538")},
    {"$set": {"code": "PE-Lab"}}
)

print("Updated MongoDB elective group codes!")
docs = list(db.elective_subjects.find({"semester_code": "7", "branch_code": "105"}))
for d in docs:
    print(d["_id"], d.get("short_name"), "-> code:", d.get("code"))
