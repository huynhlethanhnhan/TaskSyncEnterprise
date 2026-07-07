# 📂 FILE: app/models/notification.py
from datetime import datetime
from sqlalchemy import Integer, Unicode, Boolean, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    title: Mapped[str] = mapped_column(Unicode(200), nullable=False)
    message: Mapped[str] = mapped_column(Unicode(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))

    employee: Mapped["Employee"] = relationship("Employee", foreign_keys=[employee_id], lazy="joined")
