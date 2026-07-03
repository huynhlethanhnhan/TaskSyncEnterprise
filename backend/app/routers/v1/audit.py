# 📂 FILE: app/routers/v1/audit.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.deps import RequireAdmin
from app.services import audit_service

router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
    dependencies=[Depends(RequireAdmin)]
)

@router.get("")
def get_audit_logs(db: Session = Depends(get_db)):
    return audit_service.get_all_audit_logs(db)