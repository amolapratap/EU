from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.utils import get_current_user

from .controllers import QuizController
from .models import (
    QuizzesQuestionsResponse,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
    QuizResultsResponse,
    QuizHistoryResponse
)

router = APIRouter()

#  This forces Swagger UI to show a working lock icon and attach headers automatically
security_scheme = HTTPBearer()

# 1. FETCH QUIZ QUESTIONS
@router.get("/questions/{paper_id}", response_model=QuizzesQuestionsResponse)
async def get_quiz_questions(paper_id: str):
    return await QuizController.get_quiz_questions(paper_id)


# 2. SUBMIT QUIZ SHEET
@router.post(
    "/submit", 
    response_model=QuizSubmissionResponse,
    dependencies=[Depends(security_scheme)] # <---  lock this route
)
async def submit_quiz(
    submission: QuizSubmissionRequest,
    user=Depends(get_current_user)
):
    return await QuizController.submit_quiz(submission, user["user_id"])


# 3. GET ATTEMPT METRICS SUMMARY
@router.get(
    "/results/{attempt_id}", 
    response_model=QuizResultsResponse,
    dependencies=[Depends(security_scheme)] # <---  lock this route
)
async def get_quiz_results(
    attempt_id: str,
    user=Depends(get_current_user)
):
    return await QuizController.get_quiz_results(attempt_id, user["user_id"])


# 4. VIEW LOG HISTORIES
@router.get(
    "/history", 
    response_model=QuizHistoryResponse,
    dependencies=[Depends(security_scheme)] # <---  lock this route
)
async def get_quiz_history(
    limit: int = 50,
    user=Depends(get_current_user)
):
    return await QuizController.get_quiz_history(user["user_id"], limit)


# 5. AGGREGATED METRICS DASHBOARD
@router.get(
    "/statistics",
    dependencies=[Depends(security_scheme)] # <---  lock this route
)
async def get_quiz_statistics(
    paper_id: str = None,
    user=Depends(get_current_user)
):
    return await QuizController.get_quiz_statistics(user["user_id"], paper_id)