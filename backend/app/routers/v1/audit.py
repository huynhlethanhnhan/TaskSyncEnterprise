# 📂 FILE: app/routers/v1/audit.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.deps import RequireAdmin
from app.schemas.audit import AuditLogResponse
from app.services import audit_service

router = APIRouter(
    prefix="/audit-logs", tags=["Audit Logs"], dependencies=[Depends(RequireAdmin)]
)


@router.get("", response_model=list[AuditLogResponse])
def get_audit_logs(
    skip: int = 0,
    limit: int = settings.DEFAULT_PAGE_SIZE,
    employee_id: int | None = None,
    db: Session = Depends(get_db),
):
    return audit_service.get_all_audit_logs(
        db, skip=skip, limit=limit, employee_id=employee_id
    )
