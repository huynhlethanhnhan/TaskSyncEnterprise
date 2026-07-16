# 📂 FILE: app/models/notification.py
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, Unicode, Boolean, DateTime, ForeignKey, text, CheckConstraint, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.notification_log import NotificationLog

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        CheckConstraint(
            "priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')",
            name="ck_dbo_notifications_priority"
        ),
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'READ', 'ARCHIVED')",
            name="ck_dbo_notifications_status"
        ),
        CheckConstraint(
            "channel IN ('IN_APP', 'EMAIL', 'WEBSOCKET', 'PUSH', 'SMS', 'SLACK', 'TEAMS')",
            name="ck_dbo_notifications_channel"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    type: Mapped[str] = mapped_column(
        Unicode(50),
        nullable=False,
        index=True,
        default="SYSTEM",
        server_default=text("N'SYSTEM'")
    )
    title: Mapped[str] = mapped_column(Unicode(200), nullable=False)
    message: Mapped[str] = mapped_column(Unicode(1000), nullable=False)
    priority: Mapped[str] = mapped_column(
        Unicode(20),
        nullable=False,
        default="NORMAL",
        server_default=text("N'NORMAL'")
    )
    status: Mapped[str] = mapped_column(
        Unicode(20),
        nullable=False,
        default="PENDING",
        server_default=text("N'PENDING'")
    )
    channel: Mapped[str] = mapped_column(
        Unicode(20),
        nullable=False,
        default="IN_APP",
        server_default=text("N'IN_APP'")
    )
    event_id: Mapped[Optional[str]] = mapped_column(
        Unicode(50),
        nullable=True,
        index=True
    )
    context_json: Mapped[Optional[str]] = mapped_column(
        UnicodeText,
        nullable=True
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("0")
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("SYSUTCDATETIME()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="notifications",
        foreign_keys=[employee_id]
    )
    logs: Mapped[List["NotificationLog"]] = relationship(
        "NotificationLog",
        back_populates="notification",
        cascade="all, delete-orphan"
    )
