# 📂 FILE: app/models/vacation.py
from datetime import datetime

from sqlalchemy import Column, Date as SQLDate, DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.orm import relationship

from app.database import Base


class Vacation(Base):
    __tablename__ = "vacations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(100), nullable=False)
    start_date = Column(SQLDate, nullable=False)
    end_date = Column(SQLDate, nullable=False)
    reason = Column(String(500))
    status = Column(String(50), nullable=False, server_default=text("'Pending'"))
    requested_by = Column(Integer, ForeignKey("employees.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("employees.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=True)

    requester = relationship("Employee", foreign_keys=[requested_by], lazy="joined")
    approver = relationship("Employee", foreign_keys=[approved_by], lazy="joined")
