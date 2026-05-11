from email import message
import re
from app.utils.datetime import utcnow
from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json
from fastapi import HTTPException
from bson import ObjectId
from zoneinfo import ZoneInfo
from datetime import datetime
from pymongo import ReturnDocument
import cloudinary.uploader


async def list_semesters():
    sem = await db_instance.db.semesters.find().sort("code", 1).to_list(100)
    return {"success": True, 'data': mongo_to_json(sem)}


async def list_branches():
    br = await db_instance.db.branches.find().sort("code", 1).to_list(100)
    return {"success": True, 'data': mongo_to_json(br)}


async def list_subjects(semester=None, branch=None):
    query = {
        "subject_credit": {
            "$exists": True,
            "$nin": [None, "", "0"]
        },
        "subject_type": {"$in": ["Theory", "Practical"]},
        "max_marks": {
            "$exists": True,
            "$nin": [None, "", 0]
        },
    }

    if semester:
        query["semester_code"] = semester

    if branch:
        query["branch_code"] = branch

    subjects = await (
        db_instance.db.subjects
        .find(query,
        {
            "syllabus": 0   # ❌ exclude syllabus
        }
        )
        .sort("code", 1)
        .to_list(length=200)
    )

    return {
        "success": True,
        "data": mongo_to_json(subjects),
    }


async def get_next_gpa1_count():
    doc = await db_instance.db.counters.find_one_and_update(
        {"_id": "gpa1"},
        {"$inc": {"seq": 1}},
        return_document=ReturnDocument.AFTER,
        upsert=True
    )
    return doc["seq"]


def marks_to_grade_point(percent: float) -> int:
    if percent >= 90:
        return 10
    elif percent >= 80:
        return 9
    elif percent >= 70:
        return 8
    elif percent >= 60:
        return 7
    elif percent >= 50:
        return 6
    elif percent >= 35:
        return 5
    else:
        return 0


async def sgpa(body, current_user):

    sem = body.get("semester")
    br = body.get("branch")
    marks = body.get("marks")

    if not sem or not br or not marks:
        raise HTTPException(status_code=400, message="Invalid subject details")

    cursor = db_instance.db.subjects.find(
        {"semester_code": sem, "branch_code": br}
        )

    subs = await cursor.to_list(length=None)
    if not subs:
        raise HTTPException(status_code=404, message="Subjects not found")

    subject_map = {}
    for sub in subs:
        
        if not sub.get("subject_credit"):
            print(f"Credit missing for subject {sub["code"]}")
            continue
            raise HTTPException(
                status_code=400,
                detail=f"Credit missing for subject {sub["code"]}"
            )

        subject_map[sub["code"]] = {
            "credit": float(sub["subject_credit"]),
            "type": sub["subject_type"],
            "max_marks": int(sub.get("max_marks", 100))
        }

    result  = -1
    total_credit = 0.0
    total_grade_points = 0.0
    for sub_code, sub_mark in marks.items():
        if sub_code not in subject_map:
            raise HTTPException(
                status_code=400,
                detail=f"subject {sub_code} not found"
            )
        

        meta = subject_map[sub_code]
        credit = meta["credit"]
        subject_type = meta["type"]
        max_marks = meta["max_marks"]


        # ---------------- THEORY ----------------
        if subject_type == "Theory":
            ext = sub_mark.get("external")
            inte = sub_mark.get("internal")
            if ext > 70:
                raise HTTPException(
                status_code=400,
                detail=f"Maximum marks for external ({sub_code}) is 70"
            )
            if inte > 30:
                raise HTTPException(
                status_code=400,
                detail=f"Maximum marks for internal ({sub_code}) is 30"
            )

            if ext is None or inte is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing marks for {sub_code}"
                )

            total = ext + inte

            # PASS RULES
            if ext < 25 or total < 35:
                grade_point = 0
            else:
                percent = (total / max_marks) * 100
                grade_point = marks_to_grade_point(percent)

        # ---------------- PRACTICAL ----------------
        elif subject_type == "Practical":
            total = sub_mark.get("total")

            if total is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing practical marks for {sub_code}"
                )
            if total > max_marks:
                raise HTTPException(
                status_code=400,
                detail=f"Maximum marks for Practical ({sub_code}) is {max_marks}"
            )

            percent = (total / max_marks) * 100
            grade_point = marks_to_grade_point(percent)


        total_grade_points += grade_point * credit
        total_credit += credit

    if total_credit == 0:
        raise HTTPException(status_code=400, detail="Credits not found, contact Alpha Result")

    result = round(total_grade_points / total_credit, 2)

    email = ""
    if current_user and current_user.get("user_id"):
        user = await db_instance.db.users.find_one(
            {"_id": ObjectId(current_user["user_id"])}
        )
        if user:
            email = user.get("email", "")


    count = await get_next_gpa1_count()


    await db_instance.db.gpa1.insert_one({
        "count": count,
        "email": email or "",
        "semester": sem,
        "branch": br,
        "marks": marks,
        "sgpa": result,
        "created_at": utcnow()
    })


    return {
            "success": True,
            "sgpa": result
        }

##================PUBLIC UPLOAD==================##


async def upload_pdf_to_cloudinary_public(
    file_bytes: bytes,
    public_id: str,
    folder: str = None,
    overwrite: bool = True
):
    try:
        # Build full public_id with folder if provided
        full_public_id = f"{folder}/{public_id}" if folder else public_id

        result = cloudinary.uploader.upload(
            file_bytes,
            resource_type="raw",   # required for PDFs
            public_id=full_public_id,
            overwrite=overwrite
        )

        return {
            "success": True,
            "message": "uploaded Question paper pdf on cloudnari by public",
            "secure_url": result.get("secure_url"),
            "public_id": result.get("public_id"),
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

##==============For manage function of missing papers uploed by Pubkic=======##

# To get all missing paper for publiv
async def get_missing_papers_public(query_params):

    filters = {}
    print("req_semester_code", query_params.get("req_semester_code"))
    if query_params.get("req_semester_code"):
        filters["req_semester_code"] = query_params["req_semester_code"]
        print("req_semester_code", query_params.get("req_semester_code"))

    if query_params.get("branch_code"):
        filters["branch_code"] = query_params["branch_code"]

    if query_params.get("year"):
        filters["year"] = query_params["year"]

    # 🔥 Only uploadable papers
    filters["status"] = {
        "$in": query_params.get("status", ["missing", "rejected", "approved", "under_review"])
    }

    if query_params.get("search"):
        filters["req_paper_code"] = {
            "$regex": query_params["search"],
            "$options": "i"
        }

    page = int(query_params.get("page", 1))
    limit = int(query_params.get("limit", 50))
    skip = (page - 1) * limit

    cursor = await db_instance.db.missing_papers.find(filters) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(limit).to_list(None)

    # papers = list(cursor)
    papers = mongo_to_json(cursor)
    
    for p in papers:
        # 🔥 hide sensitive fields
        p.pop("reviewed_by", None)
        p.pop("final_public_id", None)
        p.pop("temp_public_id", None)
        p.pop("created_at", None)
        p.pop("created_by", None)
        p.pop("reviewed_at", None)

    return {
        "success": True,
        "message": "getted all missing papers successfully",
        "data": papers
    }


#  To upload a file by public and upadate missing paper db
async def upload_public_missing_paper(paper_id: str, file, uploader_name: str):

    # ✅ Validate ObjectId
    try:
        obj_id = ObjectId(paper_id)
    except:
        return {"success": False, "error": "Invalid paper_id"}

    # ✅ Fetch missing paper
    missing_paper = await db_instance.db.missing_papers.find_one({"_id": obj_id})

    if not missing_paper:
        return {"success": False, "error": "Paper not found"}

    status = missing_paper.get("status")

    # 🚨 Status validation
    if status in ["approved", "available"]:
        raise HTTPException(400, "Paper already available")

    if status in ["under_review"]:
        raise HTTPException(
        status_code=400,
        detail=f"Question paper is uploaded, to be reviewed by admin"
    )

    if status not in ["missing", "rejected"]:
        raise HTTPException(
        status_code=400,
        detail=f"Cannot upload in current state: {status}"
    )

    # 🔥 FILE VALIDATION
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF allowed")

    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    file_bytes = await file.read()

    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")


    # UPLOAD TO CLOUDINARY (TEMP)
     # public_id

    public_id = f"PUBLIC/BEU/pyq/{missing_paper['branch_code']}/sem-{missing_paper['semester_code']}/{missing_paper['subject_code']}/{missing_paper['year']}_{missing_paper['exam_type']}_{missing_paper['paper_type']}"
    clean_name = f"{missing_paper['subject_code']}_{missing_paper['year']}_{missing_paper['exam_type']}_{missing_paper['paper_type']}".replace(" ", "_")
    public_id = f"{public_id}/{clean_name}.pdf"  

    upload_res = await upload_pdf_to_cloudinary_public(
        file_bytes,
        public_id
    )

    if not upload_res.get("success"):
        raise HTTPException(500, upload_res.get("error", "Upload failed"))

    temp_url = upload_res.get("secure_url")
    temp_public_id = upload_res.get("public_id")

    # UPDATE DB
    await db_instance.db.missing_papers.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": "under_review",
                "temp_pdf_url": temp_url,
                "temp_public_id": temp_public_id,
                "uploader_name": uploader_name,
                "description": "Uploaded by public, pending review"
            }
        }
    )

    return {
        "success": True,
        "message": "PDF uploaded successfully, under review",
        "uploader_name": uploader_name,
        "status": "under_review"
    }

