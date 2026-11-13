import asyncio
import base64
import io
import json
import re
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.config import settings
from app.utils.logger import logger
from .prompts import STUDENT_OBJECTIVE_PROMPT, STUDENT_SUBJECTIVE_PROMPT

CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]


def get_genai_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
    return genai.Client(api_key=api_key.strip())


class StudentObjectiveOutput(BaseModel):
    correct_index: int = Field(
        description="The 0-indexed integer of the single verified correct option (0 for A, 1 for B, 2 for C, 3 for D)."
    )
    explanation: str = Field(
        description="Clear, textbook explanation explaining why this option is correct, including step-by-step mathematical derivation if applicable."
    )


class StudentSubjectiveOutput(BaseModel):
    solution_text: str = Field(
        description="Complete step-by-step examination solution with LaTeX formulas and structured sections."
    )
    svg_diagram: Optional[str] = Field(
        default=None,
        description="Standalone valid SVG XML string starting with <svg viewBox='0 0 600 350' ...> or null if no diagram is needed."
    )
    python_plot_code: Optional[str] = Field(
        default=None,
        description="Executable Python matplotlib code saving figure to `img_buf = io.BytesIO(); plt.savefig(img_buf, format='png', dpi=200, bbox_inches='tight')` or null."
    )
    diagram_caption: Optional[str] = Field(
        default=None,
        description="Caption for the diagram or null."
    )


def safe_parse_json(raw_text: str) -> Optional[dict]:
    if not raw_text:
        return None
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        # Fallback regex extraction
        match = re.search(r"(\{[\s\S]*\})", cleaned)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                return None
        return None


def execute_plot_code_to_png(code_str: str) -> Optional[bytes]:
    """Executes safe headless matplotlib script and returns PNG bytes."""
    if not code_str or not code_str.strip():
        return None
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        clean_code = code_str.strip()
        if "```python" in clean_code:
            clean_code = clean_code.split("```python")[1].split("```")[0].strip()
        elif "```" in clean_code:
            clean_code = clean_code.split("```")[1].split("```")[0].strip()

        clean_code = re.sub(r"plt\.show\s*\(\s*\)", "", clean_code)

        local_env = {
            "plt": plt,
            "np": np,
            "io": io,
            "matplotlib": matplotlib,
        }
        plt.clf()
        plt.close("all")

        exec(clean_code, local_env, local_env)

        img_buf = local_env.get("img_buf")
        if img_buf and hasattr(img_buf, "getvalue"):
            png_bytes = img_buf.getvalue()
            plt.close("all")
            if len(png_bytes) > 200:
                return png_bytes
    except Exception as e:
        logger.warning(f"Error executing student plot code: {e}")
    return None


async def solve_objective_for_student(
    question_text: str,
    options: List[str]
) -> Dict:
    """Solves an MCQ question on-demand with Gemini Flash."""
    client = get_genai_client()
    formatted_opts = "\n".join([f"({chr(65 + i)}) {opt}" for i, opt in enumerate(options)])
    user_prompt = f"Question:\n{question_text}\n\nOptions:\n{formatted_opts}"

    error_records = []
    for model_name in CANDIDATE_MODELS:
        try:
            res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=STUDENT_OBJECTIVE_PROMPT,
                        response_mime_type="application/json",
                        response_schema=StudentObjectiveOutput,
                        temperature=0.1,
                    )
                ),
                timeout=30.0
            )
            if res.text:
                parsed = safe_parse_json(res.text)
                if parsed and "correct_index" in parsed:
                    return {
                        "correct_index": parsed.get("correct_index", 0),
                        "explanation": parsed.get("explanation", ""),
                    }
        except Exception as e:
            error_records.append(f"{model_name}: {e}")
            logger.warning(f"Student objective pass failed on {model_name}: {e}")

    raise RuntimeError(f"Objective solver failed across all candidate models: {'; '.join(error_records)}")


async def solve_subjective_for_student(
    question_text: str,
    marks: Optional[float] = 14,
    subject_code: Optional[str] = None,
    subject_name: Optional[str] = None,
    year: Optional[str] = None,
) -> List[Dict]:
    """
    Solves a subjective question on-demand with Gemini Flash and returns standard solution blocks:
    [{ type: 'text', content: '...' }, { type: 'image', image_url: 'data:...', caption: '...' }]
    """
    client = get_genai_client()
    user_prompt = ""
    if subject_code:
        user_prompt += f"Subject Code: {subject_code}\n"
    if subject_name:
        user_prompt += f"Subject Name: {subject_name}\n"
    if year:
        user_prompt += f"Exam Year: {year}\n"
    if marks:
        user_prompt += f"Allocated Marks: {marks}\n"
    user_prompt += f"Question:\n{question_text}"

    parsed_data = None
    error_records = []

    for model_name in CANDIDATE_MODELS:
        try:
            res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=STUDENT_SUBJECTIVE_PROMPT,
                        response_mime_type="application/json",
                        response_schema=StudentSubjectiveOutput,
                        temperature=0.2,
                    )
                ),
                timeout=45.0
            )
            if res.text:
                parsed = safe_parse_json(res.text)
                if parsed and parsed.get("solution_text"):
                    parsed_data = parsed
                    break
        except Exception as e:
            error_records.append(f"{model_name}: {e}")
            logger.warning(f"Student subjective pass failed on {model_name}: {e}")

    if not parsed_data:
        raise RuntimeError(f"Subjective solver failed across all models: {'; '.join(error_records)}")

    solution_blocks: List[Dict] = []
    solution_text = parsed_data.get("solution_text", "").strip()
    svg_code = parsed_data.get("svg_diagram")
    plot_code = parsed_data.get("python_plot_code")
    caption = parsed_data.get("diagram_caption") or "Technical Diagram"

    # Add primary text block
    if solution_text:
        solution_blocks.append({
            "type": "text",
            "content": solution_text
        })

    # Add diagram block if available (inlined as safe data URI)
    if svg_code and "<svg" in svg_code and "</svg>" in svg_code:
        match = re.search(r"(<svg[\s\S]*?</svg>)", svg_code)
        if match:
            clean_svg = match.group(1).strip()
            b64_svg = base64.b64encode(clean_svg.encode("utf-8")).decode("utf-8")
            data_uri = f"data:image/svg+xml;base64,{b64_svg}"
            solution_blocks.append({
                "type": "image",
                "image_url": data_uri,
                "caption": caption
            })
    elif plot_code and plot_code.strip():
        png_bytes = execute_plot_code_to_png(plot_code)
        if png_bytes:
            b64_png = base64.b64encode(png_bytes).decode("utf-8")
            data_uri = f"data:image/png;base64,{b64_png}"
            solution_blocks.append({
                "type": "image",
                "image_url": data_uri,
                "caption": caption
            })

    return solution_blocks
