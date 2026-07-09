# 📂 FILE: app/services/audit_service.py
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.audit import AuditLog


def get_all_audit_logs(db: Session, skip: int = 0, limit: int = settings.DEFAULT_PAGE_SIZE) -> list[AuditLog]:
    stmt = (
        select(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
    )
    return db.scalars(stmt).all()
