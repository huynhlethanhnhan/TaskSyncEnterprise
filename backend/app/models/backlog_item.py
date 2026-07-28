from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Unicode, UnicodeText, Integer, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.mixins import AuditMixin


class BacklogItem(AuditMixin, Base):
    __tablename__ = "backlog_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    sprint_id: Mapped[int | None] = mapped_column(
        ForeignKey("sprints.id"), nullable=True
    )
    topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("discussion_topics.id"), nullable=True
    )
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    title: Mapped[str] = mapped_column(Unicode(200))
    description: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    priority: Mapped[str] = mapped_column(
        Unicode(20), server_default=text("N'Medium'"), default="Medium"
    )
    status: Mapped[str] = mapped_column(
        Unicode(30), server_default=text("N'Backlog'"), default="Backlog"
    )
    story_points: Mapped[int] = mapped_column(
        Integer, server_default=text("0"), default=0
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    project = relationship("Project")
    sprint = relationship("Sprint", back_populates="backlog_items")
    topic = relationship("DiscussionTopic")
    task = relationship("Task")
