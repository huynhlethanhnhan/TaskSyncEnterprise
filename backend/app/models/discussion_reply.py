from datetime import datetime, timezone
from sqlalchemy import ForeignKey, UnicodeText, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.mixins import AuditMixin


class DiscussionReply(AuditMixin, Base):
    __tablename__ = "discussion_replies"

    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("discussion_topics.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(UnicodeText)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    topic = relationship("DiscussionTopic", back_populates="replies")
    creator = relationship("Employee", foreign_keys="DiscussionReply.created_by_id")
