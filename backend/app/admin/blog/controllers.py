import re
import uuid
from bson import ObjectId
from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json
from app.utils.datetime import utcnow
from app.utils.cloudinary_config import upload_solution_image
from fastapi import HTTPException, UploadFile

def slugify(text: str) -> str:
    """Converts a string to a URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "post"

async def get_unique_slug(base_slug: str, exclude_id: ObjectId = None) -> str:
    """Ensures slug uniqueness in db.blogs."""
    slug = base_slug
    counter = 1
    while True:
        query = {"slug": slug}
        if exclude_id:
            query["_id"] = {"$ne": exclude_id}
        existing = await db_instance.db.blogs.find_one(query)
        if not existing:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1

async def upload_blog_image(file: UploadFile):
    """Uploads an image from local device to Cloudinary."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")

    public_id = f"blog_img_{uuid.uuid4().hex[:12]}"
    res = await upload_solution_image(file_bytes, public_id)

    if not res.get("success") or not res.get("image_url"):
        raise HTTPException(
            status_code=500,
            detail=res.get("error") or "Failed to upload image to Cloudinary"
        )

    return {"success": True, "url": res["image_url"], "public_id": res.get("public_id")}

async def create_blog(body: dict, admin: dict):
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    custom_slug = body.get("slug", "").strip()
    base_slug = slugify(custom_slug) if custom_slug else slugify(title)
    final_slug = await get_unique_slug(base_slug)

    admin_name = admin.get("name") or admin.get("email") or "Admin"
    admin_id = str(admin.get("user_id") or admin.get("admin_userid") or "")
    now = utcnow()
    status = body.get("status", "published")

    doc = {
        "title": title,
        "slug": final_slug,
        "excerpt": body.get("excerpt", "").strip(),
        "content": body.get("content", ""),
        "cover_image": body.get("cover_image", "").strip(),
        "category": body.get("category", "General"),
        "tags": body.get("tags", []),
        "status": status,
        "sub_topics": body.get("sub_topics", []),
        "tables": body.get("tables", []),
        "alert_box": body.get("alert_box"),
        "blocks": body.get("blocks", []),
        "version": 1,
        "views": 0,
        "created_by": admin_name,
        "created_by_id": admin_id,
        "updated_by": admin_name,
        "updated_by_id": admin_id,
        "created_at": now,
        "updated_at": now,
        "published_at": now if status == "published" else None,
    }

    result = await db_instance.db.blogs.insert_one(doc)
    blog_id = str(result.inserted_id)
    doc["_id"] = result.inserted_id

    # Create Initial Revision Record
    revision_doc = {
        "blog_id": blog_id,
        "version": 1,
        "snapshot": {
            "title": doc["title"],
            "slug": doc["slug"],
            "excerpt": doc["excerpt"],
            "content": doc["content"],
            "cover_image": doc["cover_image"],
            "category": doc["category"],
            "tags": doc["tags"],
            "status": doc["status"],
            "sub_topics": doc["sub_topics"],
            "tables": doc["tables"],
            "alert_box": doc["alert_box"],
            "blocks": doc["blocks"],
        },
        "updated_by": admin_name,
        "updated_by_id": admin_id,
        "change_summary": "Initial post published" if status == "published" else "Initial draft created",
        "created_at": now,
    }
    await db_instance.db.blog_revisions.insert_one(revision_doc)

    return {"success": True, "data": mongo_to_json(doc)}

async def list_admin_blogs(category: str = None, status: str = None, search: str = None, page: int = 1, limit: int = 20):
    query = {}
    if category and category != "All":
        query["category"] = category
    if status and status != "All":
        query["status"] = status
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"slug": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db_instance.db.blogs.count_documents(query)
    items = await db_instance.db.blogs.find(query).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "success": True,
        "data": mongo_to_json(items),
        "total": total,
        "page": page,
        "limit": limit,
    }

async def get_admin_blog(blog_id: str):
    try:
        obj_id = ObjectId(blog_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Blog ID")

    blog = await db_instance.db.blogs.find_one({"_id": obj_id})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    return {"success": True, "data": mongo_to_json(blog)}

async def update_blog(blog_id: str, body: dict, admin: dict):
    try:
        obj_id = ObjectId(blog_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Blog ID")

    existing = await db_instance.db.blogs.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")

    title = body.get("title", existing.get("title")).strip()
    custom_slug = body.get("slug", existing.get("slug")).strip()
    base_slug = slugify(custom_slug) if custom_slug else slugify(title)
    final_slug = await get_unique_slug(base_slug, exclude_id=obj_id)

    new_version = existing.get("version", 1) + 1
    admin_name = admin.get("name") or admin.get("email") or "Admin"
    admin_id = str(admin.get("user_id") or admin.get("admin_userid") or "")
    now = utcnow()
    new_status = body.get("status", existing.get("status", "published"))

    update_fields = {
        "title": title,
        "slug": final_slug,
        "excerpt": body.get("excerpt", existing.get("excerpt", "")).strip(),
        "content": body.get("content", existing.get("content", "")),
        "cover_image": body.get("cover_image", existing.get("cover_image", "")).strip(),
        "category": body.get("category", existing.get("category", "General")),
        "tags": body.get("tags", existing.get("tags", [])),
        "status": new_status,
        "sub_topics": body.get("sub_topics", existing.get("sub_topics", [])),
        "tables": body.get("tables", existing.get("tables", [])),
        "alert_box": body.get("alert_box", existing.get("alert_box")),
        "blocks": body.get("blocks", existing.get("blocks", [])),
        "version": new_version,
        "updated_by": admin_name,
        "updated_by_id": admin_id,
        "updated_at": now,
    }

    if new_status == "published" and not existing.get("published_at"):
        update_fields["published_at"] = now

    await db_instance.db.blogs.update_one({"_id": obj_id}, {"$set": update_fields})

    # Save revision snapshot
    change_summary = body.get("change_summary", "").strip() or f"Updated post to version {new_version}"
    revision_doc = {
        "blog_id": blog_id,
        "version": new_version,
        "snapshot": {
            "title": update_fields["title"],
            "slug": update_fields["slug"],
            "excerpt": update_fields["excerpt"],
            "content": update_fields["content"],
            "cover_image": update_fields["cover_image"],
            "category": update_fields["category"],
            "tags": update_fields["tags"],
            "status": update_fields["status"],
            "sub_topics": update_fields["sub_topics"],
            "tables": update_fields["tables"],
            "alert_box": update_fields["alert_box"],
            "blocks": update_fields["blocks"],
        },
        "updated_by": admin_name,
        "updated_by_id": admin_id,
        "change_summary": change_summary,
        "created_at": now,
    }
    await db_instance.db.blog_revisions.insert_one(revision_doc)

    return {"success": True, "version": new_version, "data": mongo_to_json(update_fields)}

async def delete_blog(blog_id: str):
    try:
        obj_id = ObjectId(blog_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Blog ID")

    res = await db_instance.db.blogs.delete_one({"_id": obj_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")

    # Clean up revision history
    await db_instance.db.blog_revisions.delete_many({"blog_id": blog_id})

    return {"success": True, "message": "Blog and revision history deleted"}

async def get_blog_revisions(blog_id: str):
    revisions = await db_instance.db.blog_revisions.find(
        {"blog_id": blog_id}
    ).sort("version", -1).to_list(100)

    return {"success": True, "data": mongo_to_json(revisions)}

async def restore_blog_revision(blog_id: str, version: int, admin: dict):
    try:
        obj_id = ObjectId(blog_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Blog ID")

    existing = await db_instance.db.blogs.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Blog not found")

    rev = await db_instance.db.blog_revisions.find_one({
        "blog_id": blog_id,
        "version": version
    })
    if not rev:
        raise HTTPException(status_code=404, detail=f"Revision version {version} not found")

    snapshot = rev.get("snapshot", {})
    new_version = existing.get("version", 1) + 1
    admin_name = admin.get("name") or admin.get("email") or "Admin"
    admin_id = str(admin.get("user_id") or admin.get("admin_userid") or "")
    now = utcnow()

    update_fields = {
        "title": snapshot.get("title", existing.get("title")),
        "slug": snapshot.get("slug", existing.get("slug")),
        "excerpt": snapshot.get("excerpt", existing.get("excerpt")),
        "content": snapshot.get("content", existing.get("content")),
        "cover_image": snapshot.get("cover_image", existing.get("cover_image")),
        "category": snapshot.get("category", existing.get("category")),
        "tags": snapshot.get("tags", existing.get("tags")),
        "status": snapshot.get("status", existing.get("status")),
        "sub_topics": snapshot.get("sub_topics", existing.get("sub_topics")),
        "tables": snapshot.get("tables", existing.get("tables")),
        "alert_box": snapshot.get("alert_box", existing.get("alert_box")),
        "blocks": snapshot.get("blocks", existing.get("blocks", [])),
        "version": new_version,
        "updated_by": admin_name,
        "updated_by_id": admin_id,
        "updated_at": now,
    }

    await db_instance.db.blogs.update_one({"_id": obj_id}, {"$set": update_fields})

    # Record the restoration as a new version
    restore_revision_doc = {
        "blog_id": blog_id,
        "version": new_version,
        "snapshot": snapshot,
        "updated_by": admin_name,
        "updated_by_id": admin_id,
        "change_summary": f"Restored from Version {version}",
        "created_at": now,
    }
    await db_instance.db.blog_revisions.insert_one(restore_revision_doc)

    return {
        "success": True,
        "message": f"Successfully rolled back to Version {version}",
        "new_version": new_version,
        "data": mongo_to_json(update_fields),
    }
