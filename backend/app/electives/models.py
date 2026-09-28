from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any


class ChildSubjectItem(BaseModel):
    """Child subject inside an elective group"""
    subject_id: str = Field(..., description="Subject _id referencing the Subject collection")
    short_name: Optional[str] = Field(None, description="Subject short name (auto-filled from Subject if not provided)")
    full_name: Optional[str] = Field(None, description="Subject full name (auto-filled from Subject if not provided)")


class ElectiveGroupCreate(BaseModel):
    """Payload to create an elective group (Admin)"""
    semester_code: str = Field(..., min_length=1, description="Semester code (e.g. '7')")
    branch_code: Union[str, List[str]] = Field(..., description="Branch code string (e.g. '105') or list (e.g. ['105'])")
    code: Optional[str] = Field(None, description="Optional elective code (e.g. 'PE-I')")
    short_name: str = Field(..., min_length=1, description="Short name of elective group (e.g. 'PE-I')")
    full_name: str = Field(..., min_length=1, description="Full name of elective group (e.g. 'Program Elective-I')")
    subjects: List[ChildSubjectItem] = Field(..., description="List of child subjects in this elective group")


class ElectiveGroupUpdate(BaseModel):
    """Payload to update an elective group (Admin)"""
    semester_code: Optional[str] = None
    branch_code: Optional[Union[str, List[str]]] = None
    code: Optional[str] = None
    short_name: Optional[str] = None
    full_name: Optional[str] = None
    subjects: Optional[List[ChildSubjectItem]] = None


class ChildSubjectResponse(BaseModel):
    """Child subject response payload"""
    subject_id: str
    short_name: str
    full_name: str


class ElectiveGroupResponse(BaseModel):
    """Elective group response payload"""
    id: str = Field(..., alias="_id")
    semester_code: str
    branch_code: Union[str, List[str]]
    code: Optional[str] = None
    short_name: str
    full_name: str
    subjects: List[ChildSubjectResponse]

    class Config:
        populate_by_name = True


class V2SubjectsDataResponse(BaseModel):
    """V2 subjects container"""
    regular_subjects: List[Dict[str, Any]]
    electives: List[Dict[str, Any]]


class V2SubjectsResponse(BaseModel):
    """V2 Subjects API response"""
    success: bool = True
    data: V2SubjectsDataResponse
    regular_subjects: List[Dict[str, Any]]
    electives: List[Dict[str, Any]]
