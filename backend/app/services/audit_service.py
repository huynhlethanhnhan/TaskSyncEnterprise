# 📂 FILE: app/services/audit_service.py
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def get_all_audit_logs(db: Session) -> list[AuditLog]:
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
