import io
from typing import List, Tuple, Optional
import fitz  # PyMuPDF
from app.utils.logger import logger


def render_pdf_pages_to_images(
    pdf_bytes: bytes,
    page_numbers: Optional[List[int]] = None,
    scale: float = 2.0  # 2.0 = ~144 DPI (crisp for AI vision, lightweight)
) -> List[Tuple[int, bytes]]:
    """
    Renders selected PDF pages to PNG byte images.
    page_numbers: 1-based list of page numbers (e.g. [1, 2, 3]). If None, renders all pages.
    Returns: [(1-based page_num, png_bytes), ...]
    """
    results = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)
    
    target_pages = page_numbers if page_numbers else list(range(1, total_pages + 1))
    
    matrix = fitz.Matrix(scale, scale)
    for p_num in target_pages:
        if 1 <= p_num <= total_pages:
            page = doc[p_num - 1]
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            results.append((p_num, pix.tobytes("png")))
            
    doc.close()
    return results


def crop_diagram_from_page(
    pdf_bytes: bytes,
    page_num: int,  # 1-based
    ymin: float,
    xmin: float,
    ymax: float,
    xmax: float,
    scale: float = 3.0,  # 3.0 = ~216-300 DPI high-definition crop
    padding: float = 8.0  # points padding around crop box
) -> Optional[bytes]:
    """
    Crops a diagram rectangular region from a given PDF page using normalized (0-1000) coordinates.
    Returns high-resolution PNG bytes of the cropped diagram.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if not (1 <= page_num <= len(doc)):
            doc.close()
            return None
            
        page = doc[page_num - 1]
        p_width = page.rect.width
        p_height = page.rect.height
        
        # Convert normalized 0-1000 coordinates to PDF points
        x0 = max(0.0, (xmin / 1000.0) * p_width - padding)
        y0 = max(0.0, (ymin / 1000.0) * p_height - padding)
        x1 = min(p_width, (xmax / 1000.0) * p_width + padding)
        y1 = min(p_height, (ymax / 1000.0) * p_height + padding)
        
        # Validate crop area
        if x1 <= x0 or y1 <= y0:
            doc.close()
            return None
            
        clip_rect = fitz.Rect(x0, y0, x1, y1)
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(clip=clip_rect, matrix=matrix, alpha=False)
        crop_bytes = pix.tobytes("png")
        doc.close()
        return crop_bytes
    except Exception as e:
        logger.error(f"Error cropping diagram on page {page_num}: {e}")
        return None
