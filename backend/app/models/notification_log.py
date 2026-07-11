# 📂 FILE: app/models/notification_log.py
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, DateTime, ForeignKey, text, CheckConstraint, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    __table_args__ = (
        CheckConstraint(
            "channel IN ('IN_APP', 'EMAIL', 'WEBSOCKET', 'PUSH', 'SMS', 'SLACK', 'TEAMS')",
            name="ck_dbo_notification_logs_channel"
        ),
        CheckConstraint(
            "delivery_status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'READ', 'ARCHIVED')",
            name="ck_dbo_notification_logs_delivery_status"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    notification_id: Mapped[int] = mapped_column(
        ForeignKey("notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    channel: Mapped[str] = mapped_column(Unicode(20), nullable=False)
    delivery_status: Mapped[str] = mapped_column(Unicode(20), nullable=False)
    retry_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0")
    )
    provider_response: Mapped[Optional[str]] = mapped_column(
        UnicodeText,
        nullable=True
    )
    duration_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("SYSUTCDATETIME()")
    )

    # Relationships
    notification: Mapped["Notification"] = relationship(
        "Notification",
        back_populates="logs",
        foreign_keys=[notification_id]
    )
