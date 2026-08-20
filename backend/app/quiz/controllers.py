from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime
from typing import Dict, Any, List, Optional
import re

from app.database import db_instance
from .models import QuizSubmissionRequest


class QuizController:
    """Handles mapping nested paper schemas into a single flat objective test string"""

    # =====================================================
    # 0. LIST PAPERS AVAILABLE FOR OBJECTIVE TEST MODE
    # =====================================================
    @staticmethod
    async def get_test_papers(search: str = "", limit: int = 500) -> Dict[str, Any]:
        """Return only papers containing at least one usable objective MCQ."""
        query: Dict[str, Any] = {
            "questions": {"$elemMatch": {"nature": "objective"}}
        }

        normalized_search = search.strip()
        if normalized_search:
            safe_search = re.escape(normalized_search)
            query["$or"] = [
                {"subject_code": {"$regex": safe_search, "$options": "i"}},
                {"name": {"$regex": safe_search, "$options": "i"}},
            ]

        projection = {
            "subject_code": 1,
            "name": 1,
            "type": 1,
            "paper_type": 1,
            "year": 1,
            "questions.nature": 1,
            "questions.sub_questions.options": 1,
        }
        papers = await db_instance.db.papers.find(query, projection).sort([
            ("year", -1),
            ("subject_code", 1),
            ("created_at", -1),
        ]).to_list(limit)

        eligible_papers: List[Dict[str, Any]] = []
        for paper in papers:
            objective_questions = sum(
                1
                for question in paper.get("questions", [])
                if question.get("nature") == "objective"
                for sub_question in question.get("sub_questions", [])
                if sub_question.get("options")
            )

            if objective_questions == 0:
                continue

            eligible_papers.append({
                "paper_id": str(paper["_id"]),
                "subject_code": paper.get("subject_code", ""),
                "name": paper.get("name", ""),
                "type": paper.get("type"),
                "paper_type": paper.get("paper_type"),
                "year": paper.get("year"),
                "objective_questions": objective_questions,
            })

        return {
            "total_papers": len(eligible_papers),
            "papers": eligible_papers,
        }

    # =====================================================
    # 1. FETCH ONE QUIZ QUESTIONS (SAFE FLAT STREAM)
    # =====================================================
    @staticmethod
    async def get_quiz_questions(paper_id: str) -> Dict[str, Any]:
        try:
            try:
                paper_oid = ObjectId(paper_id)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid paper ID format"
                )

            paper = await db_instance.db.papers.find_one({"_id": paper_oid})

            if not paper:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Paper not found in database"
                )

            questions: List[Dict[str, Any]] = []

            # Clean parsing over nested array elements
            for q in paper.get("questions", []):
                if q.get("nature") != "objective":
                    continue

                q_no = q.get("q_no")

                for sq in q.get("sub_questions", []):
                    options = sq.get("options", [])

                    # Filter out non-MCQ structural profiles safely
                    if not options:
                        continue

                    questions.append({
                        "id": f"{q_no}_{sq.get('sq_no')}",
                        "question_md": sq.get("question_md", ""),
                        "options": options
                    })

            return {
                "total_questions": len(questions),
                "questions": questions,
                "paper": {
                    "id": str(paper["_id"]),
                    "name": paper.get("name"),
                    "subject_code": paper.get("subject_code"),
                    "year": paper.get("year"),
                    "exam_type": paper.get("exam_type"),
                    "paper_type": paper.get("paper_type"),
                    "type": paper.get("type"),
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing question stream: {str(e)}"
            )

    # =====================================================
    # 2. EVALUATE & SAVE SUBMISSION
    # =====================================================
    @staticmethod
    async def submit_quiz(submission: QuizSubmissionRequest, user_id: str) -> Dict[str, Any]:
        try:
            try:
                paper_oid = ObjectId(submission.paper_id)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid paper ID format"
                )

            paper = await db_instance.db.papers.find_one({"_id": paper_oid})

            if not paper:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Paper context not found"
                )

            questions_map: Dict[str, Dict[str, Any]] = {}

            for q in paper.get("questions", []):
                if q.get("nature") != "objective":
                    continue

                q_no = q.get("q_no")

                for sq in q.get("sub_questions", []):
                    options = sq.get("options", [])
                    if not options:
                        continue

                    qid = f"{q_no}_{sq.get('sq_no')}"
                    questions_map[qid] = {
                        "question_md": sq.get("question_md", ""),
                        "options": options,
                        "correct_index": sq.get("correct_index", -1),
                        "solution_md": sq.get("solution_md", "")
                    }

            correct_count = 0
            answers_detail: List[Dict[str, Any]] = []

            # Adaptable mapping tracking mechanism for objects vs dictionaries
            submitted_answers = {}
            for a in submission.answers:
                if hasattr(a, "question_id"):
                    submitted_answers[a.question_id] = a.selected_index
                else:
                    submitted_answers[a.get("question_id")] = a.get("selected_index", -1)

            for qid, q in questions_map.items():
                selected_index = submitted_answers.get(qid, -1)
                options = q["options"]
                correct_index = q["correct_index"]

                is_correct = (selected_index == correct_index) and (selected_index != -1)

                if is_correct:
                    correct_count += 1

                user_text = options[selected_index] if 0 <= selected_index < len(options) else "Not Answered"
                correct_text = options[correct_index] if 0 <= correct_index < len(options) else "N/A"

                answers_detail.append({
                    "question_id": qid,
                    "question_text": q["question_md"],
                    "options": options,
                    "user_selected_index": selected_index,
                    "user_selected_text": user_text,
                    "correct_index": correct_index,
                    "correct_text": correct_text,
                    "is_correct": is_correct,
                    "explanation": q["solution_md"]
                })

            total_questions = len(questions_map)
            percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0

            quiz_attempt = {
                "user_id": ObjectId(user_id),
                "paper_id": paper_oid,
                "subject_code": paper.get("subject_code", ""),
                "subject_name": paper.get("name", ""),
                "year": paper.get("year"),
                "total_questions": total_questions,
                "correct_answers": correct_count,
                "score_percentage": round(percentage, 2),
                "time_taken": getattr(submission, "time_taken", 0),
                "submitted_at": datetime.utcnow(),
                "answers": answers_detail,
                "status": "completed"
            }

            result = await db_instance.db.quiz_attempts.insert_one(quiz_attempt)

            return {
                "attempt_id": str(result.inserted_id),
                "score": correct_count,
                "total": total_questions,
                "percentage": round(percentage, 2),
                "answers_detail": answers_detail
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Evaluation execution failure: {str(e)}"
            )

    # =====================================================
    # 3. RETRIEVE SAVED RESULTS DETAILED CARD
    # =====================================================
    @staticmethod
    async def get_quiz_results(attempt_id: str, user_id: str) -> Dict[str, Any]:
        try:
            attempt_oid = ObjectId(attempt_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid attempt ID structure format")

        attempt = await db_instance.db.quiz_attempts.find_one({
            "_id": attempt_oid,
            "user_id": ObjectId(user_id)
        })

        if not attempt:
            raise HTTPException(status_code=404, detail="Quiz result record missing")

        return {
            "attempt_id": str(attempt["_id"]),
            "score": attempt.get("correct_answers", 0),
            "total": attempt.get("total_questions", 0),
            "percentage": attempt.get("score_percentage", 0),
            "time_taken": attempt.get("time_taken", 0),
            "submitted_at": attempt["submitted_at"].isoformat() if isinstance(attempt["submitted_at"], datetime) else str(attempt["submitted_at"]),
            "answers_detail": attempt.get("answers", [])
        }

    # =====================================================
    # 4. GET TIMELINE LOG HISTORY
    # =====================================================
    @staticmethod
    async def get_quiz_history(user_id: str, limit: int = 50) -> Dict[str, Any]:
        attempts = await db_instance.db.quiz_attempts.find({
            "user_id": ObjectId(user_id)
        }).sort("submitted_at", -1).to_list(limit)

        # Older attempts were saved before the year field was introduced.
        # Resolve their paper years in one query so history remains complete.
        paper_ids = list({attempt.get("paper_id") for attempt in attempts if attempt.get("paper_id")})
        papers = await db_instance.db.papers.find({"_id": {"$in": paper_ids}}).to_list(None) if paper_ids else []
        paper_years = {str(paper["_id"]): paper.get("year") for paper in papers}

        return {
            "total_attempts": len(attempts),
            "attempts": [
                {
                    "attempt_id": str(a["_id"]),
                    "subject_code": a.get("subject_code", ""),
                    "subject_name": a.get("subject_name", ""),
                    "year": a.get("year", paper_years.get(str(a.get("paper_id")))),
                    "score": a.get("correct_answers", 0),
                    "total": a.get("total_questions", 0),
                    "percentage": a.get("score_percentage", 0),
                    "submitted_at": a["submitted_at"].isoformat() if isinstance(a["submitted_at"], datetime) else str(a["submitted_at"]),
                    "time_taken": a.get("time_taken", 0)
                }
                for a in attempts
            ]
        }

    # =====================================================
    # 5. FETCH AGGREGATED HISTORICAL STATS
    # =====================================================
    @staticmethod
    async def get_quiz_statistics(user_id: str, paper_id: Optional[str] = None) -> Dict[str, Any]:
        query: Dict[str, Any] = {"user_id": ObjectId(user_id)}
        if paper_id:
            try:
                query["paper_id"] = ObjectId(paper_id)
            except Exception:
                pass

        attempts = await db_instance.db.quiz_attempts.find(query).to_list(None)

        if not attempts:
            return {
                "total_attempts": 0,
                "average_score": 0,
                "average_percentage": 0,
                "best_score": 0,
                "worst_score": 0,
                "total_time_spent": 0
            }

        total = len(attempts)
        return {
            "total_attempts": total,
            "average_score": round(sum(a.get("correct_answers", 0) for a in attempts) / total, 2),
            "average_percentage": round(sum(a.get("score_percentage", 0) for a in attempts) / total, 2),
            "best_score": max(a.get("score_percentage", 0) for a in attempts),
            "worst_score": min(a.get("score_percentage", 0) for a in attempts),
            "total_time_spent": sum(a.get("time_taken", 0) for a in attempts)
        }
