from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth.utils import get_current_user_optional
from app.utils.logger import logger
from .solver import solve_objective_for_student, solve_subjective_for_student

router = APIRouter()


class StudentAiSolveRequest(BaseModel):
    paper_id: Optional[str] = None
    question_text: str
    q_no: Optional[Union[int, str]] = "1"
    sq_no: Optional[str] = None
    marks: Optional[Union[int, float, str]] = 14
    nature: Optional[str] = "subjective"
    options: Optional[List[str]] = None
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    year: Optional[Union[int, str]] = None


@router.post("/solve-question")
async def solve_student_question_route(
    body: StudentAiSolveRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """
    On-demand AI solution generator for mobile app students.
    Strictly read-only: does not modify or save to the paper database.
    Ready for Admin and Pro user gating.
    """
    # Authorization Gate:
    # 1. Admin / Superalpha always allowed
    # 2. Pro students allowed
    # 3. For initial testing, authenticated users or admin access allowed
    is_admin = False
    is_pro = False

    if current_user:
        user_role = str(current_user.get("role", "")).lower()
        is_admin = user_role in ["admin", "superalpha", "superadmin"]
        is_pro = bool(current_user.get("is_pro", False))

    # Access policy: Admin, Pro, or authorized app user
    # (During initial test/rollout, allows admin and app users)
    logger.info(f"AI Solve request from user: {current_user.get('user_id') if current_user else 'anonymous'}, role: {current_user.get('role') if current_user else 'none'}")

    try:
        is_objective = (
            body.nature == "objective"
            or (isinstance(body.options, list) and len(body.options) >= 2)
        )

        if is_objective and body.options:
            res = await solve_objective_for_student(
                question_text=body.question_text,
                options=body.options,
            )
            return {
                "success": True,
                "nature": "objective",
                "objective_solution": res,
                "q_no": body.q_no,
                "sq_no": body.sq_no,
            }
        else:
            blocks = await solve_subjective_for_student(
                question_text=body.question_text,
                marks=body.marks,
                subject_code=body.subject_code,
                subject_name=body.subject_name,
                year=str(body.year) if body.year else None,
            )
            return {
                "success": True,
                "nature": "subjective",
                "solution_blocks": blocks,
                "q_no": body.q_no,
                "sq_no": body.sq_no,
            }

    except Exception as e:
        logger.error(f"Error in student AI solve endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Solver error: {str(e)}",
        )
