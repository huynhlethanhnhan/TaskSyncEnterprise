# 📂 FILE: app/models/notification_preference.py
from typing import TYPE_CHECKING
from sqlalchemy import Integer, Unicode, Boolean, ForeignKey, text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.employee import Employee

from app.database import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    __table_args__ = (
        CheckConstraint(
            "notification_type IN ('AUTHENTICATION', 'TASKS', 'PROJECTS', 'VACATION', 'COMMENTS', 'SYSTEM')",
            name="ck_dbo_notification_preferences_type",
        ),
        CheckConstraint(
            "channel IN ('IN_APP', 'EMAIL', 'WEBSOCKET', 'PUSH', 'SMS', 'SLACK', 'TEAMS')",
            name="ck_dbo_notification_preferences_channel",
        ),
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True
    )
    notification_type: Mapped[str] = mapped_column(Unicode(50), primary_key=True)
    channel: Mapped[str] = mapped_column(Unicode(20), primary_key=True)
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("1")
    )

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="notification_preferences",
        foreign_keys=[employee_id],
    )
