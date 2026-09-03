from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class BlogTable(BaseModel):
    title: Optional[str] = ""
    columns: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)

class BlogSubTopic(BaseModel):
    title: str
    description: Optional[str] = ""
    points: Optional[List[str]] = Field(default_factory=list)

class BlogAlertBox(BaseModel):
    type: Optional[str] = "info"  # info | warning | success | alert
    title: Optional[str] = ""
    message: str = ""

class BlogBlock(BaseModel):
    id: str
    type: str  # markdown | image | table | sub_topic | alert
    data: Dict[str, Any] = Field(default_factory=dict)

class BlogCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = ""
    content: Optional[str] = ""  # Main markdown text (legacy fallback)
    cover_image: Optional[str] = ""
    category: str = "General"  # Exam, Result, Syllabus, News, College, Guide, General
    tags: Optional[List[str]] = Field(default_factory=list)
    status: str = "published"  # draft | published
    sub_topics: Optional[List[BlogSubTopic]] = Field(default_factory=list)
    tables: Optional[List[BlogTable]] = Field(default_factory=list)
    alert_box: Optional[BlogAlertBox] = None
    blocks: Optional[List[BlogBlock]] = Field(default_factory=list)

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    sub_topics: Optional[List[BlogSubTopic]] = None
    tables: Optional[List[BlogTable]] = None
    alert_box: Optional[BlogAlertBox] = None
    blocks: Optional[List[BlogBlock]] = None
    change_summary: Optional[str] = "Updated blog post"
