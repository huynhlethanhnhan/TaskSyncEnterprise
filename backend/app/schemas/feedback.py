# 📂 FILE: app/schemas/feedback.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class FeedbackAuthor(BaseModel):
    id: int
    full_name: str
    avatar_url: str | None = None
    job_title: str | None = None
    role_id: int

    model_config = ConfigDict(from_attributes=True)


class UserFeedbackBase(BaseModel):
    title: str
    category: str
    description: str
    impact_level: str = "Medium"
    is_anonymous: bool = False


class UserFeedbackCreate(UserFeedbackBase):
    pass


class UserFeedbackReview(BaseModel):
    status: str
    response: str | None = None


class UserFeedbackResponse(BaseModel):
    id: int
    title: str
    category: str
    description: str
    impact_level: str
    status: str
    is_anonymous: bool
    created_at: datetime
    submitter_id: int | None = None
    submitter: FeedbackAuthor | None = None
    reviewer_id: int | None = None
    reviewer: FeedbackAuthor | None = None
    response: str | None = None

    model_config = ConfigDict(from_attributes=True)
