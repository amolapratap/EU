from pydantic import BaseModel, EmailStr
from typing import Optional

# Incoming Signup Request
class SignupModel(BaseModel):
    name: str
    email: EmailStr
    password: str
    semester: str
    branch: str
    mobile: str
    reg_no: str

class VerifyOtpModel(BaseModel):
    email: EmailStr
    otp: str

class LoginModel(BaseModel):
    email: EmailStr
    password: str

class DeleteAccountModel(BaseModel):
    password: Optional[str] = None  # Required for email/password users
    reason: Optional[str] = None    # Optional deletion reason/feedback

# MongoDB User Schema
class User(BaseModel):
    name: str
    email: EmailStr
    password: Optional[str] = None  # Google users won't have password
    semester: int
    branch: str
    mobile: Optional[str] = None
    reg_no: Optional[str] = None
    is_verified: bool = False
    is_deleted: bool = False
    is_active: bool = True
    login_type: str = "email"  # or "google"
