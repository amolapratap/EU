from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.database import db_instance
from app.utils.mongo_serializer import mongo_to_json

router = APIRouter(tags=["Public Blog"])

@router.get("")
async def get_published_blogs(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    query = {"status": "published"}
    if category and category.lower() != "all":
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db_instance.db.blogs.count_documents(query)
    
    # Projection for public list - hides views and admin usernames
    cursor = db_instance.db.blogs.find(
        query,
        {
            "title": 1,
            "slug": 1,
            "excerpt": 1,
            "cover_image": 1,
            "category": 1,
            "tags": 1,
            "published_at": 1,
            "created_at": 1,
            "updated_at": 1,
        }
    ).sort("published_at", -1).skip(skip).limit(limit)

    blogs = await cursor.to_list(limit)

    return {
        "success": True,
        "data": mongo_to_json(blogs),
        "total": total,
        "page": page,
        "limit": limit,
    }

@router.get("/categories")
async def get_blog_categories():
    pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    results = await db_instance.db.blogs.aggregate(pipeline).to_list(20)
    categories = [{"name": r["_id"] or "General", "count": r["count"]} for r in results]
    return {"success": True, "data": categories}

@router.get("/{slug}")
async def get_blog_by_slug(slug: str):
    blog = await db_instance.db.blogs.find_one({
        "slug": slug,
        "status": "published"
    })

    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found")

    # Increment view count in background (for admin analytics)
    await db_instance.db.blogs.update_one(
        {"_id": blog["_id"]},
        {"$inc": {"views": 1}}
    )

    # Sanitize private admin fields for public consumption
    blog.pop("created_by_id", None)
    blog.pop("updated_by_id", None)
    blog.pop("views", None)  # Strictly hidden from students
    blog["created_by"] = "Alpha Result"
    blog["updated_by"] = "Alpha Result"

    # Fetch 3 related posts
    related = await db_instance.db.blogs.find(
        {
            "category": blog.get("category"),
            "slug": {"$ne": slug},
            "status": "published"
        },
        {"title": 1, "slug": 1, "cover_image": 1, "category": 1, "published_at": 1}
    ).sort("published_at", -1).limit(3).to_list(3)

    return {
        "success": True,
        "data": mongo_to_json(blog),
        "related": mongo_to_json(related),
    }
