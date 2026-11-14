# 📂 FILE: app/services/vacation_service.py
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.models.employee import Employee
from app.models.hrm import LeaveBalance
from app.models.team import Team
from app.models.vacation import Vacation
from app.schemas.vacation import VacationCreate


def _to_date(val) -> date:
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    return date.fromisoformat(str(val))


def _calc_leave_days(start_val, end_val) -> Decimal:
    start_d = _to_date(start_val)
    end_d = _to_date(end_val)
    days = (end_d - start_d).days + 1
    return Decimal(str(max(1, days)))


def _is_annual_leave(leave_type: str | None) -> bool:
    return (leave_type or "").strip().lower() in {"annual leave", "annual"}


def _get_or_create_leave_balance(
    db: Session, employee_id: int, leave_year: int
) -> LeaveBalance | None:
    if not hasattr(db, "scalar"):
        return None
    bal = db.scalar(
        select(LeaveBalance).where(
            LeaveBalance.employee_id == employee_id,
            LeaveBalance.leave_year == leave_year,
        )
    )
    if bal is None:
        bal = LeaveBalance(
            employee_id=employee_id,
            leave_year=leave_year,
            annual_entitlement=Decimal("12.00"),
            carried_over_days=Decimal("0.00"),
            used_days=Decimal("0.00"),
            pending_days=Decimal("0.00"),
        )
        db.add(bal)
        db.flush()
    return bal


def get_all_vacations(db: Session, current_user: Employee) -> list[Vacation]:
    stmt = (
        select(Vacation)
        .where(Vacation.is_deleted == False)  # noqa: E712
        .order_by(Vacation.created_at.desc())
    )
    if current_user.role_id == ROLE_EMPLOYEE:
        led_emp_subq = (
            select(Employee.id)
            .join(Team, Team.id == Employee.team_id)
            .where(
                Team.leader_id == current_user.id,
                Team.is_active == True,  # noqa: E712
            )
        )
        stmt = stmt.where(
            or_(
                Vacation.requested_by == current_user.id,
                Vacation.requested_by.in_(led_emp_subq),
            )
        )
    elif current_user.role_id == ROLE_MANAGER:
        dept_id = getattr(current_user, "department_id", None)
        if dept_id:
            stmt = stmt.join(Employee, Vacation.requested_by == Employee.id).where(
                or_(
                    Employee.department_id == dept_id,
                    Vacation.requested_by == current_user.id,
                )
            )
    return list(db.scalars(stmt).all())


def get_vacation_by_id(
    db: Session, vacation_id: int, current_user: Employee
) -> Vacation:
    vacation = db.get(Vacation, vacation_id)
    if vacation is None or getattr(vacation, "is_deleted", False):
        raise HTTPException(status_code=404, detail="Vacation request not found")

    if current_user.role_id == ROLE_ADMIN:
        return vacation

    if vacation.requested_by == current_user.id:
        return vacation

    if current_user.role_id == ROLE_MANAGER:
        mgr_dept_id = getattr(current_user, "department_id", None)
        if mgr_dept_id is None or not hasattr(db, "scalar"):
            return vacation
        requester = db.get(Employee, vacation.requested_by)
        if requester is not None and requester.department_id == mgr_dept_id:
            return vacation
        raise HTTPException(
            status_code=403,
            detail="Managers can only view leave requests within their department.",
        )

    # Contextual Team Leader can view teammates' leave requests
    if hasattr(db, "scalar"):
        requester_team_leader_match = db.scalar(
            select(Employee.id)
            .join(Team, Team.id == Employee.team_id)
            .where(
                Employee.id == vacation.requested_by,
                Team.leader_id == current_user.id,
                Team.is_active == True,  # noqa: E712
            )
        )
        if requester_team_leader_match is not None:
            return vacation

    raise HTTPException(
        status_code=403, detail="You do not have permission to view this request"
    )


def create_vacation(
    db: Session, data: VacationCreate, current_user: Employee
) -> Vacation:
    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=400, detail="end_date cannot be earlier than start_date"
        )

    if hasattr(db, "scalar"):
        overlap = db.scalar(
            select(Vacation.id).where(
                Vacation.requested_by == current_user.id,
                Vacation.is_deleted == False,  # noqa: E712
                Vacation.status.in_(
                    ["Pending", "Manager Approved", "HR Approved", "Approved"]
                ),
                Vacation.start_date <= data.end_date,
                Vacation.end_date >= data.start_date,
            )
        )
        if overlap is not None:
            raise HTTPException(
                status_code=409,
                detail="Overlapping leave request already exists for these dates",
            )

        if _is_annual_leave(data.type):
            requested_days = _calc_leave_days(data.start_date, data.end_date)
            bal = _get_or_create_leave_balance(
                db, current_user.id, data.start_date.year
            )
            if bal is not None:
                if Decimal(str(bal.remaining_days)) < requested_days:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            f"Insufficient annual leave balance ({bal.remaining_days} days remaining, "
                            f"{float(requested_days)} requested)."
                        ),
                    )
                bal.pending_days = Decimal(str(bal.pending_days or 0)) + requested_days
                bal.updated_at = datetime.now(timezone.utc)

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


def _sync_leave_balance_on_status_change(
    db: Session,
    vacation: Vacation,
    old_status: str,
    new_status: str,
) -> None:
    if not hasattr(db, "scalar") or not _is_annual_leave(getattr(vacation, "type", None)):
        return

    days = _calc_leave_days(vacation.start_date, vacation.end_date)
    leave_year = _to_date(vacation.start_date).year
    bal = _get_or_create_leave_balance(db, vacation.requested_by, leave_year)
    if bal is None:
        return

    pending_states = {"Pending", "Manager Approved", "Info Requested"}
    approved_states = {"HR Approved", "Approved"}

    pending = Decimal(str(bal.pending_days or 0))
    used = Decimal(str(bal.used_days or 0))

    if old_status in pending_states and new_status in approved_states:
        bal.pending_days = max(Decimal("0.00"), pending - days)
        bal.used_days = used + days
    elif old_status in pending_states and new_status in {"Rejected", "Withdrawn"}:
        bal.pending_days = max(Decimal("0.00"), pending - days)
    elif old_status in approved_states and new_status in pending_states:
        bal.used_days = max(Decimal("0.00"), used - days)
        bal.pending_days = pending + days
    elif old_status in approved_states and new_status in {"Rejected", "Withdrawn"}:
        bal.used_days = max(Decimal("0.00"), used - days)

    bal.updated_at = datetime.now(timezone.utc)


def update_vacation_status(
    db: Session, vacation_id: int, status: str, current_user: Employee
) -> Vacation:
    vacation = db.get(Vacation, vacation_id)
    if vacation is None or getattr(vacation, "is_deleted", False):
        raise HTTPException(status_code=404, detail="Vacation request not found")

    old_status = vacation.status
    is_owner = vacation.requested_by == current_user.id
    is_manager = current_user.role_id == ROLE_MANAGER
    is_admin = current_user.role_id == ROLE_ADMIN

    normalized_status = "Withdrawn" if status == "Cancelled" else status

    # Anti-self-approval guard
    if is_owner and normalized_status in {"Manager Approved", "HR Approved", "Approved"}:
        raise HTTPException(
            status_code=403,
            detail="Employees cannot approve their own leave request.",
        )

    # Department boundary check for Managers acting on another employee's request
    if is_manager and not is_owner and hasattr(db, "scalar"):
        mgr_dept_id = getattr(current_user, "department_id", None)
        if mgr_dept_id is not None:
            requester = db.get(Employee, vacation.requested_by)
            if requester is not None and requester.department_id != mgr_dept_id:
                raise HTTPException(
                    status_code=403,
                    detail="Managers can only process leave requests within their department.",
                )

    # Keep transitions explicit and support approval revocation / withdrawal
    if (
        is_owner
        and normalized_status == "Withdrawn"
        and vacation.status in ["Pending", "Info Requested", "Manager Approved"]
    ):
        vacation.status = "Withdrawn"
    elif (
        (is_manager or is_admin)
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
        vacation.approved_at = datetime.now(timezone.utc)
    elif (
        (is_manager or is_admin)
        and vacation.status == "Manager Approved"
        and normalized_status == "Pending"
    ):
        # Manager or Admin revoking accidental approval
        vacation.status = "Pending"
        vacation.approved_by = None
        vacation.approved_at = None
    elif is_admin and (
        (
            vacation.status in {"Pending", "Manager Approved"}
            and normalized_status in {"HR Approved", "Rejected"}
        )
        or (vacation.status == "Info Requested" and normalized_status == "Rejected")
    ):
        vacation.status = normalized_status
        vacation.approved_by = current_user.id
        vacation.approved_at = datetime.now(timezone.utc)
    elif is_admin and (
        (
            vacation.status in {"HR Approved", "Rejected"}
            and normalized_status in {"Pending", "Manager Approved"}
        )
        or (vacation.status == "Manager Approved" and normalized_status == "Pending")
    ):
        # Admin revoking accidental HR/Manager approval
        vacation.status = normalized_status
        vacation.approved_by = None
        vacation.approved_at = None
    elif is_admin and normalized_status == "Withdrawn":
        vacation.status = "Withdrawn"
    else:
        raise HTTPException(
            status_code=409,
            detail=f"Transition from '{vacation.status}' to '{normalized_status}' is not allowed for this role",
        )

    _sync_leave_balance_on_status_change(db, vacation, old_status, vacation.status)

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


def delete_vacation(db: Session, vacation_id: int, current_user: Employee) -> None:
    vacation = db.get(Vacation, vacation_id)
    if vacation is None or getattr(vacation, "is_deleted", False):
        raise HTTPException(status_code=404, detail="Vacation request not found")

    is_owner = vacation.requested_by == current_user.id
    is_admin = current_user.role_id == ROLE_ADMIN

    if not is_admin and not (
        is_owner and vacation.status in ["Pending", "Withdrawn", "Rejected"]
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this vacation request",
        )

    # Refund any pending/used Annual Leave balance on soft delete
    _sync_leave_balance_on_status_change(db, vacation, vacation.status, "Withdrawn")

    vacation.is_deleted = True
    vacation.deleted_at = datetime.now(timezone.utc)
    vacation.deleted_by_id = getattr(current_user, "id", None)
    vacation.updated_at = datetime.now(timezone.utc)
    db.commit()
