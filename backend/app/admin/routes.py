from fastapi import APIRouter, Depends, UploadFile, File, Query
from app.auth.dependencies import admin_required
from app.auth.utils import get_current_admin
from app.admin.controllers import *
from fastapi import Form



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






#============PDf Microservice======================
@router.post("/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    admin=Depends(get_current_admin),
    ):
    # admin=Depends(get_current_admin),
    return await call_pdf_service(file, admin)




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


# To merge all papers of a subject
@router.post("/merge-subject-pdfs")
async def merge_subject(body: dict, admin=Depends(get_current_admin)):
    subject_identifier = body.get("subject_id") or body.get("subject_code")
    if not subject_identifier:
        raise HTTPException(status_code=400, detail="subject_id or subject_code is required")
    result = await merge_subject_pdfs(subject_identifier, admin)

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

