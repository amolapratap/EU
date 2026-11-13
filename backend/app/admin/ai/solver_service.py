import asyncio
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
    correct_index: int = Field(
        description="The 0-indexed integer of the single verified correct option (0 for Option A, 1 for Option B, 2 for Option C, 3 for Option D)."
    )
    explanation: str = Field(
        description="Direct, authoritative textbook explanation (strictly 2 to 4 concise sentences or concise derivation steps with clean LaTeX math formulas) explaining strictly WHY the selected option is correct."
    )


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
    if not text:
        return {}
    try:
        # 1. Any single backslash followed by b,f,n,r,t AND another letter (e.g. \theta, \frac, \beta, \right, \nabla, \tau, \times)
        # is a LaTeX command, NOT a JSON escape sequence. Double it so json.loads won't decode it as ASCII control char!
        sanitized = re.sub(r'(?<!\\)\\([bfnrt][a-zA-Z])', lambda m: '\\\\' + m.group(1), text)
        # 2. Any other backslash that is NOT a standard JSON escape (\", \\, \/, \b, \f, \n, \r, \t, \uXXXX)
        # is LaTeX (e.g. \sin, \alpha, \omega, \{, \}, \_) and would cause JSONDecodeError. Double it!
        sanitized = re.sub(r'(?<!\\)\\(?!["/\\bfnrtu]|u[0-9a-fA-F]{4})', r'\\\\', sanitized)
        return json.loads(sanitized, strict=False)
    except Exception:
        try:
            return json.loads(text, strict=False)
        except Exception:
            return {}


def clean_objective_explanation(text: str) -> str:
    r"""
    Cleans the explanation of an objective question:
    1. Removes any internal model deliberations, second-guessing ('Let\'s select', 'Let\'s trust', 'Usually standard exam...'),
       double check / verification meta-ramblings.
    2. Runs sanitize_latex_delimiters to ensure math formatting is 100% symmetric and clean.
    """
    if not text or not isinstance(text, str):
        return ""

    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    clean_sentences = []
    for s in sentences:
        if re.search(
            r"\b(Let\'s select|Let\'s pick|Let\'s trust|No, let\'s trust|Usually,\s*standard exam|Internal double-check|Distractor audit)\b",
            s,
            re.IGNORECASE
        ):
            continue
        clean_sentences.append(s)

    cleaned = " ".join(clean_sentences).strip()
    return sanitize_latex_delimiters(cleaned or text)


def sanitize_latex_delimiters(text: str) -> str:
    r"""
    Guarantees clean, symmetric LaTeX delimiters and prevents broken math blocks.
    Fixes:
    - Mismatched delimiters (e.g. `$$...$` or `$...$$`).
    - Unclosed environments like `\begin{aligned}` without `\end{aligned}`.
    - Unclosed `$$` display math blocks before markdown headings (`##`) or at end of text.
    - Odd single `$` signs on lines.
    """
    if not text or not isinstance(text, str):
        return text or ""

    # 1. Fix single-line mismatched math:
    text = re.sub(r'(?m)^\$\$([^$\n]+)\$(?!\$)\s*$', r'$$\1$$', text)
    text = re.sub(r'(?m)^(?<!\$)\$(?!\$)([^$\n]+)\$\$\s*$', r'$$\1$$', text)
    text = re.sub(r'\$\$([^$\n]+)\$(?!\$)', r'$$\1$$', text)
    text = re.sub(r'(?<!\$)\$([^$\n]+)\$\$', r'$$\1$$', text)

    # 2. Check for unclosed environments like \begin{aligned} without \end{aligned}
    env_matches = set(re.findall(r'\\begin\{([a-zA-Z\*]+)\}', text))
    for env in env_matches:
        begin_count = len(re.findall(r'\\begin\{' + re.escape(env) + r'\}', text))
        end_count = len(re.findall(r'\\end\{' + re.escape(env) + r'\}', text))
        if begin_count > end_count:
            missing_ends = '\n'.join([f'\\end{{{env}}}' for _ in range(begin_count - end_count)])
            if text.rstrip().endswith('$$'):
                idx = text.rfind('$$')
                text = text[:idx] + f'\n{missing_ends}\n' + text[idx:]
            else:
                text += f'\n{missing_ends}\n'

    # 3. Fix unclosed display math '$$' before headings or end of text
    lines = text.split('\n')
    in_display_math = False
    repaired_lines = []

    for line in lines:
        stripped = line.strip()

        # If currently in display math, and we hit a markdown heading (e.g. ## Step 2)
        if in_display_math and stripped.startswith('#'):
            repaired_lines.append('$$')
            in_display_math = False

        temp_line = stripped.replace(r'\$$', '')
        num_double_dollars = temp_line.count('$$')
        if num_double_dollars % 2 != 0:
            in_display_math = not in_display_math

        repaired_lines.append(line)

    if in_display_math:
        repaired_lines.append('$$')

    text = '\n'.join(repaired_lines)

    # 4. Check for odd single dollar signs on single lines that are NOT part of $$
    lines = text.split('\n')
    repaired_lines = []
    for line in lines:
        stripped = line.strip()
        if '$$' in stripped or stripped.startswith('#') or not stripped:
            repaired_lines.append(line)
            continue
        cleaned = re.sub(r'\\\s*\$', '', stripped)
        single_dollars = re.findall(r'(?<!\$)\$(?!\$)', cleaned)
        if len(single_dollars) % 2 != 0:
            repaired_lines.append(line + '$')
        else:
            repaired_lines.append(line)
    text = '\n'.join(repaired_lines)

    return text


OBJECTIVE_SOLVER_PROMPT = r"""You are an authoritative university examination solver specializing in objective Multiple Choice Questions (MCQs).
Your goal is 100% mathematical, scientific, and factual accuracy, producing a clean, direct, textbook-quality explanation for students.

### EXPLANATION RULES (STRICT & MANDATORY):
1. CLEAN TEXTBOOK EXPLANATION ONLY:
   - The `explanation` field is presented directly to students in the official solution manual.
   - It MUST ONLY state why the chosen correct option is true (the governing formula, definition, and direct calculation).
   - NEVER include internal deliberations, second-guessing, or speculation (e.g. NEVER write "Let's select A or B", "maybe alpha is...", "let's trust B", "usually exam questions with...").
   - NEVER mention "double check", "verification", "checking options", or guessing.
   - Do NOT debate or analyze other options unless needed for a direct, concise definition.

2. DYNAMIC LATEX & MATHEMATICAL INTEGRITY:
   - All mathematical formulas, symbols, and variables MUST be wrapped in standard LaTeX delimiters:
     * Inline math: `$formula$` (e.g., `$\sin(\theta_m) = \frac{1-\alpha}{1+\alpha}$`, `$G(s)$`, `$\omega_n$`).
     * Display math: `$$formula$$`.
   - Always write standard LaTeX commands for Greek letters and symbols (e.g., `\theta`, `\alpha`, `\beta`, `\tau`, `\omega`, `\phi`, `\frac{a}{b}`).
   - Ensure all math delimiters are symmetrical: `$inline$` or `$$display$$`. Never leave unmatched `$` signs.

3. CONCISE & STEP-BY-STEP:
   - Keep the explanation strictly 2 to 4 concise sentences or clean steps.
   - State the governing formula, substitute the given values, compute the result, and match to the correct option.

4. 0-INDEXED OPTION MAPPING:
   - Option A -> 0
   - Option B -> 1
   - Option C -> 2
   - Option D -> 3
   - `correct_index` MUST be the integer corresponding to the verified correct option.
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
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]


async def _execute_single_objective_pass(
    client: genai.Client,
    model_name: str,
    user_prompt: str,
    timeout: float = 20.0
) -> Optional[Dict]:
    """Runs a single isolated solve pass using the specified model."""
    try:
        res = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=OBJECTIVE_SOLVER_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ObjectiveSolution,
                    temperature=0.0
                )
            ),
            timeout=timeout
        )
        if res.text:
            return safe_parse_json(res.text)
    except Exception as e:
        logger.warning(f"Objective single pass failed on {model_name}: {e}")
    return None


async def solve_objective_question(
    question_text: str,
    options: List[str],
    admin_prompt: Optional[str] = None
) -> Dict:
    """
    Solves an objective MCQ question using Dual Independent Consensus:
    1. Runs two completely isolated passes (Pass 1 & Pass 2) concurrently in parallel with ZERO shared context.
    2. If both passes independently agree on the exact same option index:
       -> 100% Consensus Verified!
    3. If they disagree:
       -> Runs an independent 3rd pass (Tie-Breaker / Arbitrator) to achieve 2-of-3 majority consensus.
       -> If still split, returns best reasoned option and flags for manual review.
    """
    client = get_genai_client()
    user_prompt = f"Question: {question_text}\n\nOptions:\n"
    for i, opt in enumerate(options):
        letter = chr(65 + i)
        user_prompt += f"{letter}. {opt}\n"

    if admin_prompt and admin_prompt.strip():
        user_prompt += f"\nAdditional Admin Guidance:\n{admin_prompt.strip()}\n"

    # Step 1: Run Pass 1 and Pass 2 concurrently with independent models
    model_1 = CANDIDATE_MODELS[0]
    model_2 = CANDIDATE_MODELS[1] if len(CANDIDATE_MODELS) > 1 else model_1

    logger.info(f"MCQ Dual-Check started in parallel: [{model_1}] and [{model_2}]")
    task1 = _execute_single_objective_pass(client, model_1, user_prompt, timeout=20.0)
    task2 = _execute_single_objective_pass(client, model_2, user_prompt, timeout=20.0)

    res1, res2 = await asyncio.gather(task1, task2, return_exceptions=True)

    pass1 = res1 if isinstance(res1, dict) else None
    pass2 = res2 if isinstance(res2, dict) else None

    # Fallback handling if one model failed to respond
    if pass1 and not pass2:
        return {
            "correct_index": pass1.get("correct_index", 0),
            "explanation": clean_objective_explanation(pass1.get("explanation", "")),
            "consensus": False,
            "verification_status": "single_pass"
        }
    if pass2 and not pass1:
        return {
            "correct_index": pass2.get("correct_index", 0),
            "explanation": clean_objective_explanation(pass2.get("explanation", "")),
            "consensus": False,
            "verification_status": "single_pass"
        }
    if not pass1 and not pass2:
        # Fallback to model 3 if both 1 & 2 failed
        model_3 = CANDIDATE_MODELS[2] if len(CANDIDATE_MODELS) > 2 else "gemini-3.5-flash"
        pass3 = await _execute_single_objective_pass(client, model_3, user_prompt, timeout=25.0)
        if pass3:
            return {
                "correct_index": pass3.get("correct_index", 0),
                "explanation": clean_objective_explanation(pass3.get("explanation", "")),
                "consensus": False,
                "verification_status": "fallback"
            }
        return {"correct_index": 0, "explanation": "Auto-solver could not determine."}

    # Step 2: Compare Pass 1 and Pass 2
    idx1 = pass1.get("correct_index")
    idx2 = pass2.get("correct_index")

    if idx1 == idx2 and isinstance(idx1, int):
        # 100% Dual-Check Consensus Verified!
        logger.info(f"MCQ Dual-Check MATCH: Both models independently verified Option {chr(65 + idx1)} (#{idx1 + 1})")
        chosen = pass1 if len(pass1.get("explanation", "")) >= len(pass2.get("explanation", "")) else pass2
        return {
            "correct_index": idx1,
            "explanation": clean_objective_explanation(chosen.get("explanation", "")),
            "consensus": True,
            "verification_status": "dual_check_verified"
        }

    # Step 3: Disagreement -> Tie-Breaker Pass 3
    logger.warning(f"MCQ Dual-Check MISMATCH: Pass 1={idx1}, Pass 2={idx2}. Triggering independent Tie-Breaker Pass 3...")
    model_3 = CANDIDATE_MODELS[2] if len(CANDIDATE_MODELS) > 2 else "gemini-3.5-flash"
    pass3 = await _execute_single_objective_pass(client, model_3, user_prompt, timeout=25.0)
    idx3 = pass3.get("correct_index") if isinstance(pass3, dict) else None

    if idx3 == idx1:
        logger.info(f"Tie-Breaker resolved to Option {chr(65 + idx1)} (Pass 1 + Pass 3 consensus)")
        return {
            "correct_index": idx1,
            "explanation": clean_objective_explanation(pass1.get("explanation", "")),
            "consensus": True,
            "verification_status": "majority_2_of_3"
        }
    elif idx3 == idx2:
        logger.info(f"Tie-Breaker resolved to Option {chr(65 + idx2)} (Pass 2 + Pass 3 consensus)")
        return {
            "correct_index": idx2,
            "explanation": clean_objective_explanation(pass2.get("explanation", "")),
            "consensus": True,
            "verification_status": "majority_2_of_3"
        }
    else:
        # Split decision: return Pass 1 with warning flag
        logger.warning(f"MCQ Split decision: Pass 1={idx1}, Pass 2={idx2}, Pass 3={idx3}")
        expl = pass1.get("explanation", "")
        return {
            "correct_index": idx1,
            "explanation": clean_objective_explanation(expl) + "\n\n*(Note: Solvers showed split choices; please double-check manually.)*",
            "consensus": False,
            "verification_status": "split_decision"
        }


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
2. Clean Structure: Clear headings (e.g. '## 1. Overview', '## 2. Derivation'), key points, derivations, and final conclusions.
3. STRICT MATHEMATICAL & LATEX FORMATTING RULES (PREVENTS RENDERING ERRORS):
   - DELIMITER SYMMETRY: Every opening math delimiter MUST match its closing delimiter identically:
     * Inline math: `$formula$` (exactly ONE dollar sign on each side, e.g. `$x = 5$`).
     * Display / block math: `$$formula$$` (exactly TWO dollar signs on each side on their own lines, e.g. `$$\\int f(x) dx$$`).
   - NEVER MISMATCH DELIMITERS: Never start with `$$` and end with `$`, or start with `$` and end with `$$`.
   - NEVER LEAVE MATH BLOCKS UNCLOSED: Always close display math `$$` BEFORE writing any subsequent markdown heading (`##`) or regular paragraph text.
   - LaTeX ENVIRONMENTS: Ensure any `\\begin{{aligned}}`, `\\begin{{matrix}}`, or `\\begin{{cases}}` has a matching `\\end{{aligned}}`, `\\end{{matrix}}`, or `\\end{{cases}}` inside the same `$$` block.
   - CURRENCY & SPECIAL SYMBOLS: Never use raw unescaped currency `$` signs; write `USD`, `Rs.`, or `\\$`.
{visual_rules}
"""

    data = None
    last_err = None
    for model_name in CANDIDATE_MODELS:
        try:
            logger.info(f"Attempting subjective solve using model: {model_name} (Q{q_no}{sq_no or ''}) [visual: {visual_mode}]")
            res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=SubjectiveSolution,
                        temperature=0.1
                    )
                ),
                timeout=30.0
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
            "content": sanitize_latex_delimiters(sol_text.strip())
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
