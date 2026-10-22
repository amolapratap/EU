import asyncio
import re
from typing import Optional
import cloudinary
import cloudinary.uploader
from app.config import settings
from app.utils.logger import logger

# Initialize Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)


def clean_path_slug(val, max_len: int = 50) -> str:
    """
    Cleans a string into a URL/path-safe slug for Cloudinary:
    Removes invalid characters, turns whitespace/symbols into single underscores,
    and strips leading/trailing dashes and underscores.
    """
    if not val:
        return ""
    s = str(val).strip()
    if not s:
        return ""
    cleaned = re.sub(r"[^\w\-]+", "_", s)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_-")
    if not cleaned:
        return ""
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len].rstrip("_-")
    return cleaned


def build_question_image_public_id(
    subject_code: str,
    year: str or int,
    q_no: str or int,
    sq_no: str = None,
    img_no: int = 1,
    name: str = None,
    exam_type: str = None,
    paper_type: str = None
) -> str:
    """
    Deterministic path to ensure no duplicates in Cloudinary:
    alpha_result/papers/{subject_code}/{year}[/{name}][/{exam_type}][/{paper_type}]/q_{q_no}[/sub_{sq_no}]/img_{img_no}
    """
    clean_sub = clean_path_slug(subject_code) or "general"
    clean_yr = clean_path_slug(year) or "common"
    clean_q = clean_path_slug(q_no) or "1"
    
    parts = ["papers", clean_sub, clean_yr]
    
    clean_name = clean_path_slug(name)
    if clean_name:
        parts.append(clean_name)
        
    clean_et = clean_path_slug(exam_type)
    if clean_et:
        parts.append(clean_et)
        
    clean_pt = clean_path_slug(paper_type)
    if clean_pt:
        parts.append(clean_pt)
        
    parts.append(f"q_{clean_q}")
    
    if sq_no:
        clean_sq = clean_path_slug(sq_no) or "a"
        parts.append(f"sub_{clean_sq}")
        
    parts.append(f"img_{img_no}")
    return "/".join(parts)


def build_solution_image_public_id(
    subject_code: str,
    year: str or int,
    q_no: str or int,
    sq_no: str = None,
    img_no: int = 1,
    name: str = None,
    exam_type: str = None,
    paper_type: str = None
) -> str:
    """
    Deterministic path for solution visuals/SVGs:
    alpha_result/solutions/{subject_code}/{year}[/{name}][/{exam_type}][/{paper_type}]/q_{q_no}[/sub_{sq_no}]/sol_{img_no}
    """
    clean_sub = clean_path_slug(subject_code) or "general"
    clean_yr = clean_path_slug(year) or "common"
    clean_q = clean_path_slug(q_no) or "1"
    
    parts = ["solutions", clean_sub, clean_yr]
    
    clean_name = clean_path_slug(name)
    if clean_name:
        parts.append(clean_name)
        
    clean_et = clean_path_slug(exam_type)
    if clean_et:
        parts.append(clean_et)
        
    clean_pt = clean_path_slug(paper_type)
    if clean_pt:
        parts.append(clean_pt)
        
    parts.append(f"q_{clean_q}")
    
    if sq_no:
        clean_sq = clean_path_slug(sq_no) or "a"
        parts.append(f"sub_{clean_sq}")
        
    parts.append(f"sol_{img_no}")
    return "/".join(parts)


async def upload_image_buffer(
    file_bytes: bytes,
    public_id: str,
    is_svg: bool = False
) -> dict:
    """
    Uploads or overwrites an image in Cloudinary.
    Using overwrite=True ensures zero duplicate storage when re-cropping or editing.
    """
    try:
        # For SVG or standard images
        upload_params = {
            "folder": "alpha_result",
            "public_id": public_id,
            "overwrite": True,
            "invalidate": True,  # Purges CDN cache so the new image is immediately visible
            "resource_type": "image"
        }
        
        if is_svg:
            upload_params["format"] = "svg"

        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            file_bytes,
            **upload_params
        )

        return {
            "success": True,
            "image_url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "format": result.get("format")
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed for {public_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def delete_image_by_public_id(public_id: str) -> bool:
    """
    Deletes an image from Cloudinary to free storage when a block is removed.
    """
    try:
        res = cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)
        return res.get("result") in ["ok", "not found"]
    except Exception as e:
        logger.error(f"Cloudinary delete failed for {public_id}: {str(e)}")
        return False


async def commit_blocks_images(
    blocks: list,
    subject_code: str,
    year: str or int,
    q_no: str or int,
    sq_no: str = None,
    name: str = None,
    exam_type: str = None,
    paper_type: str = None
) -> list:
    """
    Finds any staged in-memory preview images (starting with 'data:image/') and uploads
    them to Cloudinary at the permanent canonical path upon admin approval.
    Replaces the data URL with the permanent Cloudinary HTTPS URL.
    """
    if not blocks:
        return blocks
    import base64
    committed_blocks = []
    img_counter = 1
    for block in blocks:
        b = dict(block)
        img_url = str(b.get("image_url", ""))
        if b.get("type") == "image" and img_url.startswith("data:image/"):
            try:
                header, encoded = img_url.split(",", 1)
                is_svg = "svg" in header.lower()
                file_bytes = base64.b64decode(encoded)
                pub_id = build_solution_image_public_id(
                    subject_code=subject_code,
                    year=year,
                    q_no=q_no,
                    sq_no=sq_no,
                    img_no=img_counter,
                    name=name,
                    exam_type=exam_type,
                    paper_type=paper_type
                )
                upload_res = await upload_image_buffer(file_bytes, pub_id, is_svg=is_svg)
                if upload_res.get("success"):
                    b["image_url"] = upload_res["image_url"]
                    img_counter += 1
            except Exception as e:
                logger.error(f"Failed to commit preview image to Cloudinary: {e}")
        committed_blocks.append(b)
    return committed_blocks
