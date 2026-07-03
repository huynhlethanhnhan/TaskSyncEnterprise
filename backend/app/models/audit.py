# 📂 FILE: app/models/audit.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    employee_email = Column(String(255), index=True) # Duy nhất cột này
    action = Column(String(255), index=True)
    timestamp = Column(DateTime, server_default=func.now())

    employee = relationship("Employee")