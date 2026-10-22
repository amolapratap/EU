import base64
import json
import re
import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.config import settings
from app.utils.logger import logger
from .cloudinary_service import (
    build_solution_image_public_id,
    upload_image_buffer,
)


def get_genai_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
    return genai.Client(api_key=api_key.strip())


class ObjectiveSolution(BaseModel):
    correct_index: int = Field(description="0-indexed int: 0 for A, 1 for B, 2 for C, 3 for D")
    explanation: str = Field(description="Step-by-step clear rationale explaining why this option is correct")


class SubjectiveSolution(BaseModel):
    solution_text: str = Field(description="Full markdown solution with LaTeX formulas and bullet points")
    svg_diagram: Optional[str] = Field(default=None, description="Valid SVG XML string or null if not required")
    python_plot_code: Optional[str] = Field(default=None, description="Executable Python matplotlib code saving PNG image to `img_buf = io.BytesIO(); plt.savefig(img_buf, format='png', dpi=200, bbox_inches='tight')` or null if not required")
    diagram_caption: Optional[str] = Field(default=None, description="Caption describing the figure or null")


def execute_matplotlib_code_to_png(code_str: str) -> Optional[bytes]:
    """
    Executes AI-generated matplotlib code in a safe headless environment (Agg backend)
    and extracts high-resolution PNG image bytes.
    """
    if not code_str or not code_str.strip():
        return None
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np
        import io

        clean_code = code_str.strip()
        if "```python" in clean_code:
            clean_code = clean_code.split("```python")[1].split("```")[0].strip()
        elif "```" in clean_code:
            clean_code = clean_code.split("```")[1].split("```")[0].strip()

        # Remove blocking GUI calls
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
            if len(png_bytes) > 500:
                return png_bytes

        # Fallback if plt was used without explicit img_buf assignment
        buf = io.BytesIO()
        plt.savefig(buf, format="png", dpi=200, bbox_inches="tight")
        plt.close("all")
        png_bytes = buf.getvalue()
        if len(png_bytes) > 500:
            return png_bytes
    except Exception as e:
        logger.error(f"Failed to execute AI matplotlib plot code: {e}")
        try:
            import matplotlib.pyplot as plt
            plt.close("all")
        except Exception:
            pass
    return None


def safe_parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except Exception:
        # Sanitize unescaped LaTeX backslashes if any escaped standard JSON parser
        sanitized = re.sub(r'\\(?![/"\\bfnrtu]|u[0-9a-fA-F]{4})', r'\\\\', text)
        return json.loads(sanitized, strict=False)


OBJECTIVE_SOLVER_PROMPT = """You are an expert exam solver for university examinations.
Given an objective question and its 4 options, determine the single correct option with 100% certainty.

Return JSON in this exact structure:
{
  "correct_index": <int 0 for A, 1 for B, 2 for C, 3 for D>,
  "explanation": "<step-by-step clear rationale explaining why this option is correct and why others are wrong>"
}
"""

SUBJECTIVE_SOLVER_PROMPT = """You are a distinguished university engineering professor.
Provide an exemplary, high-scoring university examination solution for the given engineering question.

Guidelines for the solution:
1. Academic Depth: Comprehensive, step-by-step, mathematically rigorous using LaTeX formulas ($...$ or $$...$$).
2. Clean Structure: Clear headings, key points, derivations, comparisons, and final conclusions.
3. Visuals / Diagrams (STRICT RULE - ONLY GENERATE WHEN ESSENTIAL):
   - By DEFAULT, set "svg_diagram": null and "diagram_caption": null.
   - ONLY provide an SVG diagram if:
     a) The question explicitly requests one (e.g. "draw", "sketch", "schematic", "circuit diagram", "block diagram", "timing diagram", "flowchart", "graph"), OR
     b) The subject matter is fundamentally graphical and cannot be taught without a diagram (e.g., electronic circuit schematics, geometric stress distributions, specific network topologies like Star/Mesh).
   - For all other questions (definitions, theory, explanations, classifications, lists, algorithms, differences, code, advantages/disadvantages):
     DO NOT generate any diagram. Set "svg_diagram": null and "diagram_caption": null.
   - When generated, the SVG must:
     * Be a clean, modern, standalone SVG string with valid XML starting with <svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg"> and ending with </svg>.
     * Use a sleek technical dark/light theme (e.g., stroke="#4f46e5" or "#3b82f6", fill="#1e1b4b" or "#f8fafc", crisp fonts).
     * Contain clear labels, component values, and arrows.
"""


CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]


async def solve_objective_question(
    question_text: str,
    options: List[str],
    admin_prompt: Optional[str] = None
) -> Dict:
    """
    Solves an objective MCQ question and returns correct_index + explanation.
    """
    client = get_genai_client()
    user_prompt = f"Question: {question_text}\n\nOptions:\n"
    for i, opt in enumerate(options):
        letter = chr(65 + i)
        user_prompt += f"{letter}. {opt}\n"

    if admin_prompt and admin_prompt.strip():
        user_prompt += f"\nAdditional Admin Guidance:\n{admin_prompt.strip()}\n"

    last_err = None
    for model_name in CANDIDATE_MODELS:
        try:
            logger.info(f"Attempting objective solve using model: {model_name}")
            res = await client.aio.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=OBJECTIVE_SOLVER_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ObjectiveSolution,
                    temperature=0.1
                )
            )
            if res.text:
                return safe_parse_json(res.text)
        except Exception as e:
            logger.warning(f"Objective solver failed on {model_name}: {e}")
            last_err = e

    logger.error(f"Objective solver failed across all models: {last_err}")
    return {"correct_index": 0, "explanation": "Auto-solver could not determine."}


async def _attach_image_block(
    blocks: List[Dict],
    data_bytes: bytes,
    is_svg: bool,
    caption: str,
    subject_code: str,
    year: str or int,
    q_no: str or int,
    sq_no: Optional[str],
    save_to_db: bool,
    name: Optional[str] = None,
    exam_type: Optional[str] = None,
    paper_type: Optional[str] = None
) -> bool:
    """
    Helper to attach either a PNG or SVG image block.
    If save_to_db=False, stages as a Base64 data URL (zero storage waste, preview safety).
    If save_to_db=True, commits to Cloudinary with deterministic public IDs.
    """
    mime_type = "image/svg+xml" if is_svg else "image/png"
    if not save_to_db:
        b64_str = base64.b64encode(data_bytes).decode("utf-8")
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "image",
            "image_url": f"data:{mime_type};base64,{b64_str}",
            "caption": caption
        })
        return True
    else:
        pub_id = build_solution_image_public_id(
            subject_code=subject_code,
            year=year,
            q_no=q_no,
            sq_no=sq_no,
            img_no=1,
            name=name,
            exam_type=exam_type,
            paper_type=paper_type
        )
        upload_res = await upload_image_buffer(data_bytes, pub_id, is_svg=is_svg)
        if upload_res.get("success"):
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "image",
                "image_url": upload_res["image_url"],
                "caption": caption
            })
            return True
    return False


async def solve_subjective_question(
    question_text: str,
    subject_code: str,
    year: str or int,
    q_no: str or int,
    sq_no: Optional[str] = None,
    marks: Optional[float] = 14,
    admin_prompt: Optional[str] = None,
    visual_type: str = "svg",
    save_to_db: bool = False,
    name: Optional[str] = None,
    exam_type: Optional[str] = None,
    paper_type: Optional[str] = None
) -> List[Dict]:
    """
    Generates an engineering solution with LaTeX + SVG/Image diagram where applicable.
    Default visual_type: 'svg' (Adaptive hybrid mode: clean SVG for structured/circuits,
    high-res Matplotlib PNG for hard/complex math plots & waveforms, and None for theory).
    Supports visual_type: 'svg', 'image' (PNG plot via matplotlib), or 'none'.
    Assembles into standard solution_blocks: [{ type: "text", content }, { type: "image", image_url }]
    Guarantees 100% backward compatibility with existing website & app.
    """
    client = get_genai_client()
    user_prompt = f"Subject Code: {subject_code}\nYear: {year}\nMarks: {marks}"
    if name and str(name).strip():
        user_prompt += f"\nSubject/Paper Name: {str(name).strip()}"
    if exam_type and str(exam_type).strip():
        user_prompt += f"\nExam Type: {str(exam_type).strip()}"
    if paper_type and str(paper_type).strip():
        user_prompt += f"\nPaper Category: {str(paper_type).strip()}"
    user_prompt += f"\nQuestion: {question_text}"
    if admin_prompt and admin_prompt.strip():
        user_prompt += f"\n\nAdditional Admin Guidance:\n{admin_prompt.strip()}"

    visual_mode = (visual_type or "svg").strip().lower()
    if visual_mode == "none":
        visual_rules = """3. Visuals / Diagrams (STRICT RULE - DISABLED):
   - Set "svg_diagram": null, "python_plot_code": null, and "diagram_caption": null.
   - Do NOT provide any diagram, graph, or code for images."""
    elif visual_mode == "image":
        visual_rules = """3. Visuals / Diagrams (STRICT RULE - ACTUAL IMAGE / MATPLOTLIB MODE):
   - By DEFAULT, if the question is purely descriptive or does not require a visual, set "python_plot_code": null, "svg_diagram": null, and "diagram_caption": null.
   - If the question involves mathematical graphs, curves, coordinate plots, waveforms, circuit/block diagrams, or explicitly asks to "draw/sketch/plot":
     Provide clean, executable Python matplotlib code in "python_plot_code" that generates a high-quality, publication-grade PNG graphic with labeled axes, grid, legends, title, and annotations. The code MUST save the figure to `img_buf = io.BytesIO(); plt.savefig(img_buf, format='png', dpi=200, bbox_inches='tight')` and `plt.close()`.
     Set "svg_diagram": null.
     Provide a clear descriptive "diagram_caption"."""
    else:  # "svg" (DEFAULT ADAPTIVE HYBRID MODE: SVG FOR STRUCTURED, MATPLOTLIB PNG FOR HARD MATH)
        visual_rules = """3. Visuals / Diagrams (STRICT RULE - ONLY GENERATE WHEN ESSENTIAL):
   - By DEFAULT, for definitions, derivations, proofs, theory, calculations, algorithms, differences, code, formulas, and text explanations:
     DO NOT generate any diagram. Set "svg_diagram": null, "python_plot_code": null, and "diagram_caption": null.
   - ONLY provide a visual if:
     a) The question explicitly requests one (e.g., "draw", "sketch", "circuit diagram", "block diagram", "waveform", "schematic", "graph", "timing diagram", "flowchart", "architecture", "plot"), OR
     b) The concept is fundamentally graphical and cannot be understood without a visual schematic.
   - When a visual is REQUIRED, choose the format based on complexity:
     * CASE A (Easy / Structured Diagrams & Basic Geometry - USE SVG):
       For electronic circuits, block diagrams, flowcharts, system architectures, logic gates, network topologies, state machines, or simple geometric figures:
       Provide a clean, modern, standalone SVG XML string in "svg_diagram" starting with <svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg"> and ending with </svg>, with crisp technical styling and labeled components. Set "python_plot_code": null.
     * CASE B (Hard / Complex Mathematical Curves, Plots & Continuous Waveforms - USE MATPLOTLIB PNG):
       For complex mathematical functions, frequency responses (Bode/Nyquist plots), root loci, continuous signals/waveforms, coordinate plots, 3D curves, vector fields, or phase plane portraits:
       Provide clean, executable Python matplotlib code in "python_plot_code" that generates a high-quality, publication-grade PNG graphic with labeled axes, grid, legends, title, and annotations. The code MUST save the figure to `img_buf = io.BytesIO(); plt.savefig(img_buf, format='png', dpi=200, bbox_inches='tight')` and `plt.close()`. Set "svg_diagram": null.
   - Always provide a clear, descriptive "diagram_caption" when a visual is generated."""

    system_instruction = f"""You are a distinguished university engineering professor.
Provide an exemplary, high-scoring university examination solution for the given engineering question.

Guidelines for the solution:
1. Academic Depth: Comprehensive, step-by-step, mathematically rigorous using LaTeX formulas ($...$ or $$...$$).
2. Clean Structure: Clear headings, key points, derivations, comparisons, and final conclusions.
{visual_rules}
"""

    data = None
    last_err = None
    for model_name in CANDIDATE_MODELS:
        try:
            logger.info(f"Attempting subjective solve using model: {model_name} (Q{q_no}{sq_no or ''}) [visual: {visual_mode}]")
            res = await client.aio.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=SubjectiveSolution,
                    temperature=0.1
                )
            )
            if res.text:
                data = safe_parse_json(res.text)
                break
        except Exception as e:
            logger.warning(f"Subjective solver failed on {model_name}: {e}")
            last_err = e

    if not data:
        logger.error(f"Subjective solver failed across all models: {last_err}")
        return []

    blocks = []
    
    # 1. Main Solution Text Block
    sol_text = data.get("solution_text") or ""
    if sol_text.strip():
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "text",
            "content": sol_text.strip()
        })

    # 2. Visual / Diagram Block (Adaptive: Matplotlib PNG or SVG)
    caption = data.get("diagram_caption") or f"Figure: Q{q_no}{sq_no or ''} Technical Diagram"

    if visual_mode in ("svg", "image"):
        # Check python_plot_code first (explicit image mode OR hard/complex math in svg mode)
        plot_code = data.get("python_plot_code")
        png_bytes = execute_matplotlib_code_to_png(plot_code) if plot_code else None

        if png_bytes:
            await _attach_image_block(
                blocks=blocks,
                data_bytes=png_bytes,
                is_svg=False,
                caption=caption,
                subject_code=subject_code,
                year=year,
                q_no=q_no,
                sq_no=sq_no,
                save_to_db=save_to_db,
                name=name,
                exam_type=exam_type,
                paper_type=paper_type
            )
        elif data.get("svg_diagram"):
            # Easy/structured diagram in SVG mode, or SVG fallback
            svg_code = data.get("svg_diagram")
            if svg_code and "<svg" in svg_code and "</svg>" in svg_code:
                match = re.search(r"(<svg[\s\S]*?</svg>)", svg_code)
                if match:
                    clean_svg = match.group(1).encode("utf-8")
                    await _attach_image_block(
                        blocks=blocks,
                        data_bytes=clean_svg,
                        is_svg=True,
                        caption=caption,
                        subject_code=subject_code,
                        year=year,
                        q_no=q_no,
                        sq_no=sq_no,
                        save_to_db=save_to_db,
                        name=name,
                        exam_type=exam_type,
                        paper_type=paper_type
                    )

    return blocks
