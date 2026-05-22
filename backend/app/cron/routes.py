from fastapi import APIRouter
from app.notices.controllers import check_new_notices



router = APIRouter()

@router.get("/check-notices")
async def check_notices():

    print("Cron Triggered")
    
    result = await check_new_notices()

    return {
        "success": True,
        "result": result
    }