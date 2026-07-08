# 📂 FILE: app/models/audit.py
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"), nullable=True)
    employee_email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    action: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))

    employee: Mapped[Optional["Employee"]] = relationship("Employee")