import json
import httpx
from typing import List, Optional
from google import genai
from google.genai import types

from app.config import settings
from app.utils.logger import logger
from .pdf_cropper import render_pdf_pages_to_images, crop_diagram_from_page
from .cloudinary_service import (
    build_question_image_public_id,
    upload_image_buffer,
)
from .schemas import ExtractedQuestion, ExtractedPaperQuestions


def get_genai_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
    return genai.Client(api_key=api_key.strip())


SYSTEM_INSTRUCTION = """You are an elite academic exam paper digitization AI specializing in Indian University Engineering Examinations (e.g., BEU, B.Tech, Diploma, AKTU).
Your task is to analyze high-resolution images of question paper pages and extract every single question with 100% precision into structured JSON.

### Extraction Rules:
1. Question Numbering (q_no):
   - Extract the main question number cleanly: "1", "2", "3", etc.
2. Structure:
   - "single": A standalone question without sub-divisions.
   - "multi": A question with sub-parts like (a), (b), (c), (i), (ii), etc.
3. Nature & Multiple Choice (Objective) Options:
   - "objective": Multiple-choice question with distinct options (A, B, C, D) or True/False.
   - "subjective": Theory, derivation, problem-solving, or numerical.
   - CRUCIAL FOR OBJECTIVE QUESTIONS:
     * When a question is objective (e.g. Q1 contains sub-questions (a), (b), (c)... with options):
       - Main question: set structure="multi", nature="objective", heading="Choose the correct answer of the following:"
       - For EACH sub-question in "sub_questions":
         * "question_md": The problem statement text ONLY (do NOT lump the options into question_md).
         * "options": Array of 4 option text strings, e.g. ["Option A text", "Option B text", "Option C text", "Option D text"]. Do NOT leave options null or empty!
         * "correct_index": Optional 0-indexed int (0 for A, 1 for B, 2 for C, 3 for D).
     * If a standalone single question has options, set options: ["...", "...", "...", "..."] and nature="objective".
4. Marks:
   - Extract total marks for the main question and individual marks for each sub-question.
5. Mathematics & Formulas:
   - Always format mathematical formulas, Greek symbols, matrices, and variables in valid LaTeX: $...$ or $$...$$.
6. Diagrams & Figures Detection (CRUCIAL):
   - If a question or sub-question includes an embedded circuit diagram, graph, schematic, table-drawing, or figure:
     Set "diagram_bbox":
       "page_num": <1-based page number where the diagram appears>
       "ymin": <top edge normalized 0 to 1000>
       "xmin": <left edge normalized 0 to 1000>
       "ymax": <bottom edge normalized 0 to 1000>
       "xmax": <right edge normalized 0 to 1000>
   - If no diagram exists for that question, set "diagram_bbox": null.

Return JSON matching the schema with key "questions".
"""


async def extract_questions_from_pdf(
    pdf_bytes: bytes,
    subject_code: str,
    year: str or int,
    page_numbers: Optional[List[int]] = None,
    name: Optional[str] = None,
    exam_type: Optional[str] = None,
    paper_type: Optional[str] = None
) -> List[dict]:
    """
    1. Slices PDF pages into images.
    2. Sends images to Gemini for structured question and diagram bbox extraction.
    3. Precision-crops diagrams from PDF pages.
    4. Uploads cropped diagrams to Cloudinary with deterministic public IDs (no duplicates).
    5. Returns structured list of draft questions for admin review.
    """
    # Step 1: Render pages
    rendered_pages = render_pdf_pages_to_images(pdf_bytes, page_numbers=page_numbers, scale=2.0)
    if not rendered_pages:
        raise ValueError("No pages could be rendered from the provided PDF.")

    logger.info(f"Rendered {len(rendered_pages)} pages for AI extraction (Subject: {subject_code}, Year: {year})")

    # Step 2: Build contents for Gemini
    client = get_genai_client()
    contents = []

    for page_num, png_bytes in rendered_pages:
        contents.append(f"--- START OF PAGE {page_num} ---")
        contents.append(
            types.Part.from_bytes(
                data=png_bytes,
                mime_type="image/png"
            )
        )
        contents.append(f"--- END OF PAGE {page_num} ---")

    contents.append("Extract all questions from the above question paper pages following the system instructions.")

    # Call Gemini
    # Primary: gemini-3.5-flash-lite, fallback: gemini-flash-lite-latest, gemini-3-flash-preview, etc.
    response = None
    last_err = None
    for model_name in ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.8-flash"]:
        try:
            logger.info(f"Attempting question extraction using model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=ExtractedPaperQuestions,
                    temperature=0.1
                )
            )
            break
        except Exception as e:
            logger.warning(f"Model {model_name} extraction failed: {e}")
            last_err = e

    if not response or not response.text:
        raise RuntimeError(f"Gemini extraction failed across all models: {last_err}")

    raw_data = json.loads(response.text)
    if isinstance(raw_data, dict) and "questions" in raw_data:
        raw_json = raw_data["questions"]
    elif isinstance(raw_data, list):
        raw_json = raw_data
    else:
        raw_json = []

    logger.info(f"Gemini returned {len(raw_json)} questions. Processing diagrams...")

    # Step 3: Process and Crop Diagrams
    for q in raw_json:
        # Check main question diagram
        m_bbox = q.get("diagram_bbox")
        if m_bbox and isinstance(m_bbox, dict):
            crop_bytes = crop_diagram_from_page(
                pdf_bytes=pdf_bytes,
                page_num=m_bbox.get("page_num", 1),
                ymin=m_bbox.get("ymin", 0),
                xmin=m_bbox.get("xmin", 0),
                ymax=m_bbox.get("ymax", 1000),
                xmax=m_bbox.get("xmax", 1000)
            )
            if crop_bytes:
                pub_id = build_question_image_public_id(
                    subject_code=subject_code,
                    year=year,
                    q_no=q.get("q_no", "1"),
                    img_no=1,
                    name=name,
                    exam_type=exam_type,
                    paper_type=paper_type
                )
                upload_res = await upload_image_buffer(crop_bytes, pub_id)
                if upload_res.get("success"):
                    img_url = upload_res["image_url"]
                    q["diagram_url"] = img_url
                    # Append image to question_md cleanly
                    q_md = q.get("question_md") or ""
                    if img_url not in q_md:
                        q["question_md"] = f"{q_md}\n\n![Figure]({img_url})".strip()

        # Check sub-questions diagrams
        for sq in q.get("sub_questions", []):
            sq_bbox = sq.get("diagram_bbox")
            if sq_bbox and isinstance(sq_bbox, dict):
                crop_bytes = crop_diagram_from_page(
                    pdf_bytes=pdf_bytes,
                    page_num=sq_bbox.get("page_num", 1),
                    ymin=sq_bbox.get("ymin", 0),
                    xmin=sq_bbox.get("xmin", 0),
                    ymax=sq_bbox.get("ymax", 1000),
                    xmax=sq_bbox.get("xmax", 1000)
                )
                if crop_bytes:
                    pub_id = build_question_image_public_id(
                        subject_code=subject_code,
                        year=year,
                        q_no=q.get("q_no", "1"),
                        sq_no=sq.get("sq_no", "a"),
                        img_no=1,
                        name=name,
                        exam_type=exam_type,
                        paper_type=paper_type
                    )
                    upload_res = await upload_image_buffer(crop_bytes, pub_id)
                    if upload_res.get("success"):
                        img_url = upload_res["image_url"]
                        sq["diagram_url"] = img_url
                        sq_md = sq.get("question_md") or ""
                        if img_url not in sq_md:
                            sq["question_md"] = f"{sq_md}\n\n![Figure]({img_url})".strip()

    return raw_json
