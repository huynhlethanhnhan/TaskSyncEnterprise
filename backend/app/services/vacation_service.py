# 📂 FILE: app/services/vacation_service.py
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.models.employee import Employee
from app.models.vacation import Vacation
from app.schemas.vacation import VacationCreate


def get_all_vacations(db: Session, current_user: Employee) -> list[Vacation]:
    stmt = select(Vacation).order_by(Vacation.created_at.desc())
    if current_user.role_id == ROLE_EMPLOYEE:
        stmt = stmt.where(Vacation.requested_by == current_user.id)
    elif current_user.role_id == ROLE_MANAGER:
        # Managers can see requests from employees in their department or their own
        if current_user.department_id:
            stmt = stmt.join(Employee, Vacation.requested_by == Employee.id).where(
                (Employee.department_id == current_user.department_id)
                | (Vacation.requested_by == current_user.id)
            )
    return list(db.scalars(stmt).all())


def get_vacation_by_id(
    db: Session, vacation_id: int, current_user: Employee
) -> Vacation:
    vacation = db.get(Vacation, vacation_id)
    if vacation is None:
        raise HTTPException(status_code=404, detail="Vacation request not found")
    if (
        current_user.role_id not in [ROLE_ADMIN, ROLE_MANAGER]
        and vacation.requested_by != current_user.id
    ):
        raise HTTPException(
            status_code=403, detail="You do not have permission to view this request"
        )
    return vacation


def create_vacation(
    db: Session, data: VacationCreate, current_user: Employee
) -> Vacation:
    vacation = Vacation(
        type=data.type,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        status=data.status or "Pending",
        requested_by=current_user.id,
    )
    db.add(vacation)
    db.commit()
    db.refresh(vacation)
    return vacation


def update_vacation_status(
    db: Session, vacation_id: int, status: str, current_user: Employee
) -> Vacation:
    vacation = db.get(Vacation, vacation_id)
    if vacation is None:
        raise HTTPException(status_code=404, detail="Vacation request not found")

    is_owner = vacation.requested_by == current_user.id
    is_manager = current_user.role_id == ROLE_MANAGER
    is_admin = current_user.role_id == ROLE_ADMIN

    normalized_status = "Withdrawn" if status == "Cancelled" else status

    # Keep transitions explicit. The previous implementation allowed either
    # reviewer role to set any arbitrary status supplied by the client.
    if (
        is_owner
        and normalized_status == "Withdrawn"
        and vacation.status in ["Pending", "Info Requested"]
    ):
        vacation.status = "Withdrawn"
    elif (
        is_manager
        and vacation.status == "Pending"
        and normalized_status
        in {
            "Manager Approved",
            "Info Requested",
            "Rejected",
        }
    ):
        vacation.status = normalized_status
        vacation.approved_by = current_user.id
        from datetime import datetime, timezone

        vacation.approved_at = datetime.now(timezone.utc)
    elif is_admin and (
        (
            vacation.status in {"Pending", "Manager Approved"}
            and normalized_status in {"HR Approved", "Rejected"}
        )
        or (vacation.status == "Info Requested" and normalized_status == "Rejected")
    ):
        vacation.status = normalized_status
        vacation.approved_by = current_user.id
        from datetime import datetime, timezone

        vacation.approved_at = datetime.now(timezone.utc)
    else:
        raise HTTPException(
            status_code=409,
            detail=f"Transition from '{vacation.status}' to '{normalized_status}' is not allowed for this role",
        )

    from datetime import datetime, timezone

    vacation.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(vacation)

    # Trigger notification
    from app.crud import notification as notification_crud

    try:
        notification_crud.create_notification(
            db,
            title=f"Đơn nghỉ phép {status}",
            message=f"Đơn nghỉ phép của bạn ({vacation.type}) từ {vacation.start_date} đến {vacation.end_date} đã cập nhật trạng thái: {status}.",
            employee_id=vacation.requested_by,
        )
    except Exception as e:
        from app.core.logger import app_logger

        app_logger.error(f"Error creating vacation notification: {e}")

    return vacation
