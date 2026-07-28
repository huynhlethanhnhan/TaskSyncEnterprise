from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Unicode, UnicodeText, Boolean, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.mixins import AuditMixin


class UserFeedback(AuditMixin, Base):
    __tablename__ = "user_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Unicode(200))
    category: Mapped[str] = mapped_column(Unicode(100))
    description: Mapped[str] = mapped_column(UnicodeText)
    impact_level: Mapped[str] = mapped_column(
        Unicode(50), server_default=text("N'Medium'"), default="Medium"
    )
    status: Mapped[str] = mapped_column(
        Unicode(50), server_default=text("N'New'"), default="New"
    )
    submitter_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))
    reviewer_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    response: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(
        Boolean, server_default=text("0"), default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    submitter = relationship("Employee", foreign_keys=[submitter_id])
    reviewer = relationship("Employee", foreign_keys=[reviewer_id])
