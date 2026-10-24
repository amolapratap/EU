from fastapi import APIRouter, Depends, Form, UploadFile, File, Query
from typing import Optional
from bson import ObjectId
from app.public2.controllers import *
from app.auth.utils import get_current_user_optional
# from app.user.controllers import list_subjects          #it list all subjects which haven't credit also

router = APIRouter()

#  api for subscribing for newsletter
@router.post("/newsletter/subscribe")
async def subscribe_newsletter(body: dict):
    return await add_susbscribe_newsletter(body)


#  api for contact, query, feedback
@router.post("/contact-us")
async def contact_us(body: dict):
    return await send_message_contact_us(body)

@router.get("/semester")
async def get_semesters():
    return await list_semesters()


@router.get("/branch")
async def get_brach():
    return await list_branches()

@router.get("/subjects")
async def get_subjects(semester_code: int, branch_code: str):
    return await list_subjects(str(semester_code), branch_code)

@router.get("/subject/{code}")
async def get_subject(code: str):
    subject = await db_instance.db.subjects.find_one({"code": code})

    if not subject:
        return {"success": False, "message": "Not found"}

    return {
        "success": True,
        "data": mongo_to_json(subject)
    }

@router.post("/sgpa/calculate")
async def calculate_sgpa(body : dict, current_user: Optional[dict] = Depends(get_current_user_optional)):
    return await sgpa(body, current_user)


# To get quest. papers pdf link all papers of one subject primarily by subject_id
@router.get("/papers/{subject_id}")
async def get_papers_by_subject(subject_id: str):
    """
    Returns all paper PDF links for a subject primarily by subject_id (with fallback for legacy code)
    """
    query = {}
    if ObjectId.is_valid(subject_id):
        # Direct primary lookup by subject_id
        query = {"subject_id": ObjectId(subject_id)}
    else:
        subject = await db_instance.db.subjects.find_one({"code": subject_id})
        if subject:
            query = {"subject_id": subject["_id"]}
        else:
            query = {"subject_code": subject_id}

    papers = await db_instance.db.papers.find(query).sort("year", -1).to_list(length=200)

    result = []

    for p in papers:
        if p.get("paper_pdf"):
            result.append({
                "id": str(p["_id"]),
                "year": p.get("year"),
                "name": p.get("name"),
                "pdf": p.get("paper_pdf"),
            })

    return {
        "success": True,
        "count": len(result),
        "data": result
    }

##===================Routes For manage missing papers(public section)================##
    
# To get all missing paper list
@router.get("/missing_papers")
async def get_public_missing_papers(
    req_semester_code: str = Query(None),
    branch_code: str = Query(None),
    year: str = Query(None),
    search: str = Query(None),

    page: int = Query(1),
    limit: int = Query(200),
):
    query_params = {
        "req_semester_code": req_semester_code,
        "branch_code": branch_code,
        "year": year,
        "search": search,
        "page": page,
        "limit": limit,

        # 🔥 IMPORTANT: restrict statuses
        "status": ["missing", "rejected", "approved", "under_review"]
    }

    return await get_missing_papers_public(query_params)

# To upload pdf question paper by public
@router.post("/missing_papers/upload/{paper_id}")
async def upload_public_pdf(
    paper_id: str,
    file: UploadFile = File(...),
    uploader_name: str = Form(None)
):
    return await upload_public_missing_paper(paper_id, file, uploader_name)


# To report bug / error / feedback on questions, solutions, papers, or app
@router.post("/reports")
@router.post("/question-reports")
async def report_issue(body: dict):
    return await submit_report(body)
