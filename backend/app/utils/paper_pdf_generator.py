import os
import re
import unicodedata
from io import BytesIO
from xml.sax.saxutils import escape

import fitz  # PyMuPDF
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Line, Polygon


WATERMARK_LOGO_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets",
    "ar_logo_watercolor.png",
)


def _register_fonts() -> str:
    """
    Registers TrueType Times New Roman (Windows) or Liberation/DejaVu Serif (Linux)
    so Unicode characters (Greek symbols, math symbols, etc.) render natively.
    Falls back to standard PDF Times-Roman if no TTF is found.
    """
    font_candidates = [
        # Windows Times New Roman
        (
            "BEU-Serif",
            "C:/Windows/Fonts/times.ttf",
            "C:/Windows/Fonts/timesbd.ttf",
            "C:/Windows/Fonts/timesi.ttf",
            "C:/Windows/Fonts/timesbi.ttf",
        ),
        # Linux Liberation Serif
        (
            "BEU-Serif",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf",
        ),
        # Linux DejaVu Serif
        (
            "BEU-Serif",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSerif-BoldItalic.ttf",
        ),
    ]

    for family, reg, bd, it, bi in font_candidates:
        if all(os.path.exists(p) for p in (reg, bd, it, bi)):
            try:
                pdfmetrics.registerFont(TTFont(f"{family}-Regular", reg))
                pdfmetrics.registerFont(TTFont(f"{family}-Bold", bd))
                pdfmetrics.registerFont(TTFont(f"{family}-Italic", it))
                pdfmetrics.registerFont(TTFont(f"{family}-BoldItalic", bi))
                pdfmetrics.registerFontFamily(
                    family,
                    normal=f"{family}-Regular",
                    bold=f"{family}-Bold",
                    italic=f"{family}-Italic",
                    boldItalic=f"{family}-BoldItalic",
                )
                return family
            except Exception:
                continue

    return "Times"


FONT_FAMILY = _register_fonts()


def _font(weight: str = "Regular") -> str:
    if FONT_FAMILY == "Times":
        mapping = {
            "Regular": "Times-Roman",
            "Bold": "Times-Bold",
            "Italic": "Times-Italic",
            "BoldItalic": "Times-BoldItalic",
        }
        return mapping.get(weight, "Times-Roman")
    return f"{FONT_FAMILY}-{weight}"


SUBSCRIPT_MAP = {
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
    "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")",
    "ₐ": "a", "ₑ": "e", "ₒ": "o", "ₓ": "x", "ₕ": "h",
    "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₚ": "p",
    "ₛ": "s", "ₜ": "t",
}

SUPERSCRIPT_MAP = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")",
    "ⁿ": "n", "ⁱ": "i",
}


def _smart_normalize_newlines(text: str) -> str:
    """
    Preserves intentional line breaks (numbered lists, sub-parts i), ii), tables, blank lines)
    while unwrapping accidental mid-sentence PDF copy-paste line breaks.
    """
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n")]
    if len(lines) <= 1:
        return text.strip()

    keep_break_pattern = re.compile(
        r"^(\(?[ivxIVX]{1,4}[\)\.]|\(?[a-zA-Z][\)\.]|[0-9]+[\.\)]|[-•*]|where\b|given\b|process\b|p[0-9]\b)",
        re.IGNORECASE,
    )

    merged = [lines[0]]
    for line in lines[1:]:
        if not line:
            if merged and not merged[-1].endswith("\n"):
                merged[-1] = merged[-1] + "\n"
            continue

        prev = merged[-1]
        if (
            prev.endswith("\n")
            or prev.endswith(":")
            or keep_break_pattern.match(line)
            or "   " in line
            or "\t" in line
        ):
            if prev.endswith("\n"):
                merged.append(line)
            else:
                merged[-1] = prev + "\n" + line
        else:
            merged[-1] = prev + " " + line

    return "\n".join(merged)


def sanitize_and_format_text(raw_text: str) -> str:
    """
    Cleans question markdown/text from DB for ReportLab Paragraph XML parser:
    - Converts Unicode subscripts/superscripts to <sub> and <sup> tags
    - Normalizes mathematical alphanumeric Unicode (e.g. 𝜎 -> σ, 𝑀 -> M)
    - Escapes XML special chars (&, <, >) while preserving intentional line breaks
    """
    if not raw_text:
        return ""

    text = _smart_normalize_newlines(str(raw_text))

    # Replace common Unicode dashes and quotes
    text = text.replace("–", "-").replace("—", "-").replace("−", "-")
    text = text.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"')

    # Convert Unicode subscripts and superscripts into placeholders before NFKC normalization
    out_chars = []
    for ch in text:
        if ch in SUBSCRIPT_MAP:
            out_chars.append(f"@@SUB_START@@{SUBSCRIPT_MAP[ch]}@@SUB_END@@")
        elif ch in SUPERSCRIPT_MAP:
            out_chars.append(f"@@SUP_START@@{SUPERSCRIPT_MAP[ch]}@@SUP_END@@")
        else:
            out_chars.append(unicodedata.normalize("NFKC", ch))
    text = "".join(out_chars)

    # Convert basic LaTeX inline notations if present (e.g. _{1} or ^{2})
    text = re.sub(r"_\{([^{}]+)\}", r"@@SUB_START@@\1@@SUB_END@@", text)
    text = re.sub(r"\^\{([^{}]+)\}", r"@@SUP_START@@\1@@SUP_END@@", text)

    # Escape XML entities (&, <, >)
    text = escape(text)

    # Restore valid ReportLab tags with scaled font size so sub/sup never collide with adjacent lines
    text = text.replace("@@SUB_START@@", '<sub><font size="7">').replace("@@SUB_END@@", "</font></sub>")
    text = text.replace("@@SUP_START@@", '<sup><font size="7">').replace("@@SUP_END@@", "</font></sup>")

    # Convert remaining intentional newlines into <br/>
    text = text.replace("\n", "<br/>")

    return text


def format_semester_ordinal(sem_code: str) -> str:
    """
    Converts semester code (e.g., '6' or '3') into '6<sup><font size="8">th</font></sup>'.
    Does not assume any default semester if sem_code is empty.
    """
    s = str(sem_code or "").strip()
    m = re.search(r"(\d+)", s)
    if not m:
        return s
    num = int(m.group(1))
    if num == 1:
        suffix = "st"
    elif num == 2:
        suffix = "nd"
    elif num == 3:
        suffix = "rd"
    else:
        suffix = "th"
    return f'{num}<sup><font size="8">{suffix}</font></sup>'


def is_generic_placeholder_heading(heading: str) -> bool:
    """
    Detects admin editor filler headings like 'Answer both questions' or 'Answer both Quetions'
    so they are not printed redundantly on standard (a)/(b) questions.
    """
    if not heading:
        return True
    cleaned = re.sub(r"[^a-zA-Z\s]", "", heading).strip().lower()
    generic_prefixes = (
        "answer both",
        "answer all",
        "attempt both",
        "attempt all",
        "answer the following",
        "answer following",
    )
    for prefix in generic_prefixes:
        if cleaned.startswith(prefix) and len(cleaned.split()) <= 5:
            return True
    return False


class UniversityExamCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw 'Page X of Y' footers
    matching the BEU paper ('Page 1 of 2' with bold numbers).
    """
    def __init__(self, *args, **kwargs):
        super(UniversityExamCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(UniversityExamCanvas, self).showPage()
        super(UniversityExamCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        page_num = self._pageNumber
        width, _ = A4
        y = 33

        # Render "Page " (Regular) + "{page_num}" (Bold) + " of " (Regular) + "{page_count}" (Bold)
        p1 = "Page "
        p2 = str(page_num)
        p3 = " of "
        p4 = str(page_count)

        f_reg = _font("Regular")
        f_bold = _font("Bold")
        sz = 10.0

        w1 = pdfmetrics.stringWidth(p1, f_reg, sz)
        w2 = pdfmetrics.stringWidth(p2, f_bold, sz)
        w3 = pdfmetrics.stringWidth(p3, f_reg, sz)
        w4 = pdfmetrics.stringWidth(p4, f_bold, sz)
        total_w = w1 + w2 + w3 + w4

        x = (width - total_w) / 2.0
        self.setFont(f_reg, sz)
        self.drawString(x, y, p1)
        x += w1
        self.setFont(f_bold, sz)
        self.drawString(x, y, p2)
        x += w2
        self.setFont(f_reg, sz)
        self.drawString(x, y, p3)
        x += w3
        self.setFont(f_bold, sz)
        self.drawString(x, y, p4)

        self.restoreState()


def create_divider_ornament(width=175, height=12):
    """
    Creates the BEU end-of-paper vector ornament: a horizontal rule with
    small solid diamonds at both endpoints (♦──────────────────♦).
    """
    d = Drawing(width, height)
    mid_y = height / 2.0
    ink = colors.HexColor("#555555")
    r = 3.0  # diamond radius

    # Left diamond centered at (r + 1, mid_y)
    lx = r + 1.0
    d.add(
        Polygon(
            [lx, mid_y + r, lx + r, mid_y, lx, mid_y - r, lx - r, mid_y],
            fillColor=ink,
            strokeColor=ink,
        )
    )

    # Right diamond centered at (width - r - 1, mid_y)
    rx = width - r - 1.0
    d.add(
        Polygon(
            [rx, mid_y + r, rx + r, mid_y, rx, mid_y - r, rx - r, mid_y],
            fillColor=ink,
            strokeColor=ink,
        )
    )

    # Connecting line
    d.add(Line(lx + r, mid_y, rx - r, mid_y, strokeColor=ink, strokeWidth=0.75))
    return d


def _build_question_body_flowable(raw_md: str, body_style: ParagraphStyle, sub_num_style: ParagraphStyle, body_width: float):
    """
    Formats a question body. If it contains sub-items like 'i) ...' and 'ii) ...' on separate lines,
    renders those lines with a clean hanging indent table just like Q.2(b) in the actual BEU paper.
    """
    if not raw_md:
        return Paragraph("", body_style)

    normalized = _smart_normalize_newlines(str(raw_md))
    lines = [ln.strip() for ln in normalized.split("\n") if ln.strip()]

    sub_item_re = re.compile(r"^(\(?[ivxIVX]{1,4}[\)\.]|[1-9][\)\.])\s+(.*)$")
    has_sub_items = any(sub_item_re.match(ln) for ln in lines)

    if not has_sub_items:
        return Paragraph(sanitize_and_format_text(raw_md), body_style)

    flow_rows = []
    main_buf = []

    def flush_main():
        if main_buf:
            txt = sanitize_and_format_text("\n".join(main_buf))
            flow_rows.append([Paragraph(txt, body_style)])
            main_buf.clear()

    sub_table_rows = []
    for ln in lines:
        m = sub_item_re.match(ln)
        if m:
            flush_main()
            lbl = escape(m.group(1))
            rest = sanitize_and_format_text(m.group(2))
            sub_table_rows.append([Paragraph(lbl, sub_num_style), Paragraph(rest, body_style)])
        else:
            if sub_table_rows:
                # Attach continuation line to previous sub-item if already in sub-items
                prev_lbl, prev_p = sub_table_rows[-1]
                # Rebuild combined text
                main_buf.append(ln)
            else:
                main_buf.append(ln)

    flush_main()

    if sub_table_rows:
        lbl_w = 20.0
        sub_t = Table(sub_table_rows, colWidths=[lbl_w, body_width - lbl_w])
        sub_t.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0.5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0.5),
                ]
            )
        )
        flow_rows.append([sub_t])

    if len(flow_rows) == 1:
        return flow_rows[0][0]

    wrapper = Table(flow_rows, colWidths=[body_width])
    wrapper.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.0),
            ]
        )
    )
    return wrapper


def _build_pdf_with_params(
    paper: dict,
    subject: dict | None,
    scale: float = 1.0,
    p1_gap: float = 8.5,
    p2_gap: float = 8.5,
    p2_sub_pad: float = 1.4,
) -> bytes:
    """
    Internal builder with configurable font scale and independent Page 1 / Page 2 vertical spacing.
    """
    buf = BytesIO()

    # A4 = 595.27 x 841.89 pt
    # Left/Right margins = 46pt -> Usable width = 503pt (matches actual BEU paper margins)
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=46,
        rightMargin=46,
        topMargin=32,
        bottomMargin=44,
    )

    # Extract metadata strictly according to rules:
    # - subject_name comes from paper["name"]
    # - sem_code comes from subject["semester_code"] (no default "6")
    subject_code = str(paper.get("subject_code") or (subject.get("code") if subject else "") or "").strip()
    subject_name = str(paper.get("name") or (subject.get("full_name") if subject else "") or subject_code).strip()
    year = str(paper.get("year") or "").strip()

    sem_code = str((subject.get("semester_code") if subject else None) or paper.get("semester_code") or "").strip()
    sem_ordinal = format_semester_ordinal(sem_code)

    if sem_ordinal:
        exam_title = f"B.Tech {sem_ordinal} Semester Examination" + (f", {year}" if year else "")
    else:
        exam_title = "B.Tech Semester Examination" + (f", {year}" if year else "")

    # Styles matching actual BEU question paper typography
    univ_title_style = ParagraphStyle(
        "UnivTitle",
        fontName=_font("Bold"),
        fontSize=16.0,
        leading=19.5,
        alignment=TA_CENTER,
        spaceAfter=2,
    )

    exam_title_style = ParagraphStyle(
        "ExamTitle",
        fontName=_font("Bold"),
        fontSize=12.5,
        leading=15.5,
        alignment=TA_CENTER,
        spaceAfter=6,
    )

    meta_left_style = ParagraphStyle(
        "MetaLeft",
        fontName=_font("BoldItalic"),
        fontSize=10.6,
        leading=13.5,
        alignment=TA_LEFT,
    )

    meta_center_style = ParagraphStyle(
        "MetaCenter",
        fontName=_font("BoldItalic"),
        fontSize=10.6,
        leading=13.5,
        alignment=TA_CENTER,
    )

    meta_right_style = ParagraphStyle(
        "MetaRight",
        fontName=_font("BoldItalic"),
        fontSize=10.6,
        leading=13.5,
        alignment=TA_RIGHT,
    )

    inst_heading_style = ParagraphStyle(
        "InstHeading",
        fontName=_font("BoldItalic"),
        fontSize=10.4,
        leading=13.0,
    )

    inst_num_style = ParagraphStyle(
        "InstNum",
        fontName=_font("Italic"),
        fontSize=10.2,
        leading=13.2,
    )

    inst_item_style = ParagraphStyle(
        "InstItem",
        fontName=_font("Italic"),
        fontSize=10.2,
        leading=13.2,
    )

    base_fs = 11.0 * scale
    base_ld = 13.2 * scale

    q1_hdr_label = ParagraphStyle(
        "Q1HdrLabel",
        fontName=_font("BoldItalic"),
        fontSize=base_fs,
        leading=base_ld,
    )

    q1_hdr_text = ParagraphStyle(
        "Q1HdrText",
        fontName=_font("BoldItalic"),
        fontSize=base_fs,
        leading=base_ld,
    )

    q1_hdr_marks = ParagraphStyle(
        "Q1HdrMarks",
        fontName=_font("Bold"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_RIGHT,
    )

    mcq_num_style = ParagraphStyle(
        "MCQNum",
        fontName=_font("Regular"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_LEFT,
    )

    mcq_text_style = ParagraphStyle(
        "MCQText",
        fontName=_font("Regular"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_JUSTIFY,
    )

    mcq_opt_style = ParagraphStyle(
        "MCQOpt",
        fontName=_font("Regular"),
        fontSize=base_fs,
        leading=12.6 * scale,
        alignment=TA_LEFT,
    )

    lq_num_style = ParagraphStyle(
        "LQNum",
        fontName=_font("BoldItalic"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_LEFT,
    )

    lq_part_style = ParagraphStyle(
        "LQPart",
        fontName=_font("Regular"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_LEFT,
    )

    lq_body_style = ParagraphStyle(
        "LQBody",
        fontName=_font("Regular"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_JUSTIFY,
    )

    lq_heading_style = ParagraphStyle(
        "LQHeading",
        fontName=_font("BoldItalic"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_LEFT,
    )

    lq_marks_style = ParagraphStyle(
        "LQMarks",
        fontName=_font("Bold"),
        fontSize=base_fs,
        leading=base_ld,
        alignment=TA_RIGHT,
    )

    story = []

    # ==================== HEADER ====================
    story.append(Paragraph("Bihar Engineering University, Patna", univ_title_style))
    story.append(Paragraph(exam_title, exam_title_style))

    # In actual BEU paper:
    # Row 1: Left = "Course: B.Tech", Center = "", Right = "Time: 03 Hours"
    # Row 2: Left = "Code : 100613", Center = "Subject: Electrical Drives", Right = "Full Marks: 70"
    meta_table_data = [
        [
            Paragraph("", meta_left_style),
            Paragraph("Course: B.Tech", meta_left_style),
            Paragraph("", meta_center_style),
            Paragraph("Time: 03 Hours", meta_right_style),
            Paragraph("", meta_right_style),
        ],
        [
            Paragraph("", meta_left_style),
            Paragraph(f"Code : {escape(str(subject_code))}", meta_left_style),
            Paragraph(f"Subject: {escape(str(subject_name))}", meta_center_style),
            Paragraph("Full Marks: 70", meta_right_style),
            Paragraph("", meta_right_style),
        ],
    ]
    # Total width = 503pt (8pt inset on left and right to match BEU paper's rule overhang)
    meta_table = Table(meta_table_data, colWidths=[8, 120, 247, 120, 8])
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.5),
            ]
        )
    )
    story.append(meta_table)
    story.append(
        HRFlowable(
            width="100%",
            thickness=0.6,
            color=colors.HexColor("#444444"),
            spaceBefore=3,
            spaceAfter=3,
        )
    )

    # ==================== INSTRUCTIONS ====================
    inst_rows = [
        [Paragraph("", inst_num_style), Paragraph("Instructions:-", inst_heading_style), Paragraph("", inst_item_style)],
        [
            Paragraph("", inst_num_style),
            Paragraph("(i)", inst_num_style),
            Paragraph("The marks are indicated in the right-hand margin.", inst_item_style),
        ],
        [
            Paragraph("", inst_num_style),
            Paragraph("(ii)", inst_num_style),
            Paragraph("There are <b><i>NINE</i></b> questions in this paper.", inst_item_style),
        ],
        [
            Paragraph("", inst_num_style),
            Paragraph("(iii)", inst_num_style),
            Paragraph("Attempt <b><i>FIVE</i></b> questions in all.", inst_item_style),
        ],
        [
            Paragraph("", inst_num_style),
            Paragraph("(iv)", inst_num_style),
            Paragraph("Question No. <b><i>1</i></b> is compulsory.", inst_item_style),
        ],
    ]
    inst_table = Table(inst_rows, colWidths=[8, 25, 470])
    inst_table.setStyle(
        TableStyle(
            [
                ("SPAN", (1, 0), (2, 0)),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0.6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0.6),
            ]
        )
    )
    story.append(inst_table)
    story.append(
        HRFlowable(
            width="100%",
            thickness=0.6,
            color=colors.HexColor("#444444"),
            spaceBefore=3.5,
            spaceAfter=6,
        )
    )

    # Sort questions by q_no
    questions = sorted(paper.get("questions", []), key=lambda q: int(q.get("q_no", 0)))

    q1_obj = None
    other_questions = []
    for q in questions:
        if int(q.get("q_no", 0)) == 1 and (q.get("nature") == "objective" or q.get("sub_questions")):
            q1_obj = q
        else:
            other_questions.append(q)

    # Unified horizontal grid (total = 503pt):
    # Col 0: 8pt (left inset inside horizontal line)
    # Col 1: 33pt ("Q.1", "Q.2", ..., "Q.9")
    # Col 2: 27pt ("(a)", "(b)", ..., "(j)")
    # Col 3: 376pt (Question text & 4-col option table)
    # Col 4: 59pt ("[2 x 7 = 14]" / "[7]")
    # 8 + 33 + 27 + 376 + 59 = 503pt
    BODY_COL_W = 376.0

    def build_mcq_flowable(idx: int, sq: dict):
        raw_sq_no = str(sq.get("sq_no") or chr(97 + idx)).strip("() ")
        sq_id = f"({raw_sq_no})"
        q_text = sanitize_and_format_text(sq.get("question_md", ""))
        opts = sq.get("options") or []

        opt_lbl_w = 26.0
        opt_txt_w = (BODY_COL_W - 2 * opt_lbl_w) / 2.0  # (376 - 52) / 2 = 162pt

        if len(opts) >= 4:
            opt_rows = [
                [
                    Paragraph("(i)", mcq_opt_style),
                    Paragraph(sanitize_and_format_text(opts[0]), mcq_opt_style),
                    Paragraph("(iii)", mcq_opt_style),
                    Paragraph(sanitize_and_format_text(opts[2]), mcq_opt_style),
                ],
                [
                    Paragraph("(ii)", mcq_opt_style),
                    Paragraph(sanitize_and_format_text(opts[1]), mcq_opt_style),
                    Paragraph("(iv)", mcq_opt_style),
                    Paragraph(sanitize_and_format_text(opts[3]), mcq_opt_style),
                ],
            ]
        elif len(opts) > 0:
            roman = ["(i)", "(ii)", "(iii)", "(iv)"]
            opt_rows = [
                [
                    Paragraph(roman[i], mcq_opt_style),
                    Paragraph(sanitize_and_format_text(opt), mcq_opt_style),
                    Paragraph("", mcq_opt_style),
                    Paragraph("", mcq_opt_style),
                ]
                for i, opt in enumerate(opts[:4])
            ]
        else:
            opt_rows = []

        rows = [
            [
                Paragraph("", mcq_num_style),
                Paragraph("", mcq_num_style),
                Paragraph(sq_id, mcq_num_style),
                Paragraph(q_text, mcq_text_style),
                Paragraph("", mcq_num_style),
            ]
        ]
        if opt_rows:
            opt_table = Table(opt_rows, colWidths=[opt_lbl_w, opt_txt_w, opt_lbl_w, opt_txt_w])
            opt_table.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                        ("RIGHTPADDING", (1, 0), (1, -1), 10),
                        ("TOPPADDING", (0, 0), (-1, -1), 0.3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 0.3),
                    ]
                )
            )
            rows.append(["", "", "", opt_table, ""])

        q_table = Table(rows, colWidths=[8, 33, 27, BODY_COL_W, 59])
        q_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0.2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0.2),
                ]
            )
        )
        return q_table

    # ==================== QUESTION 1 (OBJECTIVE) ====================
    if q1_obj:
        q1_heading = sanitize_and_format_text(
            q1_obj.get("heading") or "Choose the correct answer of the following (Any seven question only):"
        )
        q1_marks_val = q1_obj.get("marks", 14)
        q1_marks_str = "[2 x 7 = 14]" if str(q1_marks_val) == "14" else f"[{q1_marks_val}]"

        q1_hdr_table = Table(
            [
                [
                    Paragraph("", q1_hdr_label),
                    Paragraph("Q.1", q1_hdr_label),
                    Paragraph(q1_heading, q1_hdr_text),
                    Paragraph(q1_marks_str, q1_hdr_marks),
                ]
            ],
            colWidths=[8, 33, 387, 75],
        )
        q1_hdr_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(q1_hdr_table)

        subs = q1_obj.get("sub_questions") or []
        page1_subs = subs[:9]
        page2_subs = subs[9:]

        for idx, sq in enumerate(page1_subs):
            story.append(build_mcq_flowable(idx, sq))
            if idx < len(page1_subs) - 1:
                story.append(Spacer(1, p1_gap))

        if other_questions or page2_subs:
            story.append(PageBreak())

        for idx, sq in enumerate(page2_subs, start=9):
            story.append(build_mcq_flowable(idx, sq))
            story.append(Spacer(1, p2_gap))

    # ==================== QUESTIONS 2 TO 9 (SUBJECTIVE) ====================
    for q_idx, q in enumerate(other_questions):
        q_num_label = f"Q.{q.get('q_no', '')}"
        structure = q.get("structure", "multi")
        q_marks = q.get("marks", "")
        raw_heading = (q.get("heading") or "").strip()
        subs = q.get("sub_questions") or []

        q_rows = []
        span_first_row = False

        if structure == "single" or not subs:
            body_flowable = _build_question_body_flowable(
                q.get("question_md") or raw_heading,
                lq_body_style,
                lq_part_style,
                BODY_COL_W + 27.0,
            )
            marks_str = f"[{q_marks}]" if q_marks else ""
            q_rows.append(
                [
                    Paragraph("", lq_num_style),
                    Paragraph(q_num_label, lq_num_style),
                    body_flowable,
                    Paragraph("", lq_part_style),
                    Paragraph(marks_str, lq_marks_style),
                ]
            )
            span_first_row = True
        else:
            show_heading = not is_generic_placeholder_heading(raw_heading)
            if show_heading:
                marks_str = f"[{q_marks}]" if q_marks else ""
                q_rows.append(
                    [
                        Paragraph("", lq_num_style),
                        Paragraph(q_num_label, lq_num_style),
                        Paragraph(sanitize_and_format_text(raw_heading), lq_heading_style),
                        Paragraph("", lq_part_style),
                        Paragraph(marks_str, lq_marks_style),
                    ]
                )
                span_first_row = True

            for idx, sq in enumerate(subs):
                col_num = (
                    Paragraph(q_num_label, lq_num_style)
                    if (idx == 0 and not show_heading)
                    else Paragraph("", lq_num_style)
                )
                raw_sq_no = str(sq.get("sq_no") or chr(97 + idx)).strip("() ")
                col_part = Paragraph(f"({raw_sq_no})", lq_part_style)
                col_body = _build_question_body_flowable(
                    sq.get("question_md", ""), lq_body_style, lq_part_style, BODY_COL_W
                )
                sq_marks = sq.get("marks", "")
                if show_heading and len(subs) > 2:
                    col_marks = Paragraph("", lq_marks_style)
                else:
                    col_marks = Paragraph(f"[{sq_marks}]" if sq_marks else "", lq_marks_style)
                q_rows.append([Paragraph("", lq_num_style), col_num, col_part, col_body, col_marks])

        t_style = [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), p2_sub_pad),
            ("BOTTOMPADDING", (0, 0), (-1, -1), p2_sub_pad),
        ]
        if span_first_row:
            t_style.append(("SPAN", (2, 0), (3, 0)))

        t = Table(q_rows, colWidths=[8, 33, 27, BODY_COL_W, 59])
        t.setStyle(TableStyle(t_style))
        story.append(t)
        if q_idx < len(other_questions) - 1:
            story.append(Spacer(1, p2_gap))

    # ==================== END ORNAMENT ====================
    ornament_drawing = create_divider_ornament(width=175, height=12)
    orn_table = Table([[ornament_drawing]], colWidths=[503])
    orn_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(orn_table)

    doc.build(story, canvasmaker=UniversityExamCanvas)
    return buf.getvalue()


def _measure_page_bottoms(pdf_bytes: bytes) -> tuple[int, list[float]]:
    """
    Returns (page_count, [max_y_per_page]) excluding the 'Page X of Y' footer at y > 798.
    """
    bottoms = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        page_count = doc.page_count
        for page in doc:
            blocks = page.get_text("blocks")
            # Exclude 'Page X of Y' footer which sits around y=800..815
            content_y = [b[3] for b in blocks if b[1] < 795 and "Page " not in b[4]]
            bottoms.append(max(content_y) if content_y else 0.0)
    return page_count, bottoms


def _apply_watercolor_logo_watermark(pdf_bytes: bytes) -> bytes:
    """
    Places the Alpha Result watercolor logo watermark in the center of every page
    with overlay=False (strictly behind all text and lines) so readability is 100% unaffected.
    """
    if not os.path.exists(WATERMARK_LOGO_PATH):
        return pdf_bytes

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            rect = page.rect
            logo_w = 270.0
            logo_h = 220.0
            x0 = (rect.width - logo_w) / 2.0
            y0 = (rect.height - logo_h) / 2.0
            logo_rect = fitz.Rect(x0, y0, x0 + logo_w, y0 + logo_h)
            page.insert_image(
                logo_rect,
                filename=WATERMARK_LOGO_PATH,
                overlay=False,
                keep_proportion=True,
            )
        out = BytesIO()
        doc.save(out)
        return out.getvalue()


def generate_university_paper_pdf_bytes(
    paper: dict,
    subject: dict | None = None,
    with_watermark: bool = True,
) -> bytes:
    """
    Generates the Bihar Engineering University format question paper PDF in memory.
    1. Finds the largest font scale that fits within 2 pages.
    2. Uses fixed authentic BEU inter-question spacing (~9pt between main questions,
       0.3pt padding between sub-questions (a)/(b)) matching the original BEU paper.
    3. Optionally embeds the Alpha Result watercolor logo watermark behind the text on each page.
    """
    scale_attempts = [
        (1.00, 8.0, 9.0, 0.3),
        (0.97, 6.5, 7.5, 0.3),
        (0.94, 5.5, 6.0, 0.2),
        (0.91, 4.5, 5.0, 0.2),
        (0.88, 3.5, 4.0, 0.2),
    ]

    pdf_bytes = b""

    for font_scale, g1, g2, sub_pad in scale_attempts:
        candidate = _build_pdf_with_params(
            paper,
            subject,
            scale=font_scale,
            p1_gap=g1,
            p2_gap=g2,
            p2_sub_pad=sub_pad,
        )
        page_count, _ = _measure_page_bottoms(candidate)
        pdf_bytes = candidate
        if page_count <= 2:
            break

    if with_watermark:
        return _apply_watercolor_logo_watermark(pdf_bytes)
    return pdf_bytes

