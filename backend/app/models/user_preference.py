from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import (
    String,
    Unicode,
    UnicodeText,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.employee import Employee

from app.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), primary_key=True
    )
    theme: Mapped[str] = mapped_column(String(20), server_default=text("'system'"))
    language: Mapped[str] = mapped_column(String(10), server_default=text("'vi'"))
    timezone: Mapped[str] = mapped_column(
        String(50), server_default=text("'Asia/Ho_Chi_Minh'")
    )
    date_format: Mapped[str] = mapped_column(
        String(20), server_default=text("'DD/MM/YYYY'")
    )
    page_size: Mapped[int] = mapped_column(Integer, server_default=text("20"))
    compact_mode: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))

    in_app_notifications: Mapped[bool] = mapped_column(
        Boolean, server_default=text("1")
    )
    email_notifications: Mapped[bool] = mapped_column(Boolean, server_default=text("1"))
    task_assigned_notify: Mapped[bool] = mapped_column(
        Boolean, server_default=text("1")
    )
    task_deadline_notify: Mapped[bool] = mapped_column(
        Boolean, server_default=text("1")
    )
    sprint_status_notify: Mapped[bool] = mapped_column(
        Boolean, server_default=text("1")
    )
    project_update_notify: Mapped[bool] = mapped_column(
        Boolean, server_default=text("1")
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()"), onupdate=datetime.utcnow
    )

    employee: Mapped["Employee"] = relationship(
        "Employee",
        foreign_keys=[employee_id],
    )
