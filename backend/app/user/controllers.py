from bson import ObjectId
from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json
from datetime import datetime, timezone
from fastapi import HTTPException



# ---------------- GET ACCOUNT ----------------
async def get_account_ctrl(user_id):
    user = await db_instance.db.users.find_one(
        {
            "_id": ObjectId(user_id),
            "is_deleted": {"$ne": True}  # Safely handles legacy users who lack this field
        }
    )
    if not user:
        raise HTTPException(status_code=404, detail="Account not found or deleted")
    
    has_password = bool(user.get("password_hash"))
    user.pop("password_hash", None)
    data = mongo_to_json(user)
    data["has_password"] = has_password
    return {"success": True, "data": data}

# ---------------- UPDATE SEMESTER ----------------
async def update_semester_ctrl(user_id, body):
    semester = body.get("semester")

    if not semester:
        raise HTTPException(status_code=400, detail="Semester is required")

    res = await db_instance.db.users.update_one(
        {
            "_id": ObjectId(user_id),
            "is_deleted": {"$ne": True}
        },
        {
            "$set": {
                "semester": semester,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found or deleted")

    return {"success": True, "message": "Semester updated successfully"}

async def update_account_ctrl(user_id, body):
    semester = body.get("semester")
    branch = body.get("branch")

    if not semester:
        raise HTTPException(status_code=400, detail="Semester is required")
    if not branch:
        raise HTTPException(status_code=400, detail="Branch is required")

    res = await db_instance.db.users.update_one(
        {
            "_id": ObjectId(user_id),
            "is_deleted": {"$ne": True}
        },
        {
            "$set": {
                "semester": semester,
                "branch": branch,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found or deleted")

    return {"success": True, "message": "Semester updated successfully"}





async def list_semesters():
    sem = await db_instance.db.semesters.find().sort("code", 1).to_list(100)
    return {"success": True, 'data': mongo_to_json(sem)}


async def list_branches():
    br = await db_instance.db.branches.find().sort("code", 1).to_list(100)
    return {"success": True, 'data': mongo_to_json(br)}

# -------------------------------------------------
# GET SUBJECTS (by semester + branch)
# -------------------------------------------------
async def list_subjects(semester_code: int, branch_code: str):
    cursor = db_instance.db.subjects.find(
        {"semester_code": semester_code, "branch_code": branch_code}
    )

    docs = await cursor.to_list(length=None)

    return {
        "success": True,
        "data": [mongo_to_json(d) for d in docs],
    }


# -------------------------------------------------
# GET PAPERS (by subject_code)
# -------------------------------------------------
# async def list_papers(subject_code: str):
#     cursor = db_instance.db.papers.find(
#         {"subject_code": subject_code}
#     ).sort("year", -1)

#     docs = await cursor.to_list(length=None)

#     return {
#         "success": True,
#         "data": [mongo_to_json(d) for d in docs],
#     }

async def list_papers(subject_id: str = None, subject_code: str = None):
    query: dict = {"questions.0": {"$exists": True}}

    raw_target = subject_id or subject_code
    target = str(raw_target).strip() if raw_target else None

    if not target:
        return {
            "success": False,
            "message": "subject_id or subject_code is required",
            "data": []
        }

    if ObjectId.is_valid(target):
        # Direct lookup by subject_id (primary)
        query["subject_id"] = ObjectId(target)
    else:
        # If code comes from frontend, find _id of subject first then find papers by subject_id
        subject = await db_instance.db.subjects.find_one({"code": target})
        if subject:
            query["subject_id"] = subject["_id"]
        else:
            query["subject_code"] = target

    docs = await db_instance.db.papers.find(query).sort("year", -1).to_list(None)

    return {
        "success": True,
        "data": mongo_to_json(docs)
    }



# -------------------------------------------------
# GET FULL PAPER (with questions)
# -------------------------------------------------
async def get_full_paper(paper_id: str):
    doc = await db_instance.db.papers.find_one(
        {"_id": ObjectId(paper_id)}
    )

    if not doc:
        return {
            "success": False,
            "message": "Paper not found",
            "data": None,
        }

    return {
        "success": True,
        "data": mongo_to_json(doc),
    }
