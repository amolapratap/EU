import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

env_path = Path(r'C:\Users\ASUS\Desktop\CUR\EU\backend\.env')
load_dotenv(env_path)

MONGO_URI = os.getenv('MONGO_URI')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'eu_study')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

version_data = {
    "app_id": "in.alpharesult.app",
    "latestVersion": "1.2.1",
    "latestVersionCode": 22,
    "minRequiredVersion": "1.0.0",
    "title": "Update Available (v1.2.1)",
    "message": "A new update is live on Google Play with bug fixes and performance improvements!",
    "releaseNotes": [
        "Performance improvements and faster question paper loading",
        "Bug fixes and UI stability enhancements",
        "General polish and improved reading experience"
    ],
    "storeUrl": "https://play.google.com/store/apps/details?id=in.alpharesult.app",
    "isForceUpdate": False,
    "updated_at": datetime.now(timezone.utc),
    "updated_by": "Release v1.2.1"
}

res = db.app_version.update_one(
    {"app_id": "in.alpharesult.app"},
    {"$set": version_data},
    upsert=True
)

print(f"Matched: {res.matched_count}, Modified: {res.modified_count}, Upserted: {res.upserted_id}")

doc = db.app_version.find_one({"app_id": "in.alpharesult.app"}, {"_id": 0})
print("Current DB state:")
import json
print(json.dumps(doc, default=str, indent=2))
