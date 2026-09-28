from fastapi import APIRouter, Query, Path
from typing import Union

from .controllers import get_v2_subjects_ctrl
from .models import V2SubjectsResponse

router = APIRouter()


@router.get("/subjects", response_model=None, summary="Get regular subjects and elective groups (Query params)")
async def get_v2_subjects_query(
    semester_code: Union[str, int] = Query(..., description="Semester code (e.g. 7)"),
    branch_code: str = Query(..., description="Branch code (e.g. 105)")
):
    """
    V2 Subjects API:
    Returns regular/mandatory subjects and elective groups in a single call.
    Child subjects of elective groups are excluded from top-level regular_subjects.
    """
    return await get_v2_subjects_ctrl(semester_code, branch_code)


@router.get("/subjects/{semester_code}/{branch_code}", response_model=None, summary="Get regular subjects and elective groups (Path params)")
async def get_v2_subjects_path(
    semester_code: Union[str, int] = Path(..., description="Semester code (e.g. 7)"),
    branch_code: str = Path(..., description="Branch code (e.g. 105)")
):
    """
    V2 Subjects API (Path parameters):
    Returns regular/mandatory subjects and elective groups in a single call.
    """
    return await get_v2_subjects_ctrl(semester_code, branch_code)
