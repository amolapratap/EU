from datetime import datetime, timezone
from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json
from app.utils.datetime import utcnow
from app.utils.cloudinary_config import upload_solution_image
from app.config import settings
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse, Response
from app.utils.cloudinary_config import delete_file
from app.utils.logger import logger
import fitz  # PyMuPDF
from io import BytesIO

import httpx

ar_pdf_url =settings.PDF_SERVICE_BASE_URL


# ======================================================
# SEMESTER
# ======================================================

async def create_semester(body, admin):

    code = body["code"]
    existing = await db_instance.db.semesters.find_one({"code": code})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Semester with code '{code}' already exists",
            
        )

    now = utcnow()
    await db_instance.db.semesters.insert_one({
        "code": body["code"],
        "name": body["name"],
        "created_at": now,
        "updated_at": now,
        "admin_userids": [admin["admin_userid"]]
    })
    return {"success": True}

async def list_semesters():
    sem = await db_instance.db.semesters.find().sort("code", 1).to_list(100)
    return {"success": True, 'data': mongo_to_json(sem)}

async def update_semester(code: str, body, admin):
    await db_instance.db.semesters.update_one(
        {"code": code},
        {
            "$set": {
                "name": body["name"],
                "updated_at": utcnow()
            },
            "$addToSet": {
                "admin_userids": admin["admin_userid"]
            }

        }
    )
    return {"success": True}

async def delete_semester(code: str):
    await db_instance.db.semesters.delete_one({"code": code})
    return {"success": True}

async def count_semester():
    sem_count = await db_instance.db.semesters.count_documents({})
    return {
        "success": True,
        "data": int(sem_count)
    }


# ======================================================
# BRANCH
# ======================================================

async def create_branch(body, admin):

    code = body["code"]
    existing = await db_instance.db.branches.find_one({"code": code})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Branch with code '{code}' already exists",
            
        )


    await db_instance.db.branches.insert_one({
        "code": body["code"],
        "short_name": body["short_name"],
        "full_name": body["full_name"],
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "admin_userids": [admin["admin_userid"]]
    })
    return {"success": True}

async def list_branches():
    branch =  await db_instance.db.branches.find().sort("code", 1).to_list(100)
    return {"success": True, 'data': mongo_to_json(branch)}

async def update_branch(code: str, body, admin):
    await db_instance.db.branches.update_one(
        {"code": code},
        {
            "$set": {
                "short_name": body["short_name"],
                "full_name": body["full_name"],
                "updated_at": utcnow()
            },
            "$addToSet": {
                "admin_userids": admin["admin_userid"]
            }
        }
    )
    return {"success": True}

async def delete_branch(code: str):
    await db_instance.db.branches.delete_one({"code": code})
    return {"success": True}

async def count_branch():
    br_count = await db_instance.db.branches.count_documents({})
    return {
        "success": True,
        "data": int(br_count)
    }


# ======================================================
# SUBJECT
# ======================================================

async def create_subject(body, admin):

    code = body["code"]
    existing = await db_instance.db.subjects.find_one({"code": code})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Subjects with code '{code}' already exists",
            
        )
    
    subject_type = body["subject_type"]
    max_marks = int(body["max_marks"])
    branch_code = body.get("branch_code")

    if not branch_code:
        raise HTTPException(
            status_code=400,
            detail="branch_code is required"
        )

    if not isinstance(branch_code, (str, list)):
        raise HTTPException(
            status_code=400,
            detail="branch_code must be string or list"
        )

    if subject_type == "Theory" and max_marks != 100:
        raise HTTPException(
            status_code=400,
            detail="Theory subjects must have max_marks = 100"
        )

    if subject_type == "Practical" and max_marks not in (50, 100):
        raise HTTPException(
            status_code=400,
            detail="Practical subjects must have max_marks = 50 or 100"
        )


    await db_instance.db.subjects.insert_one({
        "code": body["code"],
        "short_name": body["short_name"],
        "full_name": body["full_name"],
        "semester_code": body["semester_code"],
        "branch_code": branch_code,
        "subject_type": subject_type,
        "subject_credit": body["subject_credit"],
        "max_marks": max_marks,
        "all_paper_pdf": body.get("all_paper_pdf"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": utcnow(),
        "admin_userids": [admin["admin_userid"]]
    })
    return {"success": True}

async def list_subjects(semester=None, branch=None):
    query = {}
    if semester:
        query["semester_code"] = semester
    if branch:
        query["branch_code"] = branch

    subject =  await db_instance.db.subjects.find(query).sort("code", 1).to_list(200)
    return {"success": True, 'data': mongo_to_json(subject)}

async def update_subject(identifier: str, body, admin):

    subject_type = body["subject_type"]
    max_marks = int(body["max_marks"])
    branch_code = body.get("branch_code")

    if not branch_code:
        raise HTTPException(
            status_code=400,
            detail="branch_code is required"
        )

    if not isinstance(branch_code, (str, list)):
        raise HTTPException(
            status_code=400,
            detail="branch_code must be string or list"
        )

    if subject_type == "Theory" and max_marks != 100:
        raise HTTPException(
            status_code=400,
            detail="Theory subjects must have max_marks = 100"
        )

    if subject_type == "Practical" and max_marks not in (50, 100):
        raise HTTPException(
            status_code=400,
            detail="Practical subjects must have max_marks = 50 or 100"
        )

    subject = None
    if ObjectId.is_valid(identifier):
        subject = await db_instance.db.subjects.find_one({"_id": ObjectId(identifier)})
    if not subject:
        subject = await db_instance.db.subjects.find_one({"code": identifier})

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_set = {
        "short_name": body["short_name"],
        "full_name": body["full_name"],
        "semester_code": body["semester_code"],
        "branch_code": branch_code,
        "subject_type": subject_type,
        "subject_credit": body["subject_credit"],
        "max_marks": max_marks,
        "all_paper_pdf": body.get("all_paper_pdf"),
        "updated_at": utcnow()
    }

    # Allow admin to edit code of subject
    new_code = body.get("code")
    if new_code:
        new_code = str(new_code).strip()
        if new_code != subject.get("code"):
            existing = await db_instance.db.subjects.find_one({
                "code": new_code,
                "_id": {"$ne": subject["_id"]}
            })
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Subject with code '{new_code}' already exists"
                )
            update_set["code"] = new_code
            # Note: Paper.subject_code is intentionally NOT cascaded.
            # Paper.subject_code preserves the code at creation time for memory/historical reference.

    existing_admins = subject.get("admin_userids")
    if isinstance(existing_admins, list):
        if admin.get("admin_userid") and admin["admin_userid"] not in existing_admins:
            existing_admins.append(admin["admin_userid"])
        update_set["admin_userids"] = existing_admins
    elif isinstance(existing_admins, str):
        admin_list = [existing_admins]
        if admin.get("admin_userid") and admin["admin_userid"] not in admin_list:
            admin_list.append(admin["admin_userid"])
        update_set["admin_userids"] = admin_list
    else:
        update_set["admin_userids"] = [admin["admin_userid"]] if admin.get("admin_userid") else []

    await db_instance.db.subjects.update_one(
        {"_id": subject["_id"]},
        {"$set": update_set}
    )

    # Keep child subjects in elective groups synchronized if short_name or full_name changed
    from app.electives.controllers import sync_subject_in_electives
    await sync_subject_in_electives(
        subject_id=subject["_id"],
        short_name=update_set.get("short_name"),
        full_name=update_set.get("full_name")
    )

    return {"success": True}

async def delete_subject(identifier: str):
    from app.electives.controllers import remove_subject_from_electives
    subject = None
    if ObjectId.is_valid(identifier):
        subject = await db_instance.db.subjects.find_one({"_id": ObjectId(identifier)})
    else:
        subject = await db_instance.db.subjects.find_one({"code": identifier})

    if subject:
        await remove_subject_from_electives(subject["_id"])
        await db_instance.db.subjects.delete_one({"_id": subject["_id"]})
    return {"success": True}

async def count_subject():
    sub_count = await db_instance.db.subjects.count_documents({})
    return {
        "success": True,
        "data": int(sub_count)
    }


    #------------SYLLABUS-----------------------
async def update_syllabus(identifier: str, body: dict):

    syllabus = body.get("syllabus", [])

    if ObjectId.is_valid(identifier):
        await db_instance.db.subjects.update_one(
            {"_id": ObjectId(identifier)},
            {"$set": {"syllabus": syllabus}}
        )
    else:
        await db_instance.db.subjects.update_one(
            {"code": identifier},
            {"$set": {"syllabus": syllabus}}
        )

    return {
        "success": True,
        "message": "Updated syllabus"}


#=============================================
#----------PAPERS-----------------------------
#=============================================
from datetime import datetime, timezone
from bson import ObjectId

from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json




async def create_paper(body: dict, admin):
    subject_id = body.get("subject_id")
    subject_code = body.get("subject_code")

    subject = None
    if subject_id:
        try:
            subject = await db_instance.db.subjects.find_one({"_id": ObjectId(subject_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid subject_id")
    elif subject_code:
        subject = await db_instance.db.subjects.find_one({"code": subject_code})

    if not subject:
        raise HTTPException(
            status_code=404,
            detail="Subject not found for the provided subject_id or subject_code"
        )

    subject_code_val = str(body.get("subject_code") or "").strip()
    if not subject_code_val:
        subject_code_val = subject.get("code", subject_code)

    doc = {
        "subject_id": subject["_id"],
        "subject_code": subject_code_val,
        "name": body["name"],
        "type": body["type"],          # exam_type => MID / END / QUIZ / PRACTICE
        "paper_type": body.get("paper_type"),
        "year": body["year"],
        "description": body.get("description", ""),
        "paper_pdf": body.get("paper_pdf", ""),
        "questions": [],
        "admin_userids": [admin["admin_userid"]],
        "created_at": utcnow(),
        "updated_at": utcnow(),
    }

    res = await db_instance.db.papers.insert_one(doc)
    doc["_id"] = res.inserted_id

    return {
        "success": True,
        "data": mongo_to_json(doc)
    }


async def list_papers(subject_id: str):
    """
    List papers belonging to a subject, primarily by subject_id.
    """
    query = {}
    if ObjectId.is_valid(subject_id):
        # Direct lookup by subject_id (primary)
        query = {"subject_id": ObjectId(subject_id)}
    else:
        # Fallback if an old subject_code string is passed
        subject = await db_instance.db.subjects.find_one({"code": subject_id})
        if subject:
            query = {"subject_id": subject["_id"]}
        else:
            query = {"subject_code": subject_id}

    docs = await db_instance.db.papers.find(query).sort("year", -1).to_list(None)

    return {
        "success": True,
        "data": mongo_to_json(docs)
    }


async def get_paper_with_questions(paper_id: str):
    doc = await db_instance.db.papers.find_one({"_id": ObjectId(paper_id)})
    if not doc:
        return {
            "success": False,
            "data": None
        }

    # Ensure each question has admin_userids populated (fallback to paper admin_userids)
    paper_admins = doc.get("admin_userids") or []
    if isinstance(paper_admins, str):
        paper_admins = [paper_admins]
    for q in doc.get("questions", []):
        if not q.get("admin_userids") and paper_admins:
            q["admin_userids"] = paper_admins

    return {"success": True, "data": mongo_to_json(doc)}


async def update_paper(paper_id: str, body: dict, admin):
    update_data = {
        "name": body["name"],
        "type": body["type"],
        "year": body["year"],
        "description": body.get("description", ""),
        "paper_pdf": body.get("paper_pdf", ""),
        "updated_at": utcnow(),
    }

    if "paper_type" in body:
        update_data["paper_type"] = body["paper_type"]

    if "subject_code" in body and body["subject_code"] is not None:
        sc = str(body["subject_code"]).strip()
        if sc:
            update_data["subject_code"] = sc

    # If subject_id is supplied, update the relationship to the new subject.
    # Note: paper.subject_code is intentionally NOT modified (remains as historical snapshot).
    if "subject_id" in body and body["subject_id"]:
        try:
            sub_oid = ObjectId(body["subject_id"])
            subject = await db_instance.db.subjects.find_one({"_id": sub_oid})
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
            update_data["subject_id"] = subject["_id"]
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid subject_id")

    await db_instance.db.papers.update_one(
        {"_id": ObjectId(paper_id)},
        {
            "$set": update_data,
            "$addToSet": {
                "admin_userids": admin["admin_userid"]
            }
        }
    )

    return {"success": True, "message": "Paper updated successfully"}



async def delete_paper(paper_id: str):

    paper = await db_instance.db.papers.find_one({"_id": ObjectId(paper_id)})
    paper_pdf_public_id = paper.get("paper_pdf_public_id")

     # 🔥 DELETE final FILE (if exists) (if pdf uploaded by PUBLIC then its same url in missing paper as final_public and it will not work)
    if paper_pdf_public_id:
        try:
            await delete_file(paper_pdf_public_id)
        except Exception as e:
            logger.warning(f"paper pdf delete failed: {str(e)}")

    await db_instance.db.papers.delete_one({"_id": ObjectId(paper_id)})
    return {"success": True,"message": "Paper deleted successfully"}


async def count_papers():
    paper_count = await db_instance.db.papers.count_documents({})
    return {
        "success": True,
        "data": int(paper_count)
    }




# ---------------- QUESTIONS ----------------



def papers_col():
    return db_instance.db["papers"]



async def add_question_ctrl(paper_id, body, admin):
    # if body.get("sub_questions"):
    #     total = sum(sq["marks"] for sq in body["sub_questions"])
    #     if total != body["marks"]:
    #         raise ValueError("Marks mismatch")

    is_q_obj = (body.get("nature") == "objective") or (isinstance(body.get("options"), list) and len(body.get("options")) >= 2)
    if is_q_obj:
        body["solution_blocks"] = []
    if body.get("sub_questions"):
        for sq in body["sub_questions"]:
            if is_q_obj or (isinstance(sq.get("options"), list) and len(sq.get("options")) >= 2):
                sq["solution_blocks"] = []

    body["admin_userids"] = [admin["admin_userid"]]
    body["updated_at"] = utcnow()

    await papers_col().update_one(
        {"_id": ObjectId(paper_id)},
        {
            "$push": {"questions": body}
        }
    )
    return {"message": "Question added"}

# async def update_question_ctrl(paper_id, q_no, body, admin):
#     await papers_col().update_one(
#         {"_id": ObjectId(paper_id), "questions.q_no": q_no},
#         {
#             "$set": {"questions.$": body, "updated_at": utcnow()},
#             "$addToSet": {"questions.$.admin_userids": admin["admin_userid"]},
#         }
#     )
#     return {"message": "Question updated"}


async def update_question_ctrl(paper_id, q_no, body, admin):
    obj_id = ObjectId(paper_id)
    target_qno = int(q_no) if str(q_no).isdigit() else q_no

    paper = await papers_col().find_one(
        {"_id": obj_id, "questions.q_no": target_qno},
        {"questions.$": 1}
    )

    if not paper or not paper.get("questions"):
        paper = await papers_col().find_one(
            {"_id": obj_id, "questions.q_no": str(target_qno)},
            {"questions.$": 1}
        )
        if paper and paper.get("questions"):
            target_qno = str(target_qno)
        else:
            raise HTTPException(404, "Question not found")

    existing = paper["questions"][0]
    now = utcnow()

    # merge dynamic payload safely
    updated_question = {
        **existing,
        **body,
        "updated_at": now,
    }

    # Standardize q_no to integer if numeric digits
    if "q_no" in updated_question and str(updated_question["q_no"]).isdigit():
        updated_question["q_no"] = int(updated_question["q_no"])

    # preserve + extend admin list safely (handles string or list in db)
    raw_admins = existing.get("admin_userids")
    if isinstance(raw_admins, str):
        existing_admins = [raw_admins.strip()] if raw_admins.strip() else []
    elif isinstance(raw_admins, list):
        existing_admins = [str(x).strip() for x in raw_admins if x]
    else:
        existing_admins = []

    admins = set(existing_admins)
    if admin.get("admin_userid"):
        admins.add(str(admin["admin_userid"]).strip())
    updated_question["admin_userids"] = list(admins)

    # Commit any staged Base64 preview images to Cloudinary permanently upon save
    paper_meta = await papers_col().find_one(
        {"_id": obj_id},
        {"subject_code": 1, "year": 1, "name": 1, "type": 1, "paper_type": 1, "exam_type": 1}
    )
    subject_code = (paper_meta or {}).get("subject_code") or "general"
    year = (paper_meta or {}).get("year") or "common"
    paper_name = (paper_meta or {}).get("name")
    exam_type = (paper_meta or {}).get("type") or (paper_meta or {}).get("exam_type")
    paper_type = (paper_meta or {}).get("paper_type")
    is_q_obj = (updated_question.get("nature") == "objective") or (isinstance(updated_question.get("options"), list) and len(updated_question.get("options")) >= 2)
    if is_q_obj:
        updated_question["solution_blocks"] = []

    if updated_question.get("solution_blocks"):
        from app.admin.ai.cloudinary_service import commit_blocks_images
        updated_question["solution_blocks"] = await commit_blocks_images(
            updated_question["solution_blocks"],
            subject_code=subject_code,
            year=year,
            q_no=target_qno,
            name=paper_name,
            exam_type=exam_type,
            paper_type=paper_type
        )
    if updated_question.get("sub_questions"):
        from app.admin.ai.cloudinary_service import commit_blocks_images
        processed_subs = []
        for sq in updated_question["sub_questions"]:
            sq_item = dict(sq)
            is_sub_obj = is_q_obj or (isinstance(sq_item.get("options"), list) and len(sq_item.get("options")) >= 2)
            if is_sub_obj:
                # Objective sub-questions strictly use solution_md; solution_blocks must be empty!
                sq_item["solution_blocks"] = []
            elif sq_item.get("solution_blocks"):
                sq_item["solution_blocks"] = await commit_blocks_images(
                    sq_item["solution_blocks"],
                    subject_code=subject_code,
                    year=year,
                    q_no=target_qno,
                    sq_no=sq_item.get("sq_no"),
                    name=paper_name,
                    exam_type=exam_type,
                    paper_type=paper_type
                )
            processed_subs.append(sq_item)
        updated_question["sub_questions"] = processed_subs

    await papers_col().update_one(
        {"_id": obj_id, "questions.q_no": target_qno},
        {"$set": {"questions.$": updated_question}}
    )

    return {"success": True, "message": "Question updated"}


# To uplaod a img on cloudnari of solution
async def upload_solution_image_ctrl(
    file,
    public_id,
    admin
):

    if not file.content_type.startswith("image/"):

        raise HTTPException(
            400,
            "Only image files allowed"
        )

    MAX_SIZE = 10 * 1024 * 1024

    file_bytes = await file.read()

    if len(file_bytes) > MAX_SIZE:

        raise HTTPException(
            400,
            "Image too large"
        )

    result = await upload_solution_image(
        file_bytes,
        public_id
    )

    if not result.get("success"):

        raise HTTPException(
            500,
            result.get("error")
        )

    return {
        "success": True,

        "image_url":
            result["image_url"],

        "public_id":
            result["public_id"]
    }



async def delete_question_ctrl(paper_id, q_no, admin):
    await papers_col().update_one(
        {"_id": ObjectId(paper_id)},
        {"$pull": {"questions": {"q_no": q_no}}}
    )
    return {"message": "Question deleted"}

# ---------------- SUB QUESTIONS ----------------
async def add_sub_question_ctrl(paper_id, q_no, body, admin):
    await papers_col().update_one(
        {"_id": ObjectId(paper_id), "questions.q_no": q_no},
        {
            "$push": {"questions.$.sub_questions": body},

        }
    )
    return {"message": "Sub-question added"}

async def delete_sub_question_ctrl(paper_id, q_no, sq_no, admin):
    await papers_col().update_one(
        {"_id": ObjectId(paper_id), "questions.q_no": q_no},
        {"$pull": {"questions.$.sub_questions": {"sq_no": sq_no}}}
    )
    return {"message": "Sub-question deleted"}


    #============PDf Microservice======================

async def call_pdf_service(file: UploadFile, admin):

    admin_id="AR1"
    admin_id = str(admin.get("admin_userid"))
    if not admin_id:
        raise HTTPException(status_code=403, detail="Admin ID missing")
    
    try:
        async with httpx.AsyncClient(
            timeout=float(settings.PDF_SERVICE_TIMEOUT)
        ) as client:

            files = {
                "file": (
                    file.filename,
                    await file.read(),
                    "application/pdf"
                )
            }


            headers = {
                "admin-id": str(admin_id),   # REQUIRED by PDF service
                "Authorization": f"Bearer {settings.PDF_SERVICE_KEY}",
            }

            response = await client.post(
                f"{ar_pdf_url}/admin/process-pdf",
                files=files,
                headers=headers,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                   detail=f"PDF service error {response.status_code}: {response.text}",
                )

             # FIX: Stream the content back to the user
            content_disposition = response.headers.get("content-disposition")

            headers = {
                "Access-Control-Expose-Headers": "Content-Disposition"
            } 

            if content_disposition:
                headers["Content-Disposition"] = content_disposition

            if "content-length" in response.headers:
                headers["Content-Length"] = response.headers["content-length"]

            return Response(
            content=response.content,   # 👈 buffer once
            media_type="application/pdf",
            headers=headers
        )

            # return StreamingResponse(
            #     response.aiter_bytes(),  # Stream chunks to keep memory usage low
            #     media_type="application/pdf",
            #     headers=headers
            # )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="PDF processing service timeout",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing error: {str(e)}",
        )







#===============ALL Upload CONTROLLERS===================#

import cloudinary.uploader

async def upload_pdf_to_cloudinary(file, branch, sem, subject, year, exam_type, admin):

    # content_type = file.content_type
    file.seek(0)
    resource_type = "raw"

    # 🔥 detect type using MIME
    # if content_type == "application/pdf":
    #     resource_type = "raw"
    # elif content_type.startswith("image/"):
    #     resource_type = "image"
    # else:
    #     return {
    #         "success": False,
    #         "error": "Unsupported file type"
    #     }

    # 🔥 public_id
    if exam_type:
        public_id = f"BEU/pyq/{branch}/sem-{sem}/{subject}/{year}_{exam_type}"
    else:
        public_id = f"BEU/pyq/{branch}/sem-{sem}/{subject}/{year}"

    clean_name = f"{subject}_{year}_{exam_type}".replace(" ", "_")
    public_id = f"{public_id}/{clean_name}.pdf"   

    result = cloudinary.uploader.upload(
        file, # file.file,
        resource_type=resource_type,
        public_id=public_id,
        overwrite=True,    #Upload again → replaces old file❗
        invalidate=True,
    )

    return {
        "secure_url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "resource_type": resource_type
    }


async def generate_and_upload_paper_pdf(paper_id: str, admin, with_watermark: bool = True):
    if not ObjectId.is_valid(paper_id):
        raise HTTPException(status_code=400, detail="Invalid paper_id")

    paper = await db_instance.db.papers.find_one({"_id": ObjectId(paper_id)})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    questions = paper.get("questions") or []
    if len(questions) == 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate PDF: No questions found in this paper."
        )

    # Fetch associated subject strictly by subject_id (do not look up by subject_code)
    subject = None
    if paper.get("subject_id"):
        try:
            sub_oid = (
                paper["subject_id"]
                if isinstance(paper["subject_id"], ObjectId)
                else ObjectId(str(paper["subject_id"]))
            )
            subject = await db_instance.db.subjects.find_one({"_id": sub_oid})
        except Exception:
            subject = None

    if not subject:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate PDF: Associated subject (subject_id) not found for this paper."
        )

    sem = str(subject.get("semester_code") or "").strip()
    if not sem:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate PDF: Semester code is missing in the associated subject."
        )

    # 1. Generate university format PDF in memory (questions only, no solutions)
    import importlib
    import app.utils.paper_pdf_generator as _paper_pdf_gen
    importlib.reload(_paper_pdf_gen)
    raw_pdf_bytes = _paper_pdf_gen.generate_university_paper_pdf_bytes(
        paper, subject, with_watermark=with_watermark
    )

    # 2. Apply Alpha Result branding (footer + clickable link)
    processed_pdf = await process_pdf_branding(raw_pdf_bytes)

    # 3. Resolve branch, semester, subject_code, year, exam_type for Cloudinary hierarchy
    subject_code = str(
        paper.get("subject_code") or subject.get("code") or "SUBJECT"
    ).strip()

    branch = "COMMON"
    if subject.get("branch_code"):
        b_code = subject["branch_code"]
        if isinstance(b_code, list) and len(b_code) > 0:
            branch = str(b_code[0])
        elif isinstance(b_code, str) and b_code.strip():
            branch = b_code.strip()
    elif len(subject_code) >= 3 and subject_code[:3].isdigit():
        branch = subject_code[:3]

    year = str(paper.get("year") or "").strip()
    p_type = str(paper.get("type") or "END").strip()
    p_sub_type = str(paper.get("paper_type") or "regular").strip()
    exam_type = f"{p_type}_{p_sub_type}"

    # 4. Upload to Cloudinary
    result = await upload_pdf_to_cloudinary(
        processed_pdf,
        branch,
        sem,
        subject_code,
        year,
        exam_type,
        admin
    )

    secure_url = result.get("secure_url")
    public_id = result.get("public_id")
    if not secure_url:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Cloudinary PDF upload failed")
        )

    # 5. Store link back in MongoDB papers document
    await db_instance.db.papers.update_one(
        {"_id": ObjectId(paper_id)},
        {
            "$set": {
                "paper_pdf": secure_url,
                "paper_pdf_public_id": public_id,
                "updated_at": utcnow(),
            },
            "$addToSet": {
                "admin_userids": admin["admin_userid"]
            }
        }
    )

    return {
        "success": True,
        "message": "Question paper PDF generated and uploaded to Cloudinary successfully",
        "data": {
            "url": secure_url,
            "public_id": public_id,
        }
    }




#===============Branding===================#
logo_path = "app/assets/ar_only_logo_watermark.png"
ALPHA_URL = "https://play.google.com/store/apps/details?id=in.alpharesult.app"

# -------------------------
# 1. LOGO WATERMARK (CENTER)
# -------------------------
def add_logo_watermark(page, logo_path):
    rect = page.rect

    logo_size = 150  # adjust
    x0 = (rect.width - logo_size) / 2
    y0 = (rect.height - logo_size) / 2

    logo_rect = fitz.Rect(
        x0, y0,
        x0 + logo_size,
        y0 + logo_size
    )

    page.insert_image(
        logo_rect,
        filename=logo_path,
        overlay=True,
        keep_proportion=True
    )


# -------------------------
# 2. DIAGONAL TEXT
# -------------------------
def add_diagonal_text(page):
    rect = page.rect
    text = "ALPHA RESULT"

    # Create a BIG box larger than page
    box = fitz.Rect(
        -rect.width,             # start far left
        rect.height * 0.2,
        rect.width * 2,          # extend beyond right
        rect.height * 0.8
    )

    # Center point for rotation
    center = fitz.Point(rect.width / 2, rect.height / 2)

    # 45 degree rotation
    matrix = fitz.Matrix(1, 1).prerotate(45)

    page.insert_textbox(
        box,
        text,
        fontsize=140,                    # 🔥 BIG (key)
        color=(0.65, 0.65, 0.65),        # grey (visible but light)
        align=1,                         # center
        morph=(center, matrix),          # rotate around center
        overlay=True                     # must be true for scanned PDFs
    )


# def add_diagonal_text(page):
#     rect = page.rect
#     text = "ALPHA RESULT"

#     center = fitz.Point(rect.width / 2, rect.height / 2)
#     matrix = fitz.Matrix(1, 1).prerotate(45)

#     page.insert_text(
#         center,
#         text,
#         fontsize=100,
#         color=(0.95, 0.95, 0.95),  # 🔥 very light
#         morph=(center, matrix),
#         overlay=True  # ✅ MUST
#     )


# -------------------------
# 3. FOOTER
# -------------------------
def add_footer(page):
    rect = page.rect

    text = "Click here for PYQ & Solutions - alpharesult.in"

    text_width = fitz.get_text_length(text, fontsize=10)
    x = (rect.width - text_width) / 2
    y = rect.height - 20

    page.insert_text(
        (x, y),
        text,
        fontsize=14,
        color=(0.2, 0.4, 0.8),
    )


# -------------------------
# 4. FULL PAGE CLICKABLE LINK
# -------------------------
def add_clickable_link(page):
    page.insert_link({
        "kind": fitz.LINK_URI,
        "from": page.rect,  # FULL PAGE
        "uri": ALPHA_URL
    })


# -------------------------
# MAIN PROCESS FUNCTION
# -------------------------
async def process_pdf_branding(file_bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    for page in doc:
        # add_logo_watermark(page, logo_path)
        # print("watermark added")
        # add_diagonal_text(page)
        # print("Diagonal text added")
        add_footer(page)
        # print("footer added")
        add_clickable_link(page)
        # print("link clickable added")

    # Save to memory (NO TEMP FILE)
    output = BytesIO()
    doc.save(output)
    doc.close()

    output.seek(0)
    return output


# mere function to merge all papers of a subject

import requests
async def merge_subject_pdfs(subject_id: str, admin):
    # Lookup subject ONLY by subject_id (_id)
    if not ObjectId.is_valid(subject_id):
        return {
            "success": False,
            "message": "Invalid subject_id"
        }

    subject = await db_instance.db.subjects.find_one({"_id": ObjectId(subject_id)})
    if not subject:
        return {
            "success": False,
            "message": "Subject not found"
        }

    subject_code = subject.get("code") or ""
    subject_db_id = subject["_id"]

    # 1. Fetch papers by subject_id only (only valid PDFs)
    papers = await db_instance.db.papers.find(
        {
            "subject_id": {"$in": [subject_db_id, str(subject_db_id)]},
            "paper_pdf": {"$exists": True, "$ne": ""}
        }
    ).sort("year", -1).to_list(None)

    if not papers:
        return {
            "success": False,
            "message": "No valid PDFs found for this subject"
        }

    merged_doc = fitz.open()
    merged_info = []
    success_count = 0

    # 2. Download + merge
    for p in papers:
        pdf_url = p.get("paper_pdf")

        try:
            res = requests.get(pdf_url, timeout=10)
            res.raise_for_status()

            pdf_bytes = BytesIO(res.content)
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

            if doc.page_count == 0:
                doc.close()
                continue

            merged_doc.insert_pdf(doc)
            doc.close()

            success_count += 1

            merged_info.append({
                "year": p.get("year")
            })

        except Exception as e:
            print(f"[MERGE ERROR] {pdf_url}: {e}")
            continue

    if success_count == 0:
        return {
            "success": False,
            "message": "All PDFs failed to merge"
        }

    # 3. Save merged PDF to memory
    output = BytesIO()
    merged_doc.save(output)
    merged_doc.close()
    del merged_doc

    output.seek(0)

    # 4. Upload to Cloudinary
    branch = subject["branch_code"][0]
    sem = subject["semester_code"]

    public_id = f"BEU/pyq/{branch}/sem-{sem}/{subject_code}/all_years"
    clean_name = f"{subject_code}_all_years".replace(" ", "_")
    public_id = f"{public_id}/{clean_name}.pdf"   

    result = cloudinary.uploader.upload(
        output,
        resource_type="raw",
        public_id=public_id,
        overwrite=True,
        invalidate=True
    )

    merged_url = result["secure_url"]

    # 5. Save URL in subject
    await db_instance.db.subjects.update_one(
        {"_id": subject_db_id},
        {
            "$set": {
                "all_paper_pdf": merged_url,
                "merged_years": merged_info,
                "updated_at": utcnow(),
                "admin_userids": admin["admin_userid"]
            }
        }
    )

    return {
        "success": True,
        "message": f"Merged {success_count} papers successfully",
        "url": merged_url,
        "total_papers": success_count,
        "papers": merged_info
    }
    

#============================##########################=========================##
##=========================== For maange function of missing papers PDF uploaded by PUBLIC   =======================##
async def create_missing_paper(body, admin):
    
    # Required fields
    required_fields = ["semester_code", "req_semester_code", "branch_code", "name", "subject_code", "req_paper_code", "year", "exam_type", "paper_type"]
    for field in required_fields:
        if field not in body or not body[field]:
            raise HTTPException(status_code=400, detail=f"{field} is required")


    semester_code = body["semester_code"]
    req_semester_code = body["req_semester_code"]
    branch_code = body["branch_code"]
    name = body["name"]
    subject_code = body["subject_code"]
    req_paper_code = body["req_paper_code"]
    year = body["year"]
    exam_type = body["exam_type"]    # end-sem,mide-sem
    paper_type = body["paper_type"]  # regular, special, complemmentry

    existing = await db_instance.db.missing_papers.find_one({
        "subject_code": subject_code,
        "year": year,
        "exam_type": exam_type,
        "paper_type": paper_type
    })
    if existing:
        raise HTTPException(status_code=400, detail="This missing Paper already created")

    new_missing_paper = {
        "semester_code": semester_code,
        "req_semester_code": req_semester_code,
        "branch_code": branch_code,
        "name": name,
        "subject_code": subject_code,
        "req_paper_code": req_paper_code,
        "year": year,
        "exam_type": exam_type,
        "paper_type": paper_type,

        "status": "missing",

        "uploader_name": None,
        "description": None,

        "temp_pdf_url": None,
        "temp_public_id": None,
        "final_pdf_url": None,
        "final_public_id": None,

        "reviewed_by": None,
        "reviewed_at": None,

        "created_by": admin["admin_userid"],
        "created_at": utcnow()
    }

    result = db_instance.db.missing_papers.insert_one(new_missing_paper)
  
    return {"success": True,
          "message": "Missing paper created",
        #   "paper_id": str(result['inserted_id'])
    }




# To get all missing paper
async def get_missing_papers_admin(query_params: dict, admin):
    try:
        filters = {}

        # 🔍 Filters
        if query_params.get("semester_code"):
            filters["semester_code"] = query_params["semester_code"]

        if query_params.get("branch_code"):
            filters["branch_code"] = query_params["branch_code"]

        if query_params.get("status"):
            filters["status"] = query_params["status"]

        if query_params.get("year"):
            filters["year"] = query_params["year"]

        if query_params.get("paper_type"):
            filters["paper_type"] = query_params["paper_type"]

        if query_params.get("exam_type"):
            filters["exam_type"] = query_params["exam_type"]

        # 🔍 Optional search (subject_code)
        if query_params.get("search"):
            filters["subject_code"] = {
                "$regex": query_params["search"],
                "$options": "i"
            }

        # 📄 Pagination
        page = int(query_params.get("page", 1))
        limit = int(query_params.get("limit", 20))
        skip = (page - 1) * limit

        # 📊 DB Query
        papers = await db_instance.db.missing_papers.find(filters) \
            .sort("created_at", -1) \
            .skip(skip) \
            .limit(limit).to_list(None)
 
        # papers = .to_list(cursor)
        
        # Total count
        total = await db_instance.db.missing_papers.count_documents(filters)

        # Convert ObjectId
        papers = mongo_to_json(papers)

        return {
            "success": True,
            "message": "getted all missing papers successfully",
            "data": papers,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        print("Excetion error")
        raise HTTPException(status_code=500, detail=str(e))
    
    

# To approve and update db for right upoaded pdf questions papers
async def accept_public_upload_and_add_paper(paper_id, admin):

    # checking paper_id to save pdf url uploaded in cloudnari to db
    try:
        obj_id = ObjectId(paper_id)
    except:
        return {"success": False, "error": "Invalid paper_id"}

    # ✅ Get missing paper
    missing_paper = await db_instance.db.missing_papers.find_one({"_id": ObjectId(paper_id)})
    if not missing_paper:
        return {"success": False, "error": "Paper not found"}

    if not missing_paper.get("temp_pdf_url"):
        raise HTTPException(status_code=400, detail="No uploaded PDF found")

    if missing_paper.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    temp_pdf_url = missing_paper["temp_pdf_url"]
    temp_public_id = missing_paper["temp_public_id"]
    # FETCH PDF FROM TEMP URL
    try:
        response = requests.get(temp_pdf_url, timeout=15)
        if response.status_code != 200:
            raise Exception("Failed to fetch PDF")

        file_bytes = response.content

    except Exception as e:
        raise HTTPException(500, f"Error fetching PDF: {str(e)}")

    # Branding
    processed_pdf = await process_pdf_branding(file_bytes)

    #Uploading to cloudanary
    exam_type_paper_type = f"{missing_paper['exam_type']}_{missing_paper['paper_type']}"

    result = await upload_pdf_to_cloudinary(
        processed_pdf,
        missing_paper["branch_code"],
        missing_paper["semester_code"],
        missing_paper["subject_code"],
        missing_paper["year"],
        exam_type_paper_type,
        admin
    )
    
    final_url = result.get("secure_url")
    final_public_id = result.get("public_id")

    if not final_url or not final_public_id:
        raise HTTPException(500, "Final upload failed")

    # Delete temp. without branding pdf uploaded by public
    if temp_public_id:
        try:
            await delete_file(temp_public_id)  # your utility
        except Exception as e:
            logger.warning(f"Temp delete failed: {str(e)}")

    # find original actual paper (by subject_id or subject_code, year, exam_type, paper_type)
    subject = await db_instance.db.subjects.find_one({"code": missing_paper["subject_code"]})
    paper_query = {
        "year": missing_paper["year"],
        "type": missing_paper["exam_type"],
        "paper_type": missing_paper["paper_type"]
    }
    if subject:
        paper_query["$or"] = [
            {"subject_id": subject["_id"]},
            {"subject_code": missing_paper["subject_code"]}
        ]
    else:
        paper_query["subject_code"] = missing_paper["subject_code"]

    actual_paper = await db_instance.db.papers.find_one(paper_query)

    if not actual_paper:
        new_paper = {
            "subject_code": missing_paper["subject_code"],
            "name": missing_paper["name"],
            "type": missing_paper["exam_type"],
            "paper_type": missing_paper["paper_type"],
            "year": missing_paper["year"],
            "description": "directly created on public upload pdf",
            "paper_pdf": final_url,
            "paper_pdf_public_id": final_public_id,
            "questions": [],
            "admin_userids": [admin["admin_userid"]],
            "created_at": utcnow(),
            "updated_at": utcnow(),
        }
        if subject:
            new_paper["subject_id"] = subject["_id"]

        insert_res = await db_instance.db.papers.insert_one(new_paper)
        paper_db_id = insert_res.inserted_id

    else:
        paper_db_id = actual_paper["_id"]
        paper_update = {
            "paper_pdf": final_url,
            "paper_pdf_public_id": final_public_id,
            "updated_at": utcnow(),
        }
        if "subject_id" not in actual_paper:
            subject = await db_instance.db.subjects.find_one({"code": missing_paper["subject_code"]})
            if subject:
                paper_update["subject_id"] = subject["_id"]

        await db_instance.db.papers.update_one(
            {"_id": paper_db_id},
            {
                "$set": paper_update,
                "$addToSet": {
                    "admin_userids": admin["admin_userid"]
                }
            }
        )

        # UPDATE MISSING PAPER
    await db_instance.db.missing_papers.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": "approved",
                "description": "accepted Questions Paper",
                "final_pdf_url": final_url,
                "final_public_id": final_public_id,
                "reviewed_by": admin["admin_userid"],
                "reviewed_at": utcnow(),
            },
             "$unset": {
                "temp_pdf_url": "",
                "temp_public_id": ""
            }
        }
    )

    return {
        "success": True,
        "message": "Paper approved successfully",
        "final_pdf_url": final_url
    }





#  To reject a wrong uploaeded pdf by public
async def reject_public_uploaded_missing_paper(paper_id: str, body: dict, admin):

    # ✅ Validate ObjectId
    try:
        obj_id = ObjectId(paper_id)
    except:
        return {"success": False, "error": "Invalid paper_id"}

    # ✅ Get missing paper
    missing_paper = await db_instance.db.missing_papers.find_one({"_id": obj_id})

    if not missing_paper:
        return {"success": False, "error": "Paper not found"}

    # ✅ Status validation
    if missing_paper.get("status") == "approved":
        raise HTTPException(400, "Cannot reject approved paper")

    if missing_paper.get("status") == "rejected":
        raise HTTPException(400, "Already rejected")

    # ✅ Get rejection reason
    # reason = body.get("description", "").strip()

    # if not reason:
    #     raise HTTPException(400, "Rejection reason is required")

    # UPDATE DB
    await db_instance.db.missing_papers.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": "rejected",
                # "description": "Wrong Questions paper or bad quality or Blurry PDF / Wrong subject / Duplicate upload",   # ✅ store reason
                "description": body.get("description"),
                "reviewed_by": admin["admin_userid"],
                "reviewed_at": utcnow(),
            }
        }
    )

    return {
        "success": True,
        "message": "Paper rejected successfully"
    }



#  To delete a missing paper
async def delete_missing_paper(paper_id: str, admin):

    # ✅ Validate ObjectId
    try:
        obj_id = ObjectId(paper_id)
    except:
        return {"success": False, "error": "Invalid paper_id"}

    # ✅ Fetch paper
    missing_paper = await db_instance.db.missing_papers.find_one({"_id": obj_id})

    if not missing_paper:
        return {"success": False, "error": "Paper not found"}

    status = missing_paper.get("status")

    # 🚨 Restriction rules
    if status in ["approved", "under_review"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete paper with status '{status}'"
        )

    # Only allow: missing, rejected
    if status not in ["missing", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state '{status}' for deletion"
        )

    temp_public_id = missing_paper.get("temp_public_id")
    final_public_id = missing_paper.get("final_paper_id")
    # 🔥 DELETE TEMP FILE (if exists)
    if temp_public_id:
        try:
            await delete_file(temp_public_id)
        except Exception as e:
            logger.warning(f"Temp delete failed: {str(e)}")
            
        # 🔥 DELETE final FILE (if exists)
    if final_public_id:
        try:
            await delete_file(final_public_id)
        except Exception as e:
            logger.warning(f"Tfinal delete failed: {str(e)}")

    # 🔥 DELETE DOCUMENT
    await db_instance.db.missing_papers.delete_one({"_id": obj_id})

    return {
        "success": True,
        "message": "Missing paper deleted successfully"
    }


# =========================================================
# QUESTION BUG / ERROR REPORTS (ADMIN)
# =========================================================
async def get_question_reports_admin(query_params: dict):
    """
    List and filter all question reports submitted by students
    """
    status = query_params.get("status")
    branch = query_params.get("branch")
    semester = query_params.get("semester")
    search = query_params.get("search")
    page = int(query_params.get("page", 1))
    limit = int(query_params.get("limit", 50))
    skip = (page - 1) * limit

    filter_query = {}
    if status and status != "all":
        filter_query["status"] = status
    if branch and branch != "all":
        filter_query["branch"] = branch
    if semester and semester != "all":
        filter_query["semester"] = str(semester)
    if search:
        filter_query["$or"] = [
            {"subject_name": {"$regex": search, "$options": "i"}},
            {"subject_code": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"issue_type": {"$regex": search, "$options": "i"}},
            {"paper_year": {"$regex": search, "$options": "i"}},
        ]

    total_count = await db_instance.db.question_reports.count_documents(filter_query)
    pending_count = await db_instance.db.question_reports.count_documents({"status": "pending"})
    in_review_count = await db_instance.db.question_reports.count_documents({"status": "in_review"})
    resolved_count = await db_instance.db.question_reports.count_documents({"status": "resolved"})

    cursor = db_instance.db.question_reports.find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(length=limit)

    return {
        "success": True,
        "total": total_count,
        "pending_count": pending_count,
        "in_review_count": in_review_count,
        "resolved_count": resolved_count,
        "page": page,
        "limit": limit,
        "data": [mongo_to_json(r) for r in reports]
    }

async def update_question_report_admin(report_id: str, body: dict, admin: dict):
    """
    Update status and notes of a question report
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")

    updates = {
        "updated_at": utcnow()
    }
    if "status" in body:
        updates["status"] = body["status"]
        if body["status"] in ["resolved", "rejected"]:
            updates["resolved_at"] = utcnow()
            admin_email = admin.get("email") if isinstance(admin, dict) else getattr(admin, "email", "Admin")
            updates["resolved_by"] = admin_email or "Admin"
    if "admin_notes" in body:
        updates["admin_notes"] = body["admin_notes"]

    result = await db_instance.db.question_reports.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")

    updated_doc = await db_instance.db.question_reports.find_one({"_id": ObjectId(report_id)})
    return {
        "success": True,
        "message": "Report updated successfully",
        "data": mongo_to_json(updated_doc)
    }

async def delete_question_report_admin(report_id: str):
    """
    Delete a question report
    """
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID")

    result = await db_instance.db.question_reports.delete_one({"_id": ObjectId(report_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "success": True,
        "message": "Report deleted successfully"
    }
