from fastapi import APIRouter



router = APIRouter()



@router.get("/notices")
async def get_notices():
    pass


@router.get("/notices/{notice_id}")
async def get_notice(notice_id: int):
    pass