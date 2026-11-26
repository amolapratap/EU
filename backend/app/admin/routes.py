from fastapi import APIRouter, Depends, UploadFile, File, Query, Body
from app.auth.dependencies import admin_required
from app.auth.utils import get_current_admin
from app.admin.controllers import *
from fastapi import Form
from typing import Optional
import os
import re
from app.utils.pdf_rebrand import rebrand_pdf_bytes, RebrandOptions, DEFAULT_APP_URL
from app.admin.ai_controllers import (
    ai_extract_paper_questions,
    ai_save_extracted_questions,
    ai_solve_question_ctrl
)



# router = APIRouter(prefix="/ssb", tags=["Admin SSB"])
router = APIRouter()   

# ---------- SEMESTER ----------
@router.post("/ssb/semester")
async def add_semester(body: dict, admin = Depends(get_current_admin)):
    return await create_semester(body, admin)

@router.get("/ssb/semester", dependencies=[Depends(admin_required)])
async def get_semesters():
    return await list_semesters()

@router.put("/ssb/semester/{code}")
async def edit_semester(code: str, body: dict, admin = Depends(get_current_admin)):
    return await update_semester(code, body, admin)

@router.delete("/ssb/semester/{code}", dependencies=[Depends(admin_required)])
async def remove_semester(code: str):
    return await delete_semester(code)

@router.get("/ssb/semester/count", dependencies=[Depends(admin_required)])
async def countsemester():
    return await count_semester()


# ---------- BRANCH ----------
@router.post("/ssb/branch")
async def add_branch(body: dict, admin = Depends(get_current_admin)):
    return await create_branch(body, admin)

@router.get("/ssb/branch", dependencies=[Depends(admin_required)])
async def get_branches():
    return await list_branches()

@router.put("/ssb/branch/{code}")
async def edit_branch(code: str, body: dict, admin = Depends(get_current_admin)):
    return await update_branch(code, body, admin)

@router.delete("/ssb/branch/{code}", dependencies=[Depends(admin_required)])
async def remove_branch(code: str):
    return await delete_branch(code)

@router.get("/ssb/branch/count", dependencies=[Depends(admin_required)])
async def countbranch():
    return await count_branch()


# ---------- SUBJECT ----------
@router.post("/ssb/subject")
async def add_subject(body: dict, admin = Depends(get_current_admin)):
    return await create_subject(body, admin)

@router.get("/ssb/subject", dependencies=[Depends(admin_required)])
async def get_subjects(
    semester: str | None = None,
    branch: str | None = None
):
    return await list_subjects(semester, branch)

@router.put("/ssb/subject/{identifier}")
async def edit_subject(identifier: str, body: dict, admin = Depends(get_current_admin)):
    return await update_subject(identifier, body, admin)

@router.delete("/ssb/subject/{identifier}", dependencies=[Depends(admin_required)])
async def remove_subject(identifier: str):
    return await delete_subject(identifier)

@router.get("/ssb/subject/count", dependencies=[Depends(admin_required)])
async def countsubject():
    return await count_subject()

    #------------SYLLABUS-----------------------
@router.put("/ssb/subject/{identifier}/syllabus")
async def syllabus(identifier: str, body: dict):
    return await update_syllabus(identifier, body)


    #------------ELECTIVES-----------------------
from app.electives.controllers import (
    admin_list_electives,
    admin_get_elective,
    admin_create_elective,
    admin_update_elective,
    admin_delete_elective
)

@router.get("/ssb/electives", dependencies=[Depends(admin_required)])
async def get_electives(semester: str | None = None, branch: str | None = None):
    return await admin_list_electives(semester, branch)

@router.get("/ssb/electives/{elective_id}", dependencies=[Depends(admin_required)])
async def get_elective(elective_id: str):
    return await admin_get_elective(elective_id)

@router.post("/ssb/electives")
async def add_elective(body: dict, admin = Depends(get_current_admin)):
    return await admin_create_elective(body, admin)

@router.put("/ssb/electives/{elective_id}")
async def edit_elective(elective_id: str, body: dict, admin = Depends(get_current_admin)):
    return await admin_update_elective(elective_id, body, admin)

@router.delete("/ssb/electives/{elective_id}", dependencies=[Depends(admin_required)])
async def remove_elective(elective_id: str):
    return await admin_delete_elective(elective_id)



#----------------PAPERS-------------------------------

# router = APIRouter()

# ---------- PAPERS ----------

@router.post("/papers")
async def add_paper(body: dict, admin = Depends(get_current_admin)):
    return await create_paper(body, admin)


#  To get all papers of one subject by subject_id
@router.get("/papers/{subject_id}", dependencies=[Depends(admin_required)])
async def get_papers(subject_id: str):
    return await list_papers(subject_id)


#   To get one paper with all quetions of a subject
@router.get("/paper/{paper_id}", dependencies=[Depends(admin_required)])
async def get_paper_by_id(paper_id: str):

    return await get_paper_with_questions(paper_id)



@router.put("/papers/{paper_id}")
async def edit_paper(paper_id: str, body: dict, admin = Depends(get_current_admin)):
    return await update_paper(paper_id, body, admin)


@router.delete("/papers/{paper_id}", dependencies=[Depends(admin_required)])
async def remove_paper(paper_id: str):
    return await delete_paper(paper_id)

@router.get("/ssb/papers/count", dependencies=[Depends(admin_required)])
async def countpapers():
    return await count_papers()



# ---------------- QUESTIONS ----------------
@router.post("/papers/{paper_id}/questions")
async def add_question(paper_id: str, body: dict, admin = Depends(get_current_admin)):      # here get_current_admin verifies auth token and return user payload(token)
    return await add_question_ctrl(paper_id, body, admin)

@router.put("/papers/{paper_id}/questions/{q_no}")
async def update_question(paper_id: str, q_no: int, body: dict, admin = Depends(get_current_admin)):
    return await update_question_ctrl(paper_id, q_no, body, admin)


# To Upload a img of a single quetion
@router.post("/upload-solution-image")
async def upload_solution_image_route(
    file: UploadFile = File(...),
    public_id: str = Form(...),
    admin=Depends(get_current_admin)
):

    return await upload_solution_image_ctrl(
        file,
        public_id,
        admin
    )

@router.delete("/papers/{paper_id}/questions/{q_no}")
async def delete_question(paper_id: str, q_no: int, admin = Depends(get_current_admin)):
    return await delete_question_ctrl(paper_id, q_no, admin)

# ---------------- SUB QUESTIONS ----------------
@router.post("/papers/{paper_id}/questions/{q_no}/sub")
async def add_sub_question(paper_id: str, q_no: int, body: dict, admin = Depends(get_current_admin)):
    return await add_sub_question_ctrl(paper_id, q_no, body, admin)

@router.delete("/papers/{paper_id}/questions/{q_no}/sub/{sq_no}")
async def delete_sub_question(paper_id: str, q_no: int, sq_no: str, admin = Depends(get_current_admin)):
    return await delete_sub_question_ctrl(paper_id, q_no, sq_no, admin)

# =====================================================
# AI QUESTION EXTRACTION & AUTO-SOLVER
# =====================================================
@router.post("/papers/{paper_id}/ai-extract")
async def ai_extract_route(
    paper_id: str,
    file: Optional[UploadFile] = File(None),
    pdf_url: Optional[str] = Form(None),
    page_numbers: Optional[str] = Form(None),
    admin = Depends(get_current_admin)
):
    pages = [int(p.strip()) for p in page_numbers.split(",") if p.strip().isdigit()] if page_numbers else None
    return await ai_extract_paper_questions(paper_id, file, pdf_url, pages, admin)

@router.post("/papers/{paper_id}/ai-save-questions")
async def ai_save_questions_route(
    paper_id: str,
    body: dict = Body(...),
    admin = Depends(get_current_admin)
):
    return await ai_save_extracted_questions(paper_id, body, admin)

@router.post("/papers/{paper_id}/ai-solve-question")
async def ai_solve_question_route(
    paper_id: str,
    body: dict = Body(...),
    admin = Depends(get_current_admin)
):
    return await ai_solve_question_ctrl(paper_id, body, admin)






#============PDf Microservice======================
@router.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
    ):
    # admin=Depends(get_current_admin),
    return await call_pdf_service(file, admin)


@router.post("/pdf/rebrand")
async def rebrand_pdf_route(
    file: UploadFile = File(...),
    remove_links: bool = Form(True),
    remove_annotations: bool = Form(True),
    remove_watermark_images: bool = Form(True),
    remove_all_images: bool = Form(False),
    remove_text_watermarks: bool = Form(True),
    custom_remove_texts: str = Form(""),
    add_watermark: bool = Form(True),
    watermark_opacity: float = Form(0.22),
    add_header: bool = Form(True),
    add_footer_banner: bool = Form(True),
    app_url: str = Form(DEFAULT_APP_URL),
    admin=Depends(get_current_admin),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty")

    custom_terms = tuple(
        t.strip() for t in re.split(r"[,\n]+", custom_remove_texts) if t.strip()
    )
    options = RebrandOptions(
        remove_links=remove_links,
        remove_annotations=remove_annotations,
        remove_watermark_images=remove_watermark_images,
        remove_all_images=remove_all_images,
        remove_text_watermarks=remove_text_watermarks,
        custom_remove_texts=custom_terms,
        add_watermark=add_watermark,
        watermark_opacity=watermark_opacity,
        add_header=add_header,
        add_footer_banner=add_footer_banner,
        app_url=app_url,
    )

    try:
        out_bytes, stats = rebrand_pdf_bytes(raw_bytes, options)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to process PDF: {exc}")

    base_name = os.path.splitext(os.path.basename(file.filename))[0]
    safe_base = re.sub(r"[^A-Za-z0-9._-]+", "_", base_name).strip("_") or "document"
    out_filename = f"{safe_base}_AlphaResult.pdf"

    return Response(
        content=out_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{out_filename}"',
            "Access-Control-Expose-Headers": (
                "Content-Disposition, X-Page-Count, X-Removed-Links, "
                "X-Removed-Annotations, X-Removed-Images, X-Removed-Text-Matches"
            ),
            "X-Page-Count": str(stats.page_count),
            "X-Removed-Links": str(stats.removed_links),
            "X-Removed-Annotations": str(stats.removed_annotations),
            "X-Removed-Images": str(stats.removed_images),
            "X-Removed-Text-Matches": str(stats.removed_text_matches),
        },
    )




#===============ALL Upload rouetes===================
# from controllers.upload_controller import upload_pdf_to_cloudinary

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    paper_id: str = Form(...),
    branch: str = Form(...),
    sem: str = Form(...),
    subject: str = Form(...),
    year: str = Form(...),
    exam_type: str = Form(None),  # optional
    admin=Depends(get_current_admin),
):


    # checking paper_id to save pdf url uploaded in cloudnari to db
    try:
        obj_id = ObjectId(paper_id)
    except:
        return {"success": False, "error": "Invalid paper_id"}

    paper = await db_instance.db.papers.find_one({"_id": ObjectId(paper_id)})
    if not paper:
        return {"success": False, "error": "Paper not found"}

    # Use paper's historical subject_code for cloudinary folder hierarchy
    subject_code = paper.get("subject_code") or subject

    #Branding
    file_bytes = await file.read()
    processed_pdf = await process_pdf_branding(file_bytes)


    #Uploading to cloudanary
    result = await upload_pdf_to_cloudinary(
        processed_pdf,
        branch,
        sem,
        subject_code,
        year,
        exam_type,
        admin
    )

    if not result.get("secure_url"):
        return {
            "success": False,
            "error": result.get("error", "Upload failed")
        }


    # To save pdf url uploaded in cloudnari to db
    await db_instance.db.papers.update_one(
        {"_id": ObjectId(paper_id)},
        {
            "$set": {
                "paper_pdf": result["secure_url"],
                "updated_at": utcnow(),
            },
            "$addToSet": {
                "admin_userids": admin["admin_userid"]
            }
        }
    )

    return {
    "success": True,
    "message": "PDF uploaded successfully",
    "data": {
        "url": result["secure_url"],
        "public_id": result["public_id"]
        }
    }


# Auto-generate university format PDF from DB questions and upload to Cloudinary
@router.post("/papers/{paper_id}/generate-pdf")
async def generate_paper_pdf_route(
    paper_id: str,
    with_watermark: bool = True,
    body: dict | None = Body(default=None),
    admin=Depends(get_current_admin)
):
    if body and "with_watermark" in body:
        with_watermark = bool(body["with_watermark"])
    return await generate_and_upload_paper_pdf(paper_id, admin, with_watermark=with_watermark)


# To merge all papers of a subject
@router.post("/merge-subject-pdfs")
async def merge_subject(body: dict, admin=Depends(get_current_admin)):
    subject_id = body.get("subject_id")
    if not subject_id:
        raise HTTPException(status_code=400, detail="subject_id is required")
    result = await merge_subject_pdfs(subject_id, admin)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return result







##=========================== For manage missing papers PDF uploaded by PUBLIC, handle admin   =======================##
# To add a new paper in missing papers list
@router.post("/add_in_missing_papers_list")
async def add_missing_papers(body: dict, admin=Depends(get_current_admin)):

    result = await create_missing_paper(body, admin)

    return  result


# To get all missing paper list
@router.get("/missing_papers")
async def get_missing_papers(
    semester_code: str = Query(None),
    branch_code: str = Query(None),
    status: str = Query(None),
    year: str = Query(None),
    exam_type: str = Query(None),
    paper_type: str = Query(None),
    search: str = Query(None),

    page: int = Query(1),
    limit: int = Query(200),

    admin=Depends(get_current_admin)
):
    query_params = {
        "semester_code": semester_code,
        "branch_code": branch_code,
        "status": status,
        "year": year,
        "exam_type": exam_type,
        "paper_type": paper_type,
        "search": search,
        "page": page,
        "limit": limit
    }

    return await get_missing_papers_admin(query_params, admin)



#  To approve and upload pdf to cloudnari, delete temp upload and then update papers, missing_papers 
@router.post("/approve/{paper_id}")
async def approve_paper(
    paper_id: str,
    admin=Depends(get_current_admin)
):

   result = await accept_public_upload_and_add_paper(paper_id, admin)

   return result


#  To reject public uploaded pdf
@router.post("/reject/{paper_id}")
async def reject_paper(
    paper_id: str,
    body: dict,
    admin=Depends(get_current_admin)
):
    return await reject_public_uploaded_missing_paper(paper_id, body, admin)

# To delete a missing paper from list of missing paper if missing or rejected
@router.delete("/delete/{paper_id}")
async def delete_missing_paper_route(
    paper_id: str,
    admin=Depends(get_current_admin)
):
    return await delete_missing_paper(paper_id, admin)



# ---------- ISSUE & FEEDBACK REPORTS ----------
@router.get("/reports", dependencies=[Depends(admin_required)])
@router.get("/question-reports", dependencies=[Depends(admin_required)])
async def list_reports(
    status: str = Query(None),
    branch: str = Query(None),
    semester: str = Query(None),
    search: str = Query(None),
    page: int = Query(1),
    limit: int = Query(500),
):
    return await get_reports_admin({
        "status": status,
        "branch": branch,
        "semester": semester,
        "search": search,
        "page": page,
        "limit": limit,
    })

@router.put("/reports/{report_id}")
@router.put("/question-reports/{report_id}")
async def edit_report(
    report_id: str,
    body: dict,
    admin=Depends(get_current_admin)
):
    return await update_report_admin(report_id, body, admin)

@router.delete("/reports/{report_id}", dependencies=[Depends(admin_required)])
@router.delete("/question-reports/{report_id}", dependencies=[Depends(admin_required)])
async def remove_report(report_id: str):
    return await delete_report_admin(report_id)


# ---------- APP VERSION MANAGEMENT ----------
@router.post("/app-version")
async def set_app_version(body: dict, admin=Depends(get_current_admin)):
    return await update_app_version_config(body, admin)

