from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
import uuid


ChapterStatus = Literal["not_started", "processing", "draft", "in_review", "published"]
StepStatus = Literal["pending", "running", "done", "error"]
Subject = Literal["science", "maths", "physics", "chemistry", "biology"]


class ChapterCreate(BaseModel):
    subject: Subject
    name: str
    chapterNumber: int


class Chapter(BaseModel):
    id: str
    subject: Subject
    name: str
    chapterNumber: int
    status: ChapterStatus
    topicsCount: int
    questionsCount: int
    imagesCount: int
    createdAt: str
    updatedAt: str
    publishedAt: Optional[str] = None


class ProcessingStepState(BaseModel):
    status: StepStatus
    detail: Optional[str] = None


class ProcessingStatus(BaseModel):
    chapterId: str
    overall: ChapterStatus
    steps: dict[str, ProcessingStepState]
    error: Optional[str] = None


class AttemptPoolsUpdate(BaseModel):
    pools: dict[int, list[str]]


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"
