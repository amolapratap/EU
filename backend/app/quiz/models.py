from pydantic import BaseModel, Field
from typing import List, Optional

# ==========================================
# REQUEST PAYLOADS
# ==========================================

class UserAnswerSubmission(BaseModel):
    """Payload representing a single answered question"""
    question_id: str = Field(..., description="Format: '{q_no}_{sq_no}'")
    selected_index: int = Field(..., ge=-1, description="-1 means left unattempted")

class QuizSubmissionRequest(BaseModel):
    """Complete payload when hitting 'Submit Test'"""
    paper_id: str
    answers: List[UserAnswerSubmission]
    time_taken: int = Field(default=0, ge=0)

# ==========================================
# RESPONSE PAYLOADS
# ==========================================

class QuestionResponse(BaseModel):
    """Safe question structure sent to user UI (No answers/solutions)"""
    id: str
    question_md: str
    options: List[str]

class QuizPaperResponse(BaseModel):
    """Paper metadata needed to label the quiz experience."""
    id: str
    name: Optional[str] = None
    subject_code: Optional[str] = None
    year: Optional[int] = None
    exam_type: Optional[str] = None
    paper_type: Optional[str] = None
    type: Optional[str] = None

class QuizzesQuestionsResponse(BaseModel):
    """Standard dynamic structural stream matching Quiz Mode/Test requirements"""
    total_questions: int
    questions: List[QuestionResponse]
    paper: QuizPaperResponse

class QuizPaperListItem(BaseModel):
    """A paper eligible to be started in objective test mode."""
    paper_id: str
    subject_code: str
    name: Optional[str] = None
    type: Optional[str] = None
    paper_type: Optional[str] = None
    year: Optional[int] = None
    objective_questions: int

class QuizPaperListResponse(BaseModel):
    total_papers: int
    papers: List[QuizPaperListItem]

class AnswerDetail(BaseModel):
    """Post-Exam analysis layout blueprint"""
    question_id: str
    question_text: str
    options: List[str]
    user_selected_index: int
    user_selected_text: str
    correct_index: int
    correct_text: str
    is_correct: bool
    explanation: str

class QuizSubmissionResponse(BaseModel):
    """Instant scorecard evaluations metadata payload"""
    attempt_id: str
    score: int
    total: int
    percentage: float
    answers_detail: List[AnswerDetail]

class QuizResultsResponse(BaseModel):
    """Complete result metrics tracking profile card view"""
    attempt_id: str
    score: int
    total: int
    percentage: float
    time_taken: int
    submitted_at: str
    answers_detail: List[AnswerDetail]

class QuizAttemptDetail(BaseModel):
    """Item block blueprint within student user analytics list history"""
    attempt_id: str
    subject_code: str
    subject_name: Optional[str] = None
    year: Optional[int] = None
    score: int
    total: int
    percentage: float
    submitted_at: str
    time_taken: int

class QuizHistoryResponse(BaseModel):
    """Complete list payload profile returned for previous student papers history"""
    total_attempts: int
    attempts: List[QuizAttemptDetail]
