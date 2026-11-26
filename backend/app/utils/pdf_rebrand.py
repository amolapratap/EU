"""
PDF Watermark/Branding Removal & Alpha Result Rebranding Utility.

Removes third-party watermarks (links, annotations, repeated/overlay images,
diagonal/faint watermark text, header/footer promo URLs, and custom phrases)
and applies clean Alpha Result branding without obscuring page content.
"""

from __future__ import annotations

import hashlib
import io
import os
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable

import fitz  # PyMuPDF
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
OFFICIAL_ICON_PATH = os.path.join(ASSETS_DIR, "alpha_result_logo.jpg")
WATERMARK_LOGO_PATH = os.path.join(ASSETS_DIR, "ar_logo_bg-free.png")

DEFAULT_APP_URL = "https://alpharesult.in/app?s=frompdf"
HEADER_SAFE_HEIGHT = 44.0
FOOTER_SAFE_HEIGHT = 54.0

# Common third-party watermark / promo patterns in headers/footers or overlays
MARGIN_URL_REGEX = re.compile(
    r"(https?://\S+|www\.\S+|\b\S+\.(?:com|in|org|net|edu|io)\b)",
    re.IGNORECASE,
)
STRONG_PROMO_REGEX = re.compile(
    r"(downloaded\s+from|join\s+(?:official\s+)?(?:whatsapp|telegram)|"
    r"click\s+to\s+join|follow\s+us\s+on|powered\s+by)",
    re.IGNORECASE,
)


@dataclass
class RebrandOptions:
    remove_links: bool = True
    remove_annotations: bool = True
    remove_watermark_images: bool = True
    remove_all_images: bool = False
    remove_text_watermarks: bool = True
    custom_remove_texts: tuple[str, ...] = ()
    add_watermark: bool = True
    watermark_opacity: float = 0.22
    add_header: bool = True
    add_footer_banner: bool = True
    app_url: str = DEFAULT_APP_URL


@dataclass
class RebrandStats:
    page_count: int = 0
    removed_links: int = 0
    removed_annotations: int = 0
    removed_images: int = 0
    removed_text_matches: int = 0


@lru_cache(maxsize=4)
def _get_rounded_icon_bytes(size: int = 256) -> bytes:
    """Loads the official Alpha Result square logo with rounded corners."""
    icon = Image.open(OFFICIAL_ICON_PATH).convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    radius = max(8, int(size * 0.17))
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    icon.putalpha(mask)
    buf = io.BytesIO()
    icon.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@lru_cache(maxsize=8)
def _get_watermark_bytes(opacity_pct: int = 22) -> bytes:
    """Loads the transparent Alpha Result logo scaled to the requested opacity (1-100)."""
    opacity = max(0.03, min(0.85, opacity_pct / 100.0))
    wm = Image.open(WATERMARK_LOGO_PATH).convert("RGBA").resize((700, 700), Image.LANCZOS)
    r, g, b, a = wm.split()
    a = a.point(lambda p: int(p * opacity))
    wm = Image.merge("RGBA", (r, g, b, a))
    buf = io.BytesIO()
    wm.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _page_has_vector_or_text(page: fitz.Page) -> bool:
    """Returns True if the page contains selectable text or substantial vector paths."""
    if page.get_text("text").strip():
        return True
    return len(page.get_drawings()) >= 15


def _strip_image_from_page(doc: fitz.Document, page: fitz.Page, img_name: str) -> bool:
    """Removes `/<img_name> Do` from page content streams and unlinks it from /XObject."""
    removed = False
    pattern = re.compile(
        rf"q\s+[\d\.\-\s]+cm\s+/{re.escape(img_name)}\s+Do\s+Q"
    )
    standalone = re.compile(rf"/{re.escape(img_name)}\s+Do\b")

    for cx in page.get_contents():
        raw = doc.xref_stream(cx).decode("latin1", errors="ignore")
        if f"/{img_name}" not in raw:
            continue
        new_raw = pattern.sub("", raw)
        if standalone.search(new_raw):
            new_raw = standalone.sub("", new_raw)
        if new_raw != raw:
            doc.update_stream(cx, new_raw.encode("latin1"))
            removed = True

    # Remove the image key from the page's /Resources/XObject dictionary
    res_type, res_val = doc.xref_get_key(page.xref, "Resources")
    if res_type == "xref":
        res_xref = int(res_val.split()[0])
        xobj_type, xobj_val = doc.xref_get_key(res_xref, "XObject")
        if xobj_type == "xref":
            xobj_xref = int(xobj_val.split()[0])
            doc.xref_set_key(xobj_xref, img_name, "null")
        elif xobj_type == "dict":
            doc.xref_set_key(res_xref, f"XObject/{img_name}", "null")
    else:
        doc.xref_set_key(page.xref, f"Resources/XObject/{img_name}", "null")

    return removed


def _collect_image_digests(doc: fitz.Document) -> tuple[Counter[str], dict[int, str]]:
    """Counts how many pages each image digest appears on."""
    page_counts: Counter[str] = Counter()
    xref_digest: dict[int, str] = {}

    for page in doc:
        seen_on_page: set[str] = set()
        for img in page.get_images(full=True):
            xref = img[0]
            if xref not in xref_digest:
                try:
                    stream = doc.xref_stream(xref)
                    xref_digest[xref] = hashlib.md5(stream).hexdigest()
                except Exception:
                    xref_digest[xref] = f"xref:{xref}"
            digest = xref_digest[xref]
            if digest not in seen_on_page:
                seen_on_page.add(digest)
                page_counts[digest] += 1

    return page_counts, xref_digest


def _remove_branding_images(
    doc: fitz.Document,
    remove_watermark_images: bool,
    remove_all_images: bool,
) -> int:
    if not remove_watermark_images and not remove_all_images:
        return 0

    total_pages = len(doc)
    digest_counts, xref_digest = _collect_image_digests(doc)
    removed_count = 0

    for page in doc:
        has_content = _page_has_vector_or_text(page)
        page_area = max(1.0, page.rect.width * page.rect.height)
        imgs = page.get_images(full=True)
        seen_names: set[str] = set()

        for img in imgs:
            xref, img_name = img[0], img[7]
            if not img_name or img_name in seen_names:
                continue

            should_remove = False
            if remove_all_images and has_content:
                should_remove = True
            elif remove_watermark_images:
                digest = xref_digest.get(xref, f"xref:{xref}")
                repeated = total_pages > 1 and digest_counts[digest] >= max(2, total_pages // 2)

                # Check rendered coverage on the page
                rects = page.get_image_rects(xref)
                max_coverage = max(
                    ((r.width * r.height) / page_area for r in rects),
                    default=0.0,
                )
                large_bg_overlay = has_content and max_coverage >= 0.55

                if repeated or large_bg_overlay:
                    # Never delete the sole image of a pure scanned page
                    if has_content or len(imgs) > 1:
                        should_remove = True

            if should_remove:
                if _strip_image_from_page(doc, page, img_name):
                    seen_names.add(img_name)
                    removed_count += 1
                else:
                    # Fallback for images nested inside Form XObjects
                    try:
                        page.delete_image(xref)
                        seen_names.add(img_name)
                        removed_count += 1
                    except Exception:
                        pass

    return removed_count


def _is_faint_color(color_int: int) -> bool:
    """Checks if an sRGB integer color is very light/pale (typical watermark text)."""
    r = ((color_int >> 16) & 0xFF) / 255.0
    g = ((color_int >> 8) & 0xFF) / 255.0
    b = (color_int & 0xFF) / 255.0
    return min(r, g, b) >= 0.62


def _remove_text_watermarks_from_page(
    page: fitz.Page,
    remove_text_watermarks: bool,
    custom_terms: Iterable[str],
) -> int:
    rects_to_redact: list[fitz.Rect] = []
    h = page.rect.height

    if remove_text_watermarks:
        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                dx, dy = line.get("dir", (1.0, 0.0))
                is_diagonal = abs(dx) < 0.98 and abs(dy) < 0.98
                line_text = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
                line_bbox = fitz.Rect(line["bbox"])
                in_margin = line_bbox.y0 <= h * 0.10 or line_bbox.y1 >= h * 0.90

                if is_diagonal:
                    rects_to_redact.append(line_bbox)
                    continue

                if line_text and STRONG_PROMO_REGEX.search(line_text):
                    rects_to_redact.append(line_bbox)
                    continue

                if in_margin and line_text and MARGIN_URL_REGEX.search(line_text):
                    rects_to_redact.append(line_bbox)
                    continue

                for span in line.get("spans", []):
                    size = span.get("size", 0.0)
                    color = span.get("color", 0)
                    if size >= 22 and _is_faint_color(color) and span.get("text", "").strip():
                        rects_to_redact.append(fitz.Rect(span["bbox"]))

    for term in custom_terms:
        cleaned = term.strip()
        if not cleaned:
            continue
        rects_to_redact.extend(page.search_for(cleaned))

    if not rects_to_redact:
        return 0

    for rect in rects_to_redact:
        page.add_redact_annot(rect, fill=False)

    page.apply_redactions(
        images=fitz.PDF_REDACT_IMAGE_NONE,
        graphics=fitz.PDF_REDACT_LINE_ART_NONE,
    )
    return len(rects_to_redact)


def _is_link_blue_fill(fill: tuple[float, ...] | None) -> bool:
    if not fill or len(fill) != 3:
        return False
    r, g, b = fill
    return b >= 0.60 and r <= 0.25 and g <= 0.55


def _remove_vector_hyperlinks_and_promo_lines(
    doc: fitz.Document,
    page: fitz.Page,
    remove_links: bool,
    remove_text_watermarks: bool,
) -> tuple[int, int]:
    """
    Handles PDFs flattened to vector paths (e.g. Microsoft Print To PDF):
    - Detects blue-underlined vector link runs.
    - Non-table paragraph lines ending in a blue CTA link (e.g. 'Join Official WhatsApp...: Click to Join')
      are removed entirely when `remove_text_watermarks` is enabled.
    - In-table / standalone blue-underlined links (e.g. 'Internship- II') have their underline stripped
      and text recolored to black when `remove_links` is enabled.
    """
    if not remove_links and not remove_text_watermarks:
        return 0, 0

    drawings = page.get_drawings()
    if not drawings:
        return 0, 0

    redact_rects: list[fitz.Rect] = []
    blue_colors_to_black: set[tuple[float, float, float]] = set()
    removed_vec_links = 0
    removed_vec_promos = 0

    for d in drawings:
        fill = d.get("fill")
        r = d["rect"]
        if not _is_link_blue_fill(fill) or r.height > 3.5 or r.width < 12.0:
            continue

        band_y0 = r.y0 - 14.0
        band_y1 = r.y1 + 2.0

        blue_glyphs_above = [
            x["rect"]
            for x in drawings
            if x.get("fill") == fill
            and x["rect"].height <= 18.0
            and x["rect"].width <= 30.0
            and x["rect"].y1 >= band_y0
            and x["rect"].y0 <= band_y1
            and x["rect"].x0 >= r.x0 - 4.0
            and x["rect"].x1 <= r.x1 + 4.0
        ]
        if len(blue_glyphs_above) < 3:
            continue

        preceding_black = [
            x["rect"]
            for x in drawings
            if x.get("fill") == (0.0, 0.0, 0.0)
            and x["rect"].height <= 18.0
            and x["rect"].width <= 30.0
            and x["rect"].y1 >= band_y0
            and x["rect"].y0 <= band_y1
            and x["rect"].x1 <= r.x0 + 2.0
        ]
        table_lines = [
            x["rect"]
            for x in drawings
            if (x["rect"].width >= 150.0 and x["rect"].height <= 2.5 and abs(x["rect"].y0 - r.y0) <= 20.0)
            or (x["rect"].height >= 60.0 and x["rect"].width <= 2.5 and x["rect"].y0 <= r.y0 <= x["rect"].y1)
        ]

        is_promo_cta_line = len(table_lines) == 0 and len(preceding_black) >= 12
        if is_promo_cta_line and remove_text_watermarks:
            line_parts = preceding_black + blue_glyphs_above + [r]
            redact_rects.append(
                fitz.Rect(
                    min(rr.x0 for rr in line_parts) - 1.0,
                    min(rr.y0 for rr in line_parts) - 1.0,
                    max(rr.x1 for rr in line_parts) + 1.0,
                    max(rr.y1 for rr in line_parts) + 1.0,
                )
            )
            removed_vec_promos += 1
        elif remove_links:
            redact_rects.append(
                fitz.Rect(r.x0 - 0.5, r.y0 - 0.5, r.x1 + 0.5, r.y1 + 0.5)
            )
            blue_colors_to_black.add((float(fill[0]), float(fill[1]), float(fill[2])))
            removed_vec_links += 1

    if redact_rects:
        for rect in redact_rects:
            page.add_redact_annot(rect, fill=False)
        page.apply_redactions(
            images=fitz.PDF_REDACT_IMAGE_NONE,
            graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED,
        )

    if blue_colors_to_black:
        def _recolor_rg(match: re.Match[str]) -> str:
            rv, gv, bv = float(match.group(1)), float(match.group(2)), float(match.group(3))
            for cr, cg, cb in blue_colors_to_black:
                if abs(rv - cr) < 0.02 and abs(gv - cg) < 0.02 and abs(bv - cb) < 0.02:
                    return "0.000000 0.000000 0.000000 rg"
            return match.group(0)

        for cx in page.get_contents():
            raw = doc.xref_stream(cx).decode("latin1", errors="ignore")
            new_raw = re.sub(r"([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+rg", _recolor_rg, raw)
            if new_raw != raw:
                doc.update_stream(cx, new_raw.encode("latin1"))

    return removed_vec_links, removed_vec_promos


def _content_y_bounds(page: fitz.Page) -> tuple[float, float]:
    """Estimates the top-most and bottom-most visible content Y coordinates."""
    w, h = page.rect.width, page.rect.height
    y_mins: list[float] = []
    y_maxs: list[float] = []

    for block in page.get_text("blocks"):
        if len(block) >= 5 and str(block[4]).strip():
            y_mins.append(float(block[1]))
            y_maxs.append(float(block[3]))

    for d in page.get_drawings():
        r = d["rect"]
        # Ignore full-page clip/background rectangles
        if r.width >= w * 0.92 and r.height >= h * 0.92:
            continue
        if r.height <= 0.1 and r.width <= 0.1:
            continue
        y_mins.append(r.y0)
        y_maxs.append(r.y1)

    for img in page.get_images(full=True):
        for r in page.get_image_rects(img[0]):
            if r.width >= w * 0.95 and r.height >= h * 0.95:
                return 0.0, h
            y_mins.append(r.y0)
            y_maxs.append(r.y1)

    if not y_mins:
        return h * 0.15, h * 0.85
    return min(y_mins), max(y_maxs)


def _draw_alpha_branding_on_page(
    page: fitz.Page,
    options: RebrandOptions,
    is_scanned: bool,
    icon_bytes: bytes,
    wm_bytes: bytes,
) -> None:
    w, h = page.rect.width, page.rect.height
    app_url = (options.app_url or DEFAULT_APP_URL).strip() or DEFAULT_APP_URL

    # 1. Center Watermark
    if options.add_watermark:
        wm_size = min(w, h) * 0.58
        wm_rect = fitz.Rect(
            (w - wm_size) / 2.0,
            (h - wm_size) / 2.0,
            (w + wm_size) / 2.0,
            (h + wm_size) / 2.0,
        )
        # For vector/text pages draw underneath so reading is never affected;
        # for opaque scanned pages draw softly over the image.
        page.insert_image(
            wm_rect,
            stream=wm_bytes,
            keep_proportion=True,
            overlay=is_scanned,
        )

    margin_x = max(24.0, min(40.0, w * 0.067))

    # 2. Top Brand Header Strip
    if options.add_header:
        hdr_rect = fitz.Rect(margin_x, 12.0, w - margin_x, 38.0)
        page.insert_image(
            fitz.Rect(margin_x, 14.0, margin_x + 22.0, 36.0),
            stream=icon_bytes,
            keep_proportion=True,
            overlay=True,
        )
        page.insert_text(
            (margin_x + 28.0, 28.0),
            "Alpha Result",
            fontsize=9.5,
            fontname="helv",
            color=(0.04, 0.11, 0.29),
            overlay=True,
        )
        if w >= 420:
            page.insert_text(
                (margin_x + 92.0, 28.0),
                "|  Official Study App for Engineering Students",
                fontsize=8.0,
                fontname="helv",
                color=(0.35, 0.42, 0.52),
                overlay=True,
            )
        cta_top = "Install Alpha Result App  >"
        cta_w = fitz.get_text_length(cta_top, fontname="helv", fontsize=8.5)
        page.insert_text(
            (w - margin_x - cta_w, 28.0),
            cta_top,
            fontsize=8.5,
            fontname="helv",
            color=(0.11, 0.31, 0.85),
            overlay=True,
        )
        page.draw_line(
            fitz.Point(margin_x, 39.0),
            fitz.Point(w - margin_x, 39.0),
            color=(0.85, 0.89, 0.95),
            width=0.7,
            overlay=True,
        )
        page.insert_link({"kind": fitz.LINK_URI, "from": hdr_rect, "uri": app_url})

    # 3. Bottom App-Install Banner
    if options.add_footer_banner:
        card_top = h - 49.0
        card_bottom = h - 11.0
        card_rect = fitz.Rect(margin_x, card_top, w - margin_x, card_bottom)
        page.draw_rect(
            card_rect,
            color=(0.75, 0.83, 0.98),
            fill=(0.94, 0.96, 1.0),
            width=0.8,
            radius=0.15,
            overlay=True,
        )
        page.insert_image(
            fitz.Rect(margin_x + 8.0, card_top + 4.0, margin_x + 38.0, card_top + 34.0),
            stream=icon_bytes,
            keep_proportion=True,
            overlay=True,
        )
        page.insert_text(
            (margin_x + 46.0, card_top + 16.0),
            "Get the Alpha Result App",
            fontsize=10.5,
            fontname="hebo",
            color=(0.04, 0.11, 0.29),
            overlay=True,
        )

        subtitle = "Syllabus, PYQs, Solutions, Quiz, Attendance Tracker, CGPA Calculator & Results"
        btn_width = 100.0
        max_sub_w = (w - margin_x - btn_width - 14.0) - (margin_x + 46.0)
        sub_fs = 7.8
        while sub_fs > 5.8 and fitz.get_text_length(subtitle, fontname="helv", fontsize=sub_fs) > max_sub_w:
            sub_fs -= 0.4

        page.insert_text(
            (margin_x + 46.0, card_top + 29.0),
            subtitle,
            fontsize=sub_fs,
            fontname="helv",
            color=(0.25, 0.33, 0.45),
            overlay=True,
        )

        btn_rect = fitz.Rect(w - margin_x - btn_width - 8.0, card_top + 7.0, w - margin_x - 8.0, card_bottom - 7.0)
        page.draw_rect(
            btn_rect,
            color=None,
            fill=(0.07, 0.25, 0.68),
            radius=0.25,
            overlay=True,
        )
        btn_txt = "Install App"
        btn_tw = fitz.get_text_length(btn_txt, fontname="hebo", fontsize=9.5)
        page.insert_text(
            (btn_rect.x0 + (btn_rect.width - btn_tw) / 2.0, card_top + 22.5),
            btn_txt,
            fontsize=9.5,
            fontname="hebo",
            color=(1, 1, 1),
            overlay=True,
        )
        page.insert_link({"kind": fitz.LINK_URI, "from": card_rect, "uri": app_url})


def rebrand_pdf_bytes(file_bytes: bytes, options: RebrandOptions | None = None) -> tuple[bytes, RebrandStats]:
    """
    Cleans third-party branding/watermarks from a PDF and applies Alpha Result branding.
    Returns `(output_pdf_bytes, RebrandStats)`.
    """
    opts = options or RebrandOptions()
    stats = RebrandStats()

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    stats.page_count = len(doc)

    # Step 1: Remove links, annotations, and text watermarks
    for page in doc:
        if opts.remove_links:
            for link in list(page.get_links()):
                page.delete_link(link)
                stats.removed_links += 1

        if opts.remove_annotations:
            for annot in list(page.annots() or []):
                page.delete_annot(annot)
                stats.removed_annotations += 1

        if opts.remove_text_watermarks or opts.custom_remove_texts:
            stats.removed_text_matches += _remove_text_watermarks_from_page(
                page,
                opts.remove_text_watermarks,
                opts.custom_remove_texts,
            )

        vec_links, vec_promos = _remove_vector_hyperlinks_and_promo_lines(
            doc,
            page,
            remove_links=opts.remove_links,
            remove_text_watermarks=opts.remove_text_watermarks,
        )
        stats.removed_links += vec_links
        stats.removed_text_matches += vec_promos

    # Step 2: Remove watermark / repeated / overlay images
    stats.removed_images = _remove_branding_images(
        doc,
        remove_watermark_images=opts.remove_watermark_images,
        remove_all_images=opts.remove_all_images,
    )

    # Normalize cleaned PDF first so any margin-refitting sees clean bounds
    cleaned_buf = io.BytesIO()
    doc.save(cleaned_buf, garbage=4, deflate=True)
    doc.close()

    # Step 3: Apply Alpha Result branding without overlapping content
    needs_branding = opts.add_watermark or opts.add_header or opts.add_footer_banner
    if not needs_branding:
        return cleaned_buf.getvalue(), stats

    src_doc = fitz.open(stream=cleaned_buf.getvalue(), filetype="pdf")
    out_doc = fitz.open()
    icon_bytes = _get_rounded_icon_bytes(256)
    opacity_pct = max(5, min(60, int(round(opts.watermark_opacity * 100))))
    wm_bytes = _get_watermark_bytes(opacity_pct)

    for idx, src_page in enumerate(src_doc):
        w, h = src_page.rect.width, src_page.rect.height
        is_scanned = not _page_has_vector_or_text(src_page)
        min_y, max_y = _content_y_bounds(src_page)

        req_top = HEADER_SAFE_HEIGHT if opts.add_header else 0.0
        req_bottom = FOOTER_SAFE_HEIGHT if opts.add_footer_banner else 0.0
        needs_refit = (opts.add_header and min_y < req_top) or (opts.add_footer_banner and max_y > h - req_bottom)

        if needs_refit and h > (req_top + req_bottom + 120.0):
            new_page = out_doc.new_page(width=w, height=h)
            target_rect = fitz.Rect(0.0, req_top, w, h - req_bottom)
            new_page.show_pdf_page(target_rect, src_doc, idx, keep_proportion=True)
            _draw_alpha_branding_on_page(new_page, opts, is_scanned, icon_bytes, wm_bytes)
        else:
            out_doc.insert_pdf(src_doc, from_page=idx, to_page=idx)
            new_page = out_doc[-1]
            _draw_alpha_branding_on_page(new_page, opts, is_scanned, icon_bytes, wm_bytes)

    out_doc.set_metadata(
        {
            "title": src_doc.metadata.get("title") or "",
            "author": "",
            "subject": "",
            "keywords": "",
            "creator": "Alpha Result",
            "producer": "Alpha Result PDF",
        }
    )

    out_buf = io.BytesIO()
    out_doc.save(out_buf, garbage=4, deflate=True)
    src_doc.close()
    out_doc.close()
    return out_buf.getvalue(), stats
