from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Unicode, UnicodeText, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.mixins import AuditMixin


class DiscussionTopic(AuditMixin, Base):
    __tablename__ = "discussion_topics"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    title: Mapped[str] = mapped_column(Unicode(200))
    content: Mapped[str] = mapped_column(UnicodeText)
    status: Mapped[str] = mapped_column(Unicode(30), server_default=text("N'Open'"), default="Open")
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    project = relationship("Project")
    replies = relationship("DiscussionReply", back_populates="topic", cascade="all, delete-orphan")
    creator = relationship("Employee", foreign_keys="DiscussionTopic.created_by_id")
