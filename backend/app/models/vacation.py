# 📂 FILE: app/models/vacation.py
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, Unicode, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.employee import Employee

from app.database import Base


class Vacation(Base):
    __tablename__ = "vacations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Unicode(500))
    status: Mapped[str] = mapped_column(
        Unicode(50), nullable=False, server_default=text("N'Pending'")
    )
    requested_by: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False
    )
    approved_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    requester: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[requested_by], lazy="joined"
    )
    approver: Mapped[Optional["Employee"]] = relationship(
        "Employee", foreign_keys=[approved_by], lazy="joined"
    )
