from fastapi import APIRouter, Depends, Query, UploadFile, File
from app.auth.dependencies import admin_required
from app.auth.utils import get_current_admin
from app.admin.blog.models import BlogCreate, BlogUpdate
from app.admin.blog.controllers import (
    create_blog,
    list_admin_blogs,
    get_admin_blog,
    update_blog,
    delete_blog,
    get_blog_revisions,
    restore_blog_revision,
    upload_blog_image,
)

router = APIRouter(tags=["Admin Blog"])

@router.post("/upload-image", dependencies=[Depends(admin_required)])
async def upload_image(file: UploadFile = File(...)):
    return await upload_blog_image(file)

@router.post("", dependencies=[Depends(admin_required)])
async def add_blog(body: BlogCreate, admin: dict = Depends(get_current_admin)):
    return await create_blog(body.dict(), admin)

@router.get("", dependencies=[Depends(admin_required)])
async def get_blogs(
    category: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    return await list_admin_blogs(category=category, status=status, search=search, page=page, limit=limit)

@router.get("/{blog_id}", dependencies=[Depends(admin_required)])
async def get_single_blog(blog_id: str):
    return await get_admin_blog(blog_id)

@router.put("/{blog_id}", dependencies=[Depends(admin_required)])
async def edit_blog(blog_id: str, body: BlogUpdate, admin: dict = Depends(get_current_admin)):
    return await update_blog(blog_id, body.dict(exclude_unset=True), admin)

@router.delete("/{blog_id}", dependencies=[Depends(admin_required)])
async def remove_blog(blog_id: str):
    return await delete_blog(blog_id)

@router.get("/{blog_id}/revisions", dependencies=[Depends(admin_required)])
async def list_revisions(blog_id: str):
    return await get_blog_revisions(blog_id)

@router.post("/{blog_id}/revisions/{version}/restore", dependencies=[Depends(admin_required)])
async def rollback_revision(blog_id: str, version: int, admin: dict = Depends(get_current_admin)):
    return await restore_blog_revision(blog_id, version, admin)
