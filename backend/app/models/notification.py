# 📂 FILE: app/models/notification.py
from datetime import datetime
from sqlalchemy import Column, Integer, Unicode, Boolean, DateTime, ForeignKey, text, func
from sqlalchemy.orm import relationship

from app.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(Unicode(200), nullable=False)
    message = Column(Unicode(1000), nullable=False)
    is_read = Column(Boolean, nullable=False, server_default=text("0"))
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    employee = relationship("Employee", foreign_keys=[employee_id], lazy="joined")
