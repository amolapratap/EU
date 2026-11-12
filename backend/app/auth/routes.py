from fastapi import APIRouter, HTTPException, Depends
from .models import SignupModel, VerifyOtpModel, LoginModel, DeleteAccountModel
from .controller import (
    initiate_signup,
    verify_otp,
    login_user,
    send_otp,
    change_password,
    soft_delete_user_account,
)
from app.auth.dependencies import user_required
from app.auth.utils import get_current_user

router = APIRouter()


@router.post("/signup")
async def signup_route(body: SignupModel):
    result = await initiate_signup(body)

    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result["message"])

    return result


@router.post("/verify-email")
async def verify_route(body: VerifyOtpModel):
    result = await verify_otp(body.email, body.otp)

    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result["message"])

    return result


@router.post("/login")
async def login_route(body: LoginModel):
    result = await login_user(body.email, body.password)

    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result["message"])

    return result


# To initiate the forgot password process
@router.post("/forgot-password")
async def forgot_password(body: dict):
    email = body.get("email")

    result = await send_otp(email)

    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result["message"])

    return result


# To reset the password
@router.post("/reset-password")
async def reset_password(body: dict):
    email = body.get("email")
    otp = body.get("otp")
    new_password = body.get("new_password")

    result = await change_password(email, otp, new_password)

    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result["message"])

    return result


# Soft delete user account
@router.delete("/account", dependencies=[Depends(user_required)])
async def delete_account_route(
    body: DeleteAccountModel = None,
    user: dict = Depends(get_current_user),
):
    body = body or DeleteAccountModel()
    result = await soft_delete_user_account(user["user_id"], body)

    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to delete account"))

    return result
