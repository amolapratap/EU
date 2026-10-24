import asyncio
import httpx
from bson import ObjectId
from typing import Optional
from fastapi import UploadFile, HTTPException

from app.database import db_instance
from app.utils.logger import logger
from app.utils.datetime import utcnow
from app.admin.ai.extractor_service import extract_questions_from_pdf
from app.admin.ai.solver_service import solve_objective_question, solve_subjective_question, sanitize_latex_delimiters
from app.admin.ai.cloudinary_service import commit_blocks_images


async def ai_extract_paper_questions(
    paper_id: str,
    file: Optional[UploadFile],
    pdf_url: Optional[str],
    page_numbers: Optional[list],
    admin: dict
):
    try:
        obj_id = ObjectId(paper_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid paper_id")

    paper = await db_instance.db.papers.find_one({"_id": obj_id})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    pdf_bytes = None

    # 1. Direct file upload
    if file:
        pdf_bytes = await file.read()
    # 2. Passed PDF URL
    elif pdf_url and pdf_url.strip():
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(pdf_url.strip())
            if res.status_code == 200:
                pdf_bytes = res.content
            else:
                raise HTTPException(status_code=400, detail=f"Failed to fetch PDF from URL: HTTP {res.status_code}")
    # 3. Existing paper PDF in database
    elif paper.get("paper_pdf"):
        existing_url = paper["paper_pdf"]
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(existing_url)
            if res.status_code == 200:
                pdf_bytes = res.content
            else:
                raise HTTPException(status_code=400, detail=f"Failed to fetch existing paper PDF: HTTP {res.status_code}")
    else:
        raise HTTPException(
            status_code=400,
            detail="No PDF found. Please upload a PDF file or provide a valid PDF URL."
        )

    subject_code = paper.get("subject_code") or "general"
    year = paper.get("year") or "common"
    paper_name = paper.get("name")
    exam_type = paper.get("type") or paper.get("exam_type")
    paper_type = paper.get("paper_type")

    try:
        questions = await extract_questions_from_pdf(
            pdf_bytes=pdf_bytes,
            subject_code=subject_code,
            year=year,
            page_numbers=page_numbers,
            name=paper_name,
            exam_type=exam_type,
            paper_type=paper_type
        )
        return {
            "success": True,
            "paper_id": paper_id,
            "total_extracted": len(questions),
            "questions": questions
        }
    except Exception as e:
        logger.error(f"AI extraction error: {e}")
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")


async def ai_save_extracted_questions(paper_id: str, body: dict, admin: dict):
    try:
        obj_id = ObjectId(paper_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid paper_id")

    paper = await db_instance.db.papers.find_one({"_id": obj_id})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    questions = body.get("questions", [])
    if not isinstance(questions, list):
        raise HTTPException(status_code=400, detail="'questions' must be a list")

    admin_id = admin.get("admin_userid")

    # Stamp admin_userids onto each question & standardize q_no to integer if digits
    for q in questions:
        if str(q.get("q_no", "")).isdigit():
            q["q_no"] = int(q["q_no"])
        q["admin_userids"] = [admin_id] if admin_id else []
        for sq in q.get("sub_questions", []):
            sq["admin_userids"] = [admin_id] if admin_id else []

    update_ops = {
        "$set": {
            "questions": questions,
            "updated_at": utcnow()
        }
    }
    if admin_id:
        update_ops["$addToSet"] = {"admin_userids": admin_id}

    await db_instance.db.papers.update_one({"_id": obj_id}, update_ops)

    return {
        "success": True,
        "message": f"Successfully approved and saved {len(questions)} questions to the paper."
    }


async def ai_solve_question_ctrl(paper_id: str, body: dict, admin: dict):
    try:
        obj_id = ObjectId(paper_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid paper_id")

    paper = await db_instance.db.papers.find_one({"_id": obj_id})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    nature = body.get("nature", "subjective")
    structure = body.get("structure", "single")
    question_text = body.get("question_md", "")
    q_no = body.get("q_no", "1")
    sq_no = body.get("sq_no")
    marks = body.get("marks", 14)
    subject_code = paper.get("subject_code") or "general"
    year = paper.get("year") or "common"
    paper_name = paper.get("name")
    exam_type = paper.get("type") or paper.get("exam_type")
    paper_type = paper.get("paper_type")
    save_to_db = body.get("save_to_db", False)
    admin_prompt = body.get("admin_prompt")
    visual_type = body.get("visual_type") or "svg"
    direct_save = body.get("direct_save", False)

    # DIRECT OVERRIDE COMMIT (From comparison modal preview approval)
    if direct_save:
        q_num = int(q_no) if str(q_no).isdigit() else q_no
        update_fields = {"updated_at": utcnow()}
        if structure == "multi" and body.get("sub_questions"):
            processed_subs = []
            for sq in body.get("sub_questions", []):
                sq_item = dict(sq)
                if sq_item.get("solution_md"):
                    sq_item["solution_md"] = sanitize_latex_delimiters(sq_item["solution_md"])
                if sq_item.get("solution_blocks"):
                    for blk in sq_item["solution_blocks"]:
                        if blk.get("type") == "text" and blk.get("content"):
                            blk["content"] = sanitize_latex_delimiters(blk["content"])
                    sq_item["solution_blocks"] = await commit_blocks_images(
                        sq_item["solution_blocks"],
                        subject_code=subject_code,
                        year=year,
                        q_no=q_no,
                        sq_no=sq_item.get("sq_no"),
                        name=paper_name,
                        exam_type=exam_type,
                        paper_type=paper_type
                    )
                processed_subs.append(sq_item)
            update_fields["questions.$.sub_questions"] = processed_subs
        elif nature == "objective":
            if "correct_index" in body:
                update_fields["questions.$.correct_index"] = body.get("correct_index")
            if "solution_md" in body:
                update_fields["questions.$.solution_md"] = sanitize_latex_delimiters(body.get("solution_md") or "")
        else:
            if "solution_blocks" in body:
                blocks_to_commit = body.get("solution_blocks", [])
                for blk in blocks_to_commit:
                    if blk.get("type") == "text" and blk.get("content"):
                        blk["content"] = sanitize_latex_delimiters(blk["content"])
                committed_blocks = await commit_blocks_images(
                    blocks_to_commit,
                    subject_code=subject_code,
                    year=year,
                    q_no=q_no,
                    sq_no=None,
                    name=paper_name,
                    exam_type=exam_type,
                    paper_type=paper_type
                )
                update_fields["questions.$.solution_blocks"] = committed_blocks
            if "solution_md" in body:
                update_fields["questions.$.solution_md"] = sanitize_latex_delimiters(body.get("solution_md") or "")

        update_res = await db_instance.db.papers.update_one(
            {"_id": obj_id, "questions.q_no": q_num},
            {"$set": update_fields}
        )
        if update_res.matched_count == 0:
            await db_instance.db.papers.update_one(
                {"_id": obj_id, "questions.q_no": str(q_num)},
                {"$set": update_fields}
            )
        return {"success": True, "saved_direct": True}

    # 1. MULTI QUESTION (WITH SUB-QUESTIONS)
    if structure == "multi" and body.get("sub_questions"):
        raw_target = body.get("sq_no") or body.get("target_sq")
        target_sq = str(raw_target).strip().lower() if raw_target and str(raw_target).strip().lower() not in ("all", "") else None
        main_heading = str(body.get("heading") or "").strip()

        # Concurrency semaphore for fast parallel solves across sub-questions
        semaphore = asyncio.Semaphore(4)

        async def solve_single_sub(sq: dict) -> dict:
            sq_item = dict(sq)
            sq_no_val = str(sq.get("sq_no", "")).strip().lower()

            # If a specific sub-question was targeted and this is NOT it, preserve unchanged
            if target_sq and sq_no_val != target_sq:
                sq_item["is_newly_generated"] = False
                return sq_item

            # FRESH SLATE: Remove old solutions so old content can NEVER leak into the new generation!
            sq_item.pop("solution_blocks", None)
            sq_item.pop("solution_md", None)

            is_sub_obj = (nature == "objective" and bool(sq.get("options"))) or (bool(sq.get("options")) and len(sq.get("options")) >= 2)

            # Combine main question context/diagrams with sub-question text so solver has full information
            raw_sq_q = sq.get("question_md", "")
            if main_heading:
                combined_q = f"Main Question Context / Shared Diagram / Instructions:\n{main_heading}\n\nSub-Question ({sq.get('sq_no', '')}):\n{raw_sq_q}"
            else:
                combined_q = raw_sq_q

            async with semaphore:
                if is_sub_obj:
                    sq_opts = sq.get("options") or []
                    res = await solve_objective_question(combined_q, sq_opts, admin_prompt=admin_prompt)
                    if res and res.get("explanation"):
                        sq_item["correct_index"] = res.get("correct_index", 0)
                        sq_item["solution_md"] = res.get("explanation", "")
                        sq_item["solution_blocks"] = []
                        sq_item["consensus"] = res.get("consensus", False)
                        sq_item["verification_status"] = res.get("verification_status", "single_pass")
                        sq_item["is_newly_generated"] = True
                    else:
                        sq_item["correct_index"] = sq.get("correct_index", 0)
                        sq_item["solution_md"] = ""
                        sq_item["solution_blocks"] = []
                        sq_item["is_newly_generated"] = False
                        sq_item["error"] = f"Failed to generate solution for ({sq.get('sq_no')})"
                else:
                    sq_blocks = await solve_subjective_question(
                        question_text=combined_q,
                        subject_code=subject_code,
                        year=year,
                        q_no=q_no,
                        sq_no=sq.get("sq_no", "a"),
                        marks=sq.get("marks", 7),
                        admin_prompt=admin_prompt,
                        visual_type=visual_type,
                        save_to_db=save_to_db,
                        name=paper_name,
                        exam_type=exam_type,
                        paper_type=paper_type
                    )
                    if sq_blocks:
                        sq_item["solution_blocks"] = sq_blocks
                        sq_item["solution_md"] = ""
                        sq_item["is_newly_generated"] = True
                    else:
                        sq_item["solution_blocks"] = []
                        sq_item["solution_md"] = ""
                        sq_item["is_newly_generated"] = False
                        sq_item["error"] = f"Failed to generate solution for ({sq.get('sq_no')})"

            return sq_item

        tasks = [solve_single_sub(sq) for sq in body.get("sub_questions", [])]
        updated_subs = list(await asyncio.gather(*tasks))

        if save_to_db:
            processed_subs = []
            for sq in updated_subs:
                sq_item = dict(sq)
                sq_item.pop("is_newly_generated", None)
                sq_item.pop("error", None)
                sq_item.pop("consensus", None)
                sq_item.pop("verification_status", None)
                if sq_item.get("solution_blocks"):
                    sq_item["solution_blocks"] = await commit_blocks_images(
                        sq_item["solution_blocks"],
                        subject_code=subject_code,
                        year=year,
                        q_no=q_no,
                        sq_no=sq_item.get("sq_no"),
                        name=paper_name,
                        exam_type=exam_type,
                        paper_type=paper_type
                    )
                processed_subs.append(sq_item)
            updated_subs = processed_subs

            q_num = int(q_no) if str(q_no).isdigit() else q_no
            update_res = await db_instance.db.papers.update_one(
                {"_id": obj_id, "questions.q_no": q_num},
                {"$set": {"questions.$.sub_questions": updated_subs, "updated_at": utcnow()}}
            )
            if update_res.matched_count == 0:
                await db_instance.db.papers.update_one(
                    {"_id": obj_id, "questions.q_no": str(q_num)},
                    {"$set": {"questions.$.sub_questions": updated_subs, "updated_at": utcnow()}}
                )

        return {"success": True, "sub_questions": updated_subs}

    # 2. SINGLE OBJECTIVE QUESTION
    elif (nature == "objective") or (isinstance(body.get("options"), list) and len(body.get("options")) >= 2):
        options = body.get("options", [])
        result = await solve_objective_question(question_text, options, admin_prompt=admin_prompt)
        if not result or not result.get("explanation"):
            raise HTTPException(status_code=500, detail="AI solver failed to generate objective solution")
        if save_to_db and result:
            q_num = int(q_no) if str(q_no).isdigit() else q_no
            update_payload = {
                "questions.$.correct_index": result.get("correct_index", 0),
                "questions.$.solution_md": result.get("explanation", ""),
                "questions.$.solution_blocks": [],
                "updated_at": utcnow()
            }
            update_res = await db_instance.db.papers.update_one(
                {"_id": obj_id, "questions.q_no": q_num},
                {"$set": update_payload}
            )
            if update_res.matched_count == 0:
                await db_instance.db.papers.update_one(
                    {"_id": obj_id, "questions.q_no": str(q_num)},
                    {"$set": update_payload}
                )
        return {
            "success": True,
            "objective_solution": result,
            "consensus": result.get("consensus", False),
            "verification_status": result.get("verification_status", "single_pass"),
        }

    # 3. SINGLE SUBJECTIVE QUESTION
    else:
        solution_blocks = await solve_subjective_question(
            question_text=question_text,
            subject_code=subject_code,
            year=year,
            q_no=q_no,
            sq_no=sq_no,
            marks=marks,
            admin_prompt=admin_prompt,
            visual_type=visual_type,
            save_to_db=save_to_db,
            name=paper_name,
            exam_type=exam_type,
            paper_type=paper_type
        )
        if not solution_blocks:
            raise HTTPException(status_code=500, detail="AI solver could not generate solution blocks. Please try again.")
        if save_to_db and solution_blocks:
            solution_blocks = await commit_blocks_images(
                solution_blocks,
                subject_code=subject_code,
                year=year,
                q_no=q_no,
                sq_no=sq_no,
                name=paper_name,
                exam_type=exam_type,
                paper_type=paper_type
            )
            q_num = int(q_no) if str(q_no).isdigit() else q_no
            update_res = await db_instance.db.papers.update_one(
                {"_id": obj_id, "questions.q_no": q_num},
                {"$set": {"questions.$.solution_blocks": solution_blocks, "updated_at": utcnow()}}
            )
            if update_res.matched_count == 0:
                await db_instance.db.papers.update_one(
                    {"_id": obj_id, "questions.q_no": str(q_num)},
                    {"$set": {"questions.$.solution_blocks": solution_blocks, "updated_at": utcnow()}}
                )
        return {"success": True, "solution_blocks": solution_blocks}
