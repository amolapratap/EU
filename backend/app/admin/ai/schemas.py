from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field


class DiagramBBox(BaseModel):
    page_num: int = Field(description="1-based page number where the diagram appears")
    ymin: float = Field(description="Top coordinate normalized 0 to 1000")
    xmin: float = Field(description="Left coordinate normalized 0 to 1000")
    ymax: float = Field(description="Bottom coordinate normalized 0 to 1000")
    xmax: float = Field(description="Right coordinate normalized 0 to 1000")


class ExtractedSubQuestion(BaseModel):
    sq_no: str = Field(description="Sub-question letter/number like 'a', 'b', 'c', 'i', 'ii'")
    marks: Optional[float] = Field(default=0, description="Marks allocated to this sub-question")
    question_md: str = Field(description="Full text of sub-question in Markdown with LaTeX math")
    options: Optional[List[str]] = Field(default=None, description="4 options if objective [A, B, C, D]")
    correct_index: Optional[int] = Field(default=None, description="0-indexed correct option (0=A, 1=B, 2=C, 3=D)")
    solution_md: Optional[str] = Field(default="", description="Explanation or solution")
    diagram_bbox: Optional[DiagramBBox] = Field(default=None, description="Diagram bounding box if this sub-question has an image")
    diagram_url: Optional[str] = Field(default=None, description="Cloudinary URL of cropped diagram")


class ExtractedQuestion(BaseModel):
    q_no: str = Field(description="Main question number like '1', '2', '3'")
    marks: float = Field(default=14, description="Total marks for this main question")
    structure: Literal["single", "multi"] = Field(description="'single' if stand-alone, 'multi' if has sub-questions (a), (b)")
    nature: Literal["subjective", "objective"] = Field(description="'objective' for MCQs, 'subjective' for theory/numerical")
    question_md: Optional[str] = Field(default="", description="Question text if structure is 'single'")
    heading: Optional[str] = Field(default=None, description="Optional section heading, e.g. 'Answer any 5 questions'")
    options: Optional[List[str]] = Field(default=None, description="4 options if single objective question")
    correct_index: Optional[int] = Field(default=None, description="0-indexed correct option if objective")
    sub_questions: Optional[List[ExtractedSubQuestion]] = Field(default_factory=list, description="Sub-questions if structure is 'multi'")
    diagram_bbox: Optional[DiagramBBox] = Field(default=None, description="Diagram bounding box if main question has an image")
    diagram_url: Optional[str] = Field(default=None, description="Cloudinary URL of cropped diagram")


class ExtractedPaperQuestions(BaseModel):
    questions: List[ExtractedQuestion] = Field(description="List of extracted questions from the exam paper")


class ExtractionRequest(BaseModel):
    pdf_url: Optional[str] = None
    page_numbers: Optional[List[int]] = None  # 1-based page numbers to extract from


class SaveExtractedQuestionsRequest(BaseModel):
    questions: List[dict]
