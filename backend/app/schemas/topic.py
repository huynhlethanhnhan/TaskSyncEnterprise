# 📂 FILE: app/schemas/topic.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TopicAuthor(BaseModel):
    id: int
    full_name: str
    avatar_url: str | None = None
    job_title: str | None = None
    role_id: int

    model_config = ConfigDict(from_attributes=True)


class DiscussionReplyBase(BaseModel):
    content: str


class DiscussionReplyCreate(DiscussionReplyBase):
    pass


class DiscussionReplyUpdate(DiscussionReplyBase):
    pass


class DiscussionReplyResponse(DiscussionReplyBase):
    id: int
    topic_id: int
    created_by_id: int
    created_at: datetime
    creator: TopicAuthor | None = None

    model_config = ConfigDict(from_attributes=True)


class DiscussionTopicBase(BaseModel):
    title: str
    content: str
    status: str = "Open"


class DiscussionTopicCreate(DiscussionTopicBase):
    project_id: int | None = None


class DiscussionTopicUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    status: str | None = None


class DiscussionTopicResponse(DiscussionTopicBase):
    id: int
    project_id: int | None = None
    created_by_id: int
    created_at: datetime
    creator: TopicAuthor | None = None
    reply_count: int = 0
    replies: list[DiscussionReplyResponse] = []

    model_config = ConfigDict(from_attributes=True)
