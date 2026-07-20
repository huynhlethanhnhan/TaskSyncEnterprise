# 📂 FILE: app/routers/v1/vacations.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.models.vacation import Vacation
from app.schemas.vacation import VacationCreate, VacationResponse, VacationUpdate
from app.services import vacation_service

router = APIRouter(prefix="/vacations", tags=["Vacations"])


def _format_vacation(vacation: Vacation) -> dict:
    return {
        "id": vacation.id,
        "type": vacation.type,
        "start_date": vacation.start_date,
        "end_date": vacation.end_date,
        "reason": vacation.reason,
        "status": vacation.status,
        "requested_by": vacation.requested_by,
        "requested_by_name": getattr(vacation.requester, "full_name", None),
        "requested_by_email": getattr(vacation.requester, "email", None),
        "approved_by": vacation.approved_by,
        "approved_at": vacation.approved_at,
        "created_at": vacation.created_at,
    }


@router.get("", response_model=list[VacationResponse])
def list_vacations(
    current_user: Employee = Depends(get_current_user), db: Session = Depends(get_db)
):
    vacations = vacation_service.get_all_vacations(db, current_user)
    return [_format_vacation(vac) for vac in vacations]


@router.get("/{vacation_id}", response_model=VacationResponse)
def get_vacation(
    vacation_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vacation = vacation_service.get_vacation_by_id(db, vacation_id, current_user)
    return _format_vacation(vacation)


@router.post("", response_model=VacationResponse, status_code=201)
def create_vacation(
    data: VacationCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vacation = vacation_service.create_vacation(db, data, current_user)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_dashboard()
    return _format_vacation(vacation)


@router.patch("/{vacation_id}", response_model=VacationResponse)
def patch_vacation(
    vacation_id: int,
    data: VacationUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vacation = vacation_service.update_vacation_status(
        db, vacation_id, data.status, current_user
    )
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_dashboard()
    return _format_vacation(vacation)
