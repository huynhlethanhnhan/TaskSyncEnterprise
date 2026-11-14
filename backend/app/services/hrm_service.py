# 📂 FILE: app/services/hrm_service.py
"""Business logic and RBAC governance for the HRM module."""

import calendar
import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.core.security import get_password_hash
from app.models.audit import AuditLog
from app.models.department import Department
from app.models.employee import Employee
from app.models.hrm import (
    AttendanceLog,
    BackupHistoryLog,
    EmploymentContract,
    LeaveBalance,
    OvertimeRequest,
    PayrollRecord,
    RecruitmentCandidate,
)
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.team import Team
from app.models.vacation import Vacation
from app.schemas.hrm import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceUpdate,
    BackupHistoryCreate,
    CandidateCreate,
    CandidateOnboardRequest,
    CandidateUpdate,
    EmploymentContractCreate,
    EmploymentContractUpdate,
    HRMOverviewResponse,
    LeaveBalanceAdjust,
    LeaveBalanceResponse,
    LeaveTaskConflictItem,
    OvertimeRequestCreate,
    OvertimeRequestUpdate,
    PayrollCalculateRequest,
    PayrollUpdate,
)
from app.services.project_access import get_led_team_ids, require_project_access


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _record_audit(db: Session, actor: Employee, action: str) -> None:
    db.add(
        AuditLog(
            employee_id=actor.id,
            employee_email=actor.email,
            action=action[:255],
            timestamp=_utc_now(),
        )
    )


def _get_active_employee(db: Session, employee_id: int) -> Employee:
    emp = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    if emp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
        )
    return emp


def _is_manager_of_employee(
    db: Session, manager: Employee, target_emp: Employee
) -> bool:
    if manager.role_id == ROLE_ADMIN:
        return True
    if manager.role_id != ROLE_MANAGER:
        return False
    if (
        manager.department_id is not None
        and target_emp.department_id == manager.department_id
    ):
        return True
    if target_emp.department_id is not None:
        managed = db.scalar(
            select(Department.id).where(
                Department.id == target_emp.department_id,
                Department.manager_id == manager.id,
                Department.is_active == True,  # noqa: E712
            )
        )
        if managed is not None:
            return True
    return False


def _accessible_employee_ids_for_team_leader(
    db: Session, leader: Employee
) -> list[int]:
    led_ids = get_led_team_ids(db, leader.id)
    if not led_ids:
        return []
    return list(
        db.scalars(
            select(Employee.id).where(
                Employee.team_id.in_(led_ids),
                Employee.is_deleted == False,  # noqa: E712
            )
        ).all()
    )


def _department_employee_ids(db: Session, manager: Employee) -> list[int]:
    managed_depts = list(
        db.scalars(
            select(Department.id).where(
                Department.manager_id == manager.id,
                Department.is_active == True,  # noqa: E712
            )
        ).all()
    )
    if manager.department_id is not None and manager.department_id not in managed_depts:
        managed_depts.append(manager.department_id)
    if not managed_depts:
        return [manager.id]
    emp_ids = list(
        db.scalars(
            select(Employee.id).where(
                Employee.department_id.in_(managed_depts),
                Employee.is_deleted == False,  # noqa: E712
            )
        ).all()
    )
    if manager.id not in emp_ids:
        emp_ids.append(manager.id)
    return emp_ids


# ---------------------------------------------------------------------------
# Leave Balances
# ---------------------------------------------------------------------------


def get_or_create_leave_balance(
    db: Session, employee_id: int, leave_year: int
) -> LeaveBalance:
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
        db.commit()
        db.refresh(bal)
    return bal


def get_employee_leave_balance(
    db: Session,
    employee_id: int,
    leave_year: int,
    current_user: Employee,
) -> LeaveBalance:
    target = _get_active_employee(db, employee_id)
    if current_user.role_id != ROLE_ADMIN and current_user.id != target.id:
        if not _is_manager_of_employee(db, current_user, target):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this employee's leave balance.",
            )
    return get_or_create_leave_balance(db, target.id, leave_year)


def adjust_leave_balance(
    db: Session,
    employee_id: int,
    data: LeaveBalanceAdjust,
    current_user: Employee,
) -> LeaveBalance:
    target = _get_active_employee(db, employee_id)
    if current_user.role_id != ROLE_ADMIN:
        if current_user.role_id != ROLE_MANAGER or not _is_manager_of_employee(
            db, current_user, target
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or scoped Department Manager can adjust leave balance.",
            )
        if target.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot adjust their own leave balance.",
            )

    bal = get_or_create_leave_balance(db, target.id, data.leave_year)
    bal.annual_entitlement = data.annual_entitlement
    bal.carried_over_days = data.carried_over_days
    bal.updated_at = _utc_now()
    _record_audit(
        db,
        current_user,
        f"HRM_LEAVE_BALANCE_ADJUST emp={target.id} year={data.leave_year}",
    )
    db.commit()
    db.refresh(bal)
    return bal


def list_leave_balances(
    db: Session,
    current_user: Employee,
    leave_year: int,
    employee_id: Optional[int] = None,
) -> list[LeaveBalance]:
    """List leave balances within the caller's RBAC scope, creating missing rows for active employees."""
    if employee_id is not None:
        return [get_employee_leave_balance(db, employee_id, leave_year, current_user)]

    if current_user.role_id == ROLE_ADMIN:
        emp_ids = list(
            db.scalars(
                select(Employee.id).where(Employee.is_deleted == False)  # noqa: E712
            ).all()
        )
    elif current_user.role_id == ROLE_MANAGER:
        emp_ids = _department_employee_ids(db, current_user)
    else:
        emp_ids = [current_user.id]

    if not emp_ids:
        return []

    return [get_or_create_leave_balance(db, eid, leave_year) for eid in emp_ids]


# ---------------------------------------------------------------------------
# Employment Contracts (RBAC: Admin + Scoped Dept Manager + Contract Owner)
# ---------------------------------------------------------------------------


def _require_contract_view_access(
    db: Session, target_employee: Employee, current_user: Employee
) -> None:
    if current_user.role_id == ROLE_ADMIN or current_user.id == target_employee.id:
        return
    if _is_manager_of_employee(db, current_user, target_employee):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only Admin, scoped Department Manager, or the contract owner can view contract and salary details.",
    )


def _require_contract_manage_access(
    db: Session, target_employee: Employee, current_user: Employee
) -> None:
    if current_user.role_id == ROLE_ADMIN:
        return
    if _is_manager_of_employee(db, current_user, target_employee):
        if target_employee.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot modify their own compensation contract.",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only Admin or scoped Department Manager can manage employment contracts.",
    )


def list_contracts(
    db: Session,
    current_user: Employee,
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = None,
) -> list[EmploymentContract]:
    stmt = (
        select(EmploymentContract)
        .where(EmploymentContract.is_deleted == False)  # noqa: E712
        .order_by(EmploymentContract.start_date.desc(), EmploymentContract.id.desc())
    )

    if employee_id is not None:
        target = _get_active_employee(db, employee_id)
        _require_contract_view_access(db, target, current_user)
        stmt = stmt.where(EmploymentContract.employee_id == employee_id)
    elif current_user.role_id == ROLE_ADMIN:
        pass
    elif current_user.role_id == ROLE_MANAGER:
        allowed_ids = _department_employee_ids(db, current_user)
        stmt = stmt.where(EmploymentContract.employee_id.in_(allowed_ids))
    else:
        stmt = stmt.where(EmploymentContract.employee_id == current_user.id)

    if status_filter:
        stmt = stmt.where(EmploymentContract.status == status_filter)

    return list(db.scalars(stmt).all())


def get_contract(
    db: Session, contract_id: int, current_user: Employee
) -> EmploymentContract:
    contract = db.scalar(
        select(EmploymentContract).where(
            EmploymentContract.id == contract_id,
            EmploymentContract.is_deleted == False,  # noqa: E712
        )
    )
    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment contract not found",
        )
    target = _get_active_employee(db, contract.employee_id)
    _require_contract_view_access(db, target, current_user)
    return contract


def create_contract(
    db: Session, data: EmploymentContractCreate, current_user: Employee
) -> EmploymentContract:
    target = _get_active_employee(db, data.employee_id)
    _require_contract_manage_access(db, target, current_user)

    dup_code = db.scalar(
        select(EmploymentContract.id).where(
            EmploymentContract.contract_code == data.contract_code
        )
    )
    if dup_code is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Contract code '{data.contract_code}' already exists.",
        )

    if data.status == "Active":
        existing_actives = db.scalars(
            select(EmploymentContract).where(
                EmploymentContract.employee_id == target.id,
                EmploymentContract.status == "Active",
                EmploymentContract.is_deleted == False,  # noqa: E712
            )
        ).all()
        for prev in existing_actives:
            prev.status = "Expired"
            prev.updated_at = _utc_now()
            prev.updated_by_id = current_user.id

    contract = EmploymentContract(
        employee_id=target.id,
        contract_code=data.contract_code,
        contract_type=data.contract_type,
        base_salary=data.base_salary,
        allowance=data.allowance,
        currency=data.currency,
        start_date=data.start_date,
        end_date=data.end_date,
        status=data.status,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(contract)
    _record_audit(
        db,
        current_user,
        f"HRM_CONTRACT_CREATE code={data.contract_code} emp={target.id}",
    )
    db.commit()
    db.refresh(contract)
    return contract


def update_contract(
    db: Session,
    contract_id: int,
    data: EmploymentContractUpdate,
    current_user: Employee,
) -> EmploymentContract:
    contract = db.scalar(
        select(EmploymentContract).where(
            EmploymentContract.id == contract_id,
            EmploymentContract.is_deleted == False,  # noqa: E712
        )
    )
    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment contract not found",
        )
    target = _get_active_employee(db, contract.employee_id)
    _require_contract_manage_access(db, target, current_user)

    payload = data.model_dump(exclude_unset=True)
    new_start = payload.get("start_date", contract.start_date)
    new_end = payload.get("end_date", contract.end_date)
    if new_end is not None and new_end < new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date cannot be earlier than start_date",
        )

    if payload.get("status") == "Active" and contract.status != "Active":
        other_actives = db.scalars(
            select(EmploymentContract).where(
                EmploymentContract.employee_id == target.id,
                EmploymentContract.id != contract.id,
                EmploymentContract.status == "Active",
                EmploymentContract.is_deleted == False,  # noqa: E712
            )
        ).all()
        for prev in other_actives:
            prev.status = "Expired"
            prev.updated_at = _utc_now()
            prev.updated_by_id = current_user.id

    for field, val in payload.items():
        setattr(contract, field, val)
    contract.updated_at = _utc_now()
    contract.updated_by_id = current_user.id

    _record_audit(
        db,
        current_user,
        f"HRM_CONTRACT_UPDATE id={contract.id} emp={target.id}",
    )
    db.commit()
    db.refresh(contract)
    return contract


def delete_contract(db: Session, contract_id: int, current_user: Employee) -> None:
    contract = db.scalar(
        select(EmploymentContract).where(
            EmploymentContract.id == contract_id,
            EmploymentContract.is_deleted == False,  # noqa: E712
        )
    )
    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employment contract not found",
        )
    target = _get_active_employee(db, contract.employee_id)
    _require_contract_manage_access(db, target, current_user)

    contract.is_deleted = True
    contract.deleted_at = _utc_now()
    contract.deleted_by_id = current_user.id
    contract.updated_at = _utc_now()
    contract.updated_by_id = current_user.id

    _record_audit(
        db,
        current_user,
        f"HRM_CONTRACT_SOFT_DELETE id={contract.id} emp={target.id}",
    )
    db.commit()


# ---------------------------------------------------------------------------
# Attendance Logs
# ---------------------------------------------------------------------------


def check_in_attendance(
    db: Session, current_user: Employee, data: AttendanceCheckIn
) -> AttendanceLog:
    now = _utc_now()
    work_d = data.work_date or now.date()
    in_t = (data.check_in or now.time()).replace(microsecond=0)

    existing = db.scalar(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_user.id,
            AttendanceLog.work_date == work_d,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Attendance for {work_d} is already checked in.",
        )

    log = AttendanceLog(
        employee_id=current_user.id,
        work_date=work_d,
        check_in=in_t,
        status=data.status,
        note=data.note,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def check_out_attendance(
    db: Session, current_user: Employee, data: AttendanceCheckOut
) -> AttendanceLog:
    now = _utc_now()
    work_d = data.work_date or now.date()
    out_t = (data.check_out or now.time()).replace(microsecond=0)

    log = db.scalar(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_user.id,
            AttendanceLog.work_date == work_d,
        )
    )
    if log is None or log.check_in is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No check-in record found for {work_d}.",
        )
    if log.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Already checked out for {work_d}.",
        )

    dt_in = datetime.combine(work_d, log.check_in)
    dt_out = datetime.combine(work_d, out_t)
    if dt_out < dt_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out time cannot be earlier than check_in time.",
        )

    hours_total = Decimal(str(round((dt_out - dt_in).total_seconds() / 3600.0, 2)))
    hours_total = min(hours_total, Decimal("24.00"))
    ot_hours = max(Decimal("0.00"), hours_total - Decimal("8.00"))

    log.check_out = out_t
    log.work_hours = hours_total
    log.overtime_hours = ot_hours
    if data.note:
        log.note = data.note

    db.commit()
    db.refresh(log)
    return log


def list_attendance(
    db: Session,
    current_user: Employee,
    employee_id: Optional[int] = None,
    work_date_from: Optional[date] = None,
    work_date_to: Optional[date] = None,
    limit: int = 100,
) -> list[AttendanceLog]:
    stmt = select(AttendanceLog).order_by(
        AttendanceLog.work_date.desc(), AttendanceLog.id.desc()
    )

    if employee_id is not None:
        target = _get_active_employee(db, employee_id)
        if current_user.role_id != ROLE_ADMIN and target.id != current_user.id:
            if current_user.role_id == ROLE_MANAGER:
                if not _is_manager_of_employee(db, current_user, target):
                    raise HTTPException(status_code=403, detail="Forbidden")
            else:
                led_member_ids = _accessible_employee_ids_for_team_leader(
                    db, current_user
                )
                if target.id not in led_member_ids:
                    raise HTTPException(status_code=403, detail="Forbidden")
        stmt = stmt.where(AttendanceLog.employee_id == employee_id)
    elif current_user.role_id == ROLE_ADMIN:
        pass
    elif current_user.role_id == ROLE_MANAGER:
        stmt = stmt.where(
            AttendanceLog.employee_id.in_(_department_employee_ids(db, current_user))
        )
    else:
        led_ids = _accessible_employee_ids_for_team_leader(db, current_user)
        allowed = list({current_user.id, *led_ids})
        stmt = stmt.where(AttendanceLog.employee_id.in_(allowed))

    if work_date_from is not None:
        stmt = stmt.where(AttendanceLog.work_date >= work_date_from)
    if work_date_to is not None:
        stmt = stmt.where(AttendanceLog.work_date <= work_date_to)

    return list(db.scalars(stmt.limit(limit)).all())


def get_attendance_log(
    db: Session, attendance_id: int, current_user: Employee
) -> AttendanceLog:
    log = db.get(AttendanceLog, attendance_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )
    target = _get_active_employee(db, log.employee_id)
    if current_user.role_id != ROLE_ADMIN and target.id != current_user.id:
        if current_user.role_id == ROLE_MANAGER:
            if not _is_manager_of_employee(db, current_user, target):
                raise HTTPException(status_code=403, detail="Forbidden")
        elif target.id not in _accessible_employee_ids_for_team_leader(
            db, current_user
        ):
            raise HTTPException(status_code=403, detail="Forbidden")
    return log


def update_attendance_log(
    db: Session, attendance_id: int, data: AttendanceUpdate, current_user: Employee
) -> AttendanceLog:
    """Admin or scoped Manager adjusts check-in/check-out times, work hours, status, or note."""
    log = db.get(AttendanceLog, attendance_id)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )
    target = _get_active_employee(db, log.employee_id)
    if current_user.role_id != ROLE_ADMIN:
        if current_user.role_id != ROLE_MANAGER or not _is_manager_of_employee(
            db, current_user, target
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Admin or scoped Department Manager can edit attendance records.",
            )
        if target.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers cannot modify their own attendance logs.",
            )

    values = data.model_dump(exclude_unset=True)
    new_check_in = values["check_in"] if "check_in" in values else log.check_in
    new_check_out = values["check_out"] if "check_out" in values else log.check_out

    if new_check_in and new_check_out:
        dt_in = datetime.combine(log.work_date, new_check_in)
        dt_out = datetime.combine(log.work_date, new_check_out)
        if dt_out < dt_in:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Check-out time cannot be earlier than Check-in time.",
            )
        # Recompute hours automatically whenever times change unless caller supplies explicit overrides
        if "work_hours" not in values and (
            "check_in" in values or "check_out" in values
        ):
            computed_hours = Decimal(
                str(round((dt_out - dt_in).total_seconds() / 3600.0, 2))
            )
            log.work_hours = min(computed_hours, Decimal("24.00"))
        if "overtime_hours" not in values and (
            "check_in" in values or "check_out" in values
        ):
            effective_hours = values.get("work_hours", log.work_hours)
            log.overtime_hours = max(
                Decimal("0.00"), Decimal(str(effective_hours)) - Decimal("8.00")
            )
    elif "check_out" in values and new_check_out is None:
        log.work_hours = values.get("work_hours", Decimal("0.00"))
        log.overtime_hours = values.get("overtime_hours", Decimal("0.00"))

    for field in (
        "check_in",
        "check_out",
        "work_hours",
        "overtime_hours",
        "status",
        "note",
    ):
        if field in values:
            if field in ("check_out", "note") or values[field] is not None:
                setattr(log, field, values[field])

    _record_audit(
        db,
        current_user,
        f"HRM_ATTENDANCE_UPDATE id={log.id} emp={target.id} hours={log.work_hours}",
    )
    db.commit()
    db.refresh(log)
    return log


# ---------------------------------------------------------------------------
# Overtime Requests (with Team Leader pre-check note + 2-level Manager/Admin approval)
# ---------------------------------------------------------------------------


def create_overtime_request(
    db: Session, current_user: Employee, data: OvertimeRequestCreate
) -> OvertimeRequest:
    if data.project_id is not None:
        require_project_access(db, data.project_id, current_user)

    ot = OvertimeRequest(
        employee_id=current_user.id,
        project_id=data.project_id,
        work_date=data.work_date,
        hours=data.hours,
        reason=data.reason,
        status="Pending",
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(ot)
    db.commit()
    db.refresh(ot)
    return ot


def list_overtime_requests(
    db: Session,
    current_user: Employee,
    status_filter: Optional[str] = None,
    employee_id: Optional[int] = None,
) -> list[OvertimeRequest]:
    stmt = (
        select(OvertimeRequest)
        .where(OvertimeRequest.is_deleted == False)  # noqa: E712
        .order_by(OvertimeRequest.work_date.desc(), OvertimeRequest.id.desc())
    )

    if employee_id is not None:
        target = _get_active_employee(db, employee_id)
        if current_user.role_id != ROLE_ADMIN and target.id != current_user.id:
            if current_user.role_id == ROLE_MANAGER:
                if not _is_manager_of_employee(db, current_user, target):
                    raise HTTPException(status_code=403, detail="Forbidden")
            else:
                if target.id not in _accessible_employee_ids_for_team_leader(
                    db, current_user
                ):
                    raise HTTPException(status_code=403, detail="Forbidden")
        stmt = stmt.where(OvertimeRequest.employee_id == employee_id)
    elif current_user.role_id == ROLE_ADMIN:
        pass
    elif current_user.role_id == ROLE_MANAGER:
        stmt = stmt.where(
            OvertimeRequest.employee_id.in_(_department_employee_ids(db, current_user))
        )
    else:
        led_ids = _accessible_employee_ids_for_team_leader(db, current_user)
        allowed = list({current_user.id, *led_ids})
        stmt = stmt.where(OvertimeRequest.employee_id.in_(allowed))

    if status_filter:
        stmt = stmt.where(OvertimeRequest.status == status_filter)

    return list(db.scalars(stmt).all())


def add_overtime_leader_note(
    db: Session,
    overtime_id: int,
    team_leader_note: str,
    current_user: Employee,
) -> OvertimeRequest:
    ot = db.scalar(
        select(OvertimeRequest).where(
            OvertimeRequest.id == overtime_id,
            OvertimeRequest.is_deleted == False,  # noqa: E712
        )
    )
    if ot is None:
        raise HTTPException(status_code=404, detail="Overtime request not found")

    target = _get_active_employee(db, ot.employee_id)
    is_authorized = current_user.role_id == ROLE_ADMIN or _is_manager_of_employee(
        db, current_user, target
    )
    if not is_authorized:
        led_member_ids = _accessible_employee_ids_for_team_leader(db, current_user)
        if target.id in led_member_ids:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only an authorized Team Leader, Manager, or Admin can add a review note.",
        )

    ot.team_leader_note = team_leader_note
    ot.updated_at = _utc_now()
    ot.updated_by_id = current_user.id
    db.commit()
    db.refresh(ot)
    return ot


def update_overtime_status(
    db: Session,
    overtime_id: int,
    new_status: str,
    note: Optional[str],
    current_user: Employee,
) -> OvertimeRequest:
    ot = db.scalar(
        select(OvertimeRequest).where(
            OvertimeRequest.id == overtime_id,
            OvertimeRequest.is_deleted == False,  # noqa: E712
        )
    )
    if ot is None:
        raise HTTPException(status_code=404, detail="Overtime request not found")

    is_owner = ot.employee_id == current_user.id
    is_admin = current_user.role_id == ROLE_ADMIN
    is_manager = current_user.role_id == ROLE_MANAGER
    target = _get_active_employee(db, ot.employee_id)

    if is_owner and new_status in {"Manager Approved", "HR Approved"}:
        raise HTTPException(
            status_code=403, detail="Employees cannot approve their own overtime."
        )

    if (
        is_manager
        and not is_owner
        and not _is_manager_of_employee(db, current_user, target)
    ):
        raise HTTPException(
            status_code=403,
            detail="Managers can only process overtime within their department.",
        )

    if (
        is_owner
        and new_status == "Withdrawn"
        and ot.status in {"Pending", "Manager Approved"}
    ):
        ot.status = "Withdrawn"
    elif (
        (is_manager or is_admin)
        and ot.status == "Pending"
        and new_status in {"Manager Approved", "Rejected"}
    ):
        ot.status = new_status
        ot.approved_by = current_user.id
        ot.approved_at = _utc_now()
    elif (
        is_admin
        and ot.status in {"Pending", "Manager Approved"}
        and new_status in {"HR Approved", "Rejected"}
    ):
        ot.status = new_status
        ot.approved_by = current_user.id
        ot.approved_at = _utc_now()
        _record_audit(
            db,
            current_user,
            f"HRM_OT_{new_status.upper().replace(' ', '_')} id={ot.id} emp={ot.employee_id}",
        )
    else:
        raise HTTPException(
            status_code=409,
            detail=f"Transition from '{ot.status}' to '{new_status}' is not allowed for this role.",
        )

    if note:
        ot.team_leader_note = note
    ot.updated_at = _utc_now()
    ot.updated_by_id = current_user.id
    db.commit()
    db.refresh(ot)
    return ot


def delete_overtime_request(
    db: Session, overtime_id: int, current_user: Employee
) -> None:
    ot = db.scalar(
        select(OvertimeRequest).where(
            OvertimeRequest.id == overtime_id,
            OvertimeRequest.is_deleted == False,  # noqa: E712
        )
    )
    if ot is None:
        raise HTTPException(status_code=404, detail="Overtime request not found")

    is_owner = ot.employee_id == current_user.id
    is_admin = current_user.role_id == ROLE_ADMIN
    if not is_admin and not (
        is_owner and ot.status in {"Pending", "Withdrawn", "Rejected"}
    ):
        raise HTTPException(
            status_code=403, detail="Not permitted to delete this overtime request"
        )

    ot.is_deleted = True
    ot.deleted_at = _utc_now()
    ot.deleted_by_id = current_user.id
    ot.updated_at = _utc_now()
    ot.updated_by_id = current_user.id
    db.commit()


# ---------------------------------------------------------------------------
# Cross-module Integration & HRM Overview
# ---------------------------------------------------------------------------


def get_leave_task_conflicts(
    db: Session,
    current_user: Employee,
    employee_id: Optional[int] = None,
    project_id: Optional[int] = None,
) -> list[LeaveTaskConflictItem]:
    """Detects active Tasks whose deadlines overlap an assignee's pending/approved Vacation."""
    stmt = (
        select(Task, Employee, Vacation)
        .join(TaskAssignment, TaskAssignment.task_id == Task.id)
        .join(Employee, Employee.id == TaskAssignment.employee_id)
        .join(Vacation, Vacation.requested_by == Employee.id)
        .where(
            Task.is_deleted == False,  # noqa: E712
            Task.status != "Done",
            Task.deadline.is_not(None),
            Employee.is_deleted == False,  # noqa: E712
            Vacation.is_deleted == False,  # noqa: E712
            Vacation.status.in_(
                ["Pending", "Manager Approved", "HR Approved", "Approved"]
            ),
        )
    )

    if project_id is not None:
        require_project_access(db, project_id, current_user)
        stmt = stmt.where(Task.project_id == project_id)

    if employee_id is not None:
        stmt = stmt.where(Employee.id == employee_id)

    if current_user.role_id == ROLE_ADMIN:
        pass
    elif current_user.role_id == ROLE_MANAGER:
        stmt = stmt.where(Employee.id.in_(_department_employee_ids(db, current_user)))
    else:
        led_ids = _accessible_employee_ids_for_team_leader(db, current_user)
        allowed = list({current_user.id, *led_ids})
        stmt = stmt.where(Employee.id.in_(allowed))

    rows = db.execute(stmt).all()
    conflicts: list[LeaveTaskConflictItem] = []
    for task, emp, vac in rows:
        deadline_date = (
            task.deadline.date()
            if isinstance(task.deadline, datetime)
            else task.deadline
        )
        if vac.start_date <= deadline_date <= vac.end_date:
            conflicts.append(
                LeaveTaskConflictItem(
                    employee_id=emp.id,
                    employee_name=emp.full_name,
                    task_id=task.id,
                    task_title=task.title,
                    task_deadline=task.deadline,
                    vacation_id=vac.id,
                    vacation_status=vac.status,
                    leave_start_date=vac.start_date,
                    leave_end_date=vac.end_date,
                )
            )
    return conflicts


def get_hrm_overview(db: Session, current_user: Employee) -> HRMOverviewResponse:
    now = _utc_now()
    current_year = now.year
    month_start = date(now.year, now.month, 1)

    led_ids = get_led_team_ids(db, current_user.id)
    bal = get_or_create_leave_balance(db, current_user.id, current_year)

    active_contract = db.scalar(
        select(EmploymentContract)
        .where(
            EmploymentContract.employee_id == current_user.id,
            EmploymentContract.status == "Active",
            EmploymentContract.is_deleted == False,  # noqa: E712
        )
        .order_by(EmploymentContract.start_date.desc())
    )

    month_logs = db.scalars(
        select(AttendanceLog).where(
            AttendanceLog.employee_id == current_user.id,
            AttendanceLog.work_date >= month_start,
        )
    ).all()

    pending_leaves = (
        db.scalar(
            select(func.count(Vacation.id)).where(
                Vacation.requested_by == current_user.id,
                Vacation.is_deleted == False,  # noqa: E712
                Vacation.status.in_(["Pending", "Manager Approved", "Info Requested"]),
            )
        )
        or 0
    )

    pending_ot = (
        db.scalar(
            select(func.count(OvertimeRequest.id)).where(
                OvertimeRequest.employee_id == current_user.id,
                OvertimeRequest.is_deleted == False,  # noqa: E712
                OvertimeRequest.status.in_(["Pending", "Manager Approved"]),
            )
        )
        or 0
    )

    conflicts = get_leave_task_conflicts(db, current_user, employee_id=current_user.id)

    return HRMOverviewResponse(
        employee_id=current_user.id,
        full_name=current_user.full_name,
        role_id=current_user.role_id,
        employment_status=current_user.employment_status,
        is_team_leader=len(led_ids) > 0,
        led_team_ids=led_ids,
        leave_balance=LeaveBalanceResponse.model_validate(bal),
        active_contract=active_contract,
        attendance_days_this_month=len(month_logs),
        total_work_hours_this_month=round(
            sum(float(log.work_hours or 0) for log in month_logs), 2
        ),
        total_overtime_hours_this_month=round(
            sum(float(log.overtime_hours or 0) for log in month_logs), 2
        ),
        pending_leave_requests=int(pending_leaves),
        pending_overtime_requests=int(pending_ot),
        leave_task_conflicts=conflicts,
    )


# ---------------------------------------------------------------------------
# Backup & Logical Rollback Governance Logs (Admin only)
# ---------------------------------------------------------------------------


def record_backup_history(
    db: Session, data: BackupHistoryCreate, current_user: Employee
) -> BackupHistoryLog:
    if current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can record database backup/rollback logs.",
        )
    entry = BackupHistoryLog(
        backup_type=data.backup_type,
        database_name=data.database_name,
        backup_path=data.backup_path,
        status=data.status,
        performed_by=current_user.id,
        notes=data.notes,
    )
    db.add(entry)
    _record_audit(
        db,
        current_user,
        f"DB_BACKUP_{data.backup_type} status={data.status}",
    )
    db.commit()
    db.refresh(entry)
    return entry


def list_backup_history(
    db: Session, current_user: Employee, limit: int = 50
) -> list[BackupHistoryLog]:
    if current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can inspect database backup history.",
        )
    stmt = (
        select(BackupHistoryLog)
        .order_by(BackupHistoryLog.created_at.desc(), BackupHistoryLog.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Overtime Update (Pending owner or Admin / scoped Manager)
# ---------------------------------------------------------------------------


def update_overtime_request(
    db: Session,
    overtime_id: int,
    data: OvertimeRequestUpdate,
    current_user: Employee,
) -> OvertimeRequest:
    ot = db.scalar(
        select(OvertimeRequest).where(
            OvertimeRequest.id == overtime_id,
            OvertimeRequest.is_deleted == False,  # noqa: E712
        )
    )
    if ot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Overtime request not found",
        )
    target = _get_active_employee(db, ot.employee_id)
    is_owner = ot.employee_id == current_user.id
    is_manager_scope = current_user.role_id == ROLE_MANAGER and _is_manager_of_employee(
        db, current_user, target
    )
    if current_user.role_id != ROLE_ADMIN and not is_manager_scope and not is_owner:
        raise HTTPException(status_code=403, detail="Forbidden")
    if ot.status != "Pending" and current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only Pending overtime requests can be edited.",
        )

    values = data.model_dump(exclude_unset=True)
    if "project_id" in values and values["project_id"] is not None:
        require_project_access(db, values["project_id"], current_user)
    for field, val in values.items():
        if field == "project_id" or val is not None:
            setattr(ot, field, val)
    ot.updated_at = _utc_now()
    ot.updated_by_id = current_user.id
    _record_audit(
        db, current_user, f"HRM_OVERTIME_UPDATE id={ot.id} emp={ot.employee_id}"
    )
    db.commit()
    db.refresh(ot)
    return ot


# ---------------------------------------------------------------------------
# Payroll Calculation & Management
# ---------------------------------------------------------------------------


def _quantize_money(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _compute_net_salary(
    *,
    base_salary: Decimal,
    allowance: Decimal,
    standard_work_days: Decimal,
    actual_work_days: Decimal,
    paid_leave_days: Decimal,
    overtime_pay: Decimal,
    bonus: Decimal,
    deduction: Decimal,
) -> Decimal:
    total_paid_days = actual_work_days + paid_leave_days
    ratio = (
        min(Decimal("1.00"), total_paid_days / standard_work_days)
        if standard_work_days > 0
        else Decimal("0.00")
    )
    earned_base = _quantize_money(base_salary * ratio)
    net = earned_base + allowance + overtime_pay + bonus - deduction
    return max(Decimal("0.00"), _quantize_money(net))


def _period_bounds(pay_period: str) -> tuple[date, date]:
    year_str, month_str = pay_period.split("-")
    year_num, month_num = int(year_str), int(month_str)
    last_day = calendar.monthrange(year_num, month_num)[1]
    return date(year_num, month_num, 1), date(year_num, month_num, last_day)


def calculate_payrolls(
    db: Session,
    data: PayrollCalculateRequest,
    current_user: Employee,
) -> list[PayrollRecord]:
    """Calculate or refresh Draft payroll records from contracts, attendance, leave & approved overtime."""
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Department Manager can calculate payroll.",
        )

    if data.employee_id is not None:
        target = _get_active_employee(db, data.employee_id)
        if current_user.role_id == ROLE_MANAGER and not _is_manager_of_employee(
            db, current_user, target
        ):
            raise HTTPException(status_code=403, detail="Forbidden")
        target_employees = [target]
    elif current_user.role_id == ROLE_ADMIN:
        target_employees = list(
            db.scalars(
                select(Employee)
                .where(
                    Employee.is_deleted == False, Employee.is_active == True
                )  # noqa: E712
                .order_by(Employee.id.asc())
            ).all()
        )
    else:
        dept_ids = _department_employee_ids(db, current_user)
        target_employees = (
            list(
                db.scalars(
                    select(Employee)
                    .where(
                        Employee.id.in_(dept_ids),
                        Employee.is_deleted == False,  # noqa: E712
                        Employee.is_active == True,  # noqa: E712
                    )
                    .order_by(Employee.id.asc())
                ).all()
            )
            if dept_ids
            else []
        )

    period_start, period_end = _period_bounds(data.pay_period)
    results: list[PayrollRecord] = []

    for emp in target_employees:
        if current_user.role_id == ROLE_MANAGER and emp.id == current_user.id:
            continue

        existing = db.scalar(
            select(PayrollRecord).where(
                PayrollRecord.employee_id == emp.id,
                PayrollRecord.pay_period == data.pay_period,
            )
        )
        if (
            existing is not None
            and not existing.is_deleted
            and existing.status == "Paid"
        ):
            results.append(existing)
            continue

        contract = db.scalar(
            select(EmploymentContract)
            .where(
                EmploymentContract.employee_id == emp.id,
                EmploymentContract.status == "Active",
                EmploymentContract.is_deleted == False,  # noqa: E712
            )
            .order_by(EmploymentContract.start_date.desc())
        )
        base_salary = (
            Decimal(str(contract.base_salary)) if contract else Decimal("0.00")
        )
        allowance = Decimal(str(contract.allowance)) if contract else Decimal("0.00")
        currency = contract.currency if contract else "VND"

        att_logs = db.scalars(
            select(AttendanceLog).where(
                AttendanceLog.employee_id == emp.id,
                AttendanceLog.work_date >= period_start,
                AttendanceLog.work_date <= period_end,
            )
        ).all()

        actual_days = Decimal("0.00")
        att_ot_hours = Decimal("0.00")
        for log in att_logs:
            hours_val = Decimal(str(log.work_hours or 0))
            if hours_val > 0:
                actual_days += min(Decimal("1.00"), hours_val / Decimal("8.00"))
            elif log.status == "Half-Day":
                actual_days += Decimal("0.50")
            elif log.status in ("Present", "Remote", "Late"):
                actual_days += Decimal("1.00")
            att_ot_hours += Decimal(str(log.overtime_hours or 0))

        actual_days = actual_days.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        vacations = db.scalars(
            select(Vacation).where(
                Vacation.requested_by == emp.id,
                Vacation.status == "Approved",
                Vacation.is_deleted == False,  # noqa: E712
                Vacation.start_date <= period_end,
                Vacation.end_date >= period_start,
            )
        ).all()
        paid_leave = Decimal("0.00")
        for vac in vacations:
            overlap_start = max(vac.start_date, period_start)
            overlap_end = min(vac.end_date, period_end)
            if overlap_end >= overlap_start:
                paid_leave += Decimal(str((overlap_end - overlap_start).days + 1))

        approved_ots = db.scalars(
            select(OvertimeRequest).where(
                OvertimeRequest.employee_id == emp.id,
                OvertimeRequest.status == "HR Approved",
                OvertimeRequest.is_deleted == False,  # noqa: E712
                OvertimeRequest.work_date >= period_start,
                OvertimeRequest.work_date <= period_end,
            )
        ).all()
        approved_ot_hours = sum(
            (Decimal(str(ot.hours or 0)) for ot in approved_ots), Decimal("0.00")
        )
        total_ot_hours = (approved_ot_hours + att_ot_hours).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        hourly_rate = (
            base_salary / (data.standard_work_days * Decimal("8.00"))
            if data.standard_work_days > 0
            else Decimal("0.00")
        )
        overtime_pay = _quantize_money(
            total_ot_hours * hourly_rate * data.overtime_multiplier
        )

        bonus = existing.bonus if existing else Decimal("0.00")
        deduction = existing.deduction if existing else Decimal("0.00")
        net_salary = _compute_net_salary(
            base_salary=base_salary,
            allowance=allowance,
            standard_work_days=data.standard_work_days,
            actual_work_days=actual_days,
            paid_leave_days=paid_leave,
            overtime_pay=overtime_pay,
            bonus=bonus,
            deduction=deduction,
        )

        if existing is None:
            record = PayrollRecord(
                employee_id=emp.id,
                contract_id=contract.id if contract else None,
                pay_period=data.pay_period,
                standard_work_days=data.standard_work_days,
                actual_work_days=actual_days,
                paid_leave_days=paid_leave,
                overtime_hours=total_ot_hours,
                base_salary=base_salary,
                allowance=allowance,
                overtime_pay=overtime_pay,
                bonus=bonus,
                deduction=deduction,
                net_salary=net_salary,
                currency=currency,
                status="Draft",
                created_by_id=current_user.id,
                updated_by_id=current_user.id,
            )
            db.add(record)
            results.append(record)
        else:
            existing.is_deleted = False
            existing.deleted_at = None
            existing.deleted_by_id = None
            existing.contract_id = contract.id if contract else None
            existing.standard_work_days = data.standard_work_days
            existing.actual_work_days = actual_days
            existing.paid_leave_days = paid_leave
            existing.overtime_hours = total_ot_hours
            existing.base_salary = base_salary
            existing.allowance = allowance
            existing.overtime_pay = overtime_pay
            existing.net_salary = net_salary
            existing.currency = currency
            existing.updated_at = _utc_now()
            existing.updated_by_id = current_user.id
            results.append(existing)

    _record_audit(
        db,
        current_user,
        f"HRM_PAYROLL_CALCULATE period={data.pay_period} count={len(results)}",
    )
    db.commit()
    for r in results:
        db.refresh(r)
    return results


def list_payrolls(
    db: Session,
    current_user: Employee,
    pay_period: Optional[str] = None,
    employee_id: Optional[int] = None,
) -> list[PayrollRecord]:
    stmt = (
        select(PayrollRecord)
        .where(PayrollRecord.is_deleted == False)  # noqa: E712
        .order_by(PayrollRecord.pay_period.desc(), PayrollRecord.id.desc())
    )
    if employee_id is not None:
        target = _get_active_employee(db, employee_id)
        _require_contract_view_access(db, target, current_user)
        stmt = stmt.where(PayrollRecord.employee_id == employee_id)
    elif current_user.role_id == ROLE_ADMIN:
        pass
    elif current_user.role_id == ROLE_MANAGER:
        allowed_ids = _department_employee_ids(db, current_user)
        stmt = stmt.where(PayrollRecord.employee_id.in_(allowed_ids))
    else:
        stmt = stmt.where(PayrollRecord.employee_id == current_user.id)

    if pay_period:
        stmt = stmt.where(PayrollRecord.pay_period == pay_period)
    return list(db.scalars(stmt).all())


def get_payroll(db: Session, payroll_id: int, current_user: Employee) -> PayrollRecord:
    record = db.scalar(
        select(PayrollRecord).where(
            PayrollRecord.id == payroll_id,
            PayrollRecord.is_deleted == False,  # noqa: E712
        )
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found"
        )
    target = _get_active_employee(db, record.employee_id)
    _require_contract_view_access(db, target, current_user)
    return record


def update_payroll(
    db: Session,
    payroll_id: int,
    data: PayrollUpdate,
    current_user: Employee,
) -> PayrollRecord:
    record = get_payroll(db, payroll_id, current_user)
    target = _get_active_employee(db, record.employee_id)
    _require_contract_manage_access(db, target, current_user)
    if record.status == "Paid":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Paid payroll records cannot be edited.",
        )

    values = data.model_dump(exclude_unset=True)
    for field, val in values.items():
        if field == "note" or val is not None:
            setattr(record, field, val)

    record.net_salary = _compute_net_salary(
        base_salary=Decimal(str(record.base_salary)),
        allowance=Decimal(str(record.allowance)),
        standard_work_days=Decimal(str(record.standard_work_days)),
        actual_work_days=Decimal(str(record.actual_work_days)),
        paid_leave_days=Decimal(str(record.paid_leave_days)),
        overtime_pay=Decimal(str(record.overtime_pay)),
        bonus=Decimal(str(record.bonus)),
        deduction=Decimal(str(record.deduction)),
    )
    record.updated_at = _utc_now()
    record.updated_by_id = current_user.id
    _record_audit(
        db, current_user, f"HRM_PAYROLL_UPDATE id={record.id} net={record.net_salary}"
    )
    db.commit()
    db.refresh(record)
    return record


def update_payroll_status(
    db: Session,
    payroll_id: int,
    new_status: str,
    note: Optional[str],
    current_user: Employee,
) -> PayrollRecord:
    record = get_payroll(db, payroll_id, current_user)
    target = _get_active_employee(db, record.employee_id)
    _require_contract_manage_access(db, target, current_user)
    if new_status == "Paid" and current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can finalize payroll status as Paid.",
        )
    record.status = new_status
    if note is not None:
        record.note = note
    if new_status == "Paid":
        record.paid_at = _utc_now()
    record.updated_at = _utc_now()
    record.updated_by_id = current_user.id
    _record_audit(
        db,
        current_user,
        f"HRM_PAYROLL_STATUS id={record.id} status={new_status}",
    )
    db.commit()
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Recruitment & Onboarding Pipeline
# ---------------------------------------------------------------------------


def list_candidates(
    db: Session,
    current_user: Employee,
    stage: Optional[str] = None,
) -> list[RecruitmentCandidate]:
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Department Manager can view recruitment candidates.",
        )
    stmt = (
        select(RecruitmentCandidate)
        .where(RecruitmentCandidate.is_deleted == False)  # noqa: E712
        .order_by(RecruitmentCandidate.id.desc())
    )
    if current_user.role_id == ROLE_MANAGER:
        managed_depts = list(
            db.scalars(
                select(Department.id).where(
                    Department.manager_id == current_user.id,
                    Department.is_active == True,  # noqa: E712
                )
            ).all()
        )
        if (
            current_user.department_id
            and current_user.department_id not in managed_depts
        ):
            managed_depts.append(current_user.department_id)
        if not managed_depts:
            return []
        stmt = stmt.where(RecruitmentCandidate.department_id.in_(managed_depts))

    if stage:
        stmt = stmt.where(RecruitmentCandidate.stage == stage)
    return list(db.scalars(stmt).all())


def get_candidate(
    db: Session, candidate_id: int, current_user: Employee
) -> RecruitmentCandidate:
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Forbidden")
    cand = db.scalar(
        select(RecruitmentCandidate).where(
            RecruitmentCandidate.id == candidate_id,
            RecruitmentCandidate.is_deleted == False,  # noqa: E712
        )
    )
    if cand is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found"
        )
    return cand


def create_candidate(
    db: Session, data: CandidateCreate, current_user: Employee
) -> RecruitmentCandidate:
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Forbidden")
    if (
        data.department_id is not None
        and db.get(Department, data.department_id) is None
    ):
        raise HTTPException(status_code=409, detail="Department does not exist.")
    cand = RecruitmentCandidate(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        applied_position=data.applied_position,
        department_id=data.department_id,
        expected_salary=data.expected_salary,
        stage=data.stage,
        interview_date=data.interview_date,
        source=data.source,
        notes=data.notes,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(cand)
    _record_audit(db, current_user, f"HRM_CANDIDATE_CREATE email={data.email}")
    db.commit()
    db.refresh(cand)
    return cand


def update_candidate(
    db: Session,
    candidate_id: int,
    data: CandidateUpdate,
    current_user: Employee,
) -> RecruitmentCandidate:
    cand = get_candidate(db, candidate_id, current_user)
    values = data.model_dump(exclude_unset=True)
    if "department_id" in values and values["department_id"] is not None:
        if db.get(Department, values["department_id"]) is None:
            raise HTTPException(status_code=409, detail="Department does not exist.")
    for field, val in values.items():
        setattr(cand, field, val)
    cand.updated_at = _utc_now()
    cand.updated_by_id = current_user.id
    _record_audit(
        db, current_user, f"HRM_CANDIDATE_UPDATE id={cand.id} stage={cand.stage}"
    )
    db.commit()
    db.refresh(cand)
    return cand


def delete_candidate(db: Session, candidate_id: int, current_user: Employee) -> None:
    cand = get_candidate(db, candidate_id, current_user)
    cand.is_deleted = True
    cand.deleted_at = _utc_now()
    cand.deleted_by_id = current_user.id
    _record_audit(db, current_user, f"HRM_CANDIDATE_DELETE id={cand.id}")
    db.commit()


def onboard_candidate(
    db: Session,
    candidate_id: int,
    data: CandidateOnboardRequest,
    current_user: Employee,
) -> RecruitmentCandidate:
    """Admin-only onboarding: convert candidate into an active Employee + LeaveBalance + optional Contract."""
    if current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can onboard candidates into Employee accounts.",
        )
    cand = get_candidate(db, candidate_id, current_user)
    if cand.converted_employee_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate has already been onboarded to an Employee account.",
        )
    if db.scalar(select(Employee.id).where(Employee.email == cand.email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this email already exists.",
        )

    dept_id = (
        data.department_id if data.department_id is not None else cand.department_id
    )
    if dept_id is not None and db.get(Department, dept_id) is None:
        raise HTTPException(status_code=409, detail="Department does not exist.")
    if data.team_id is not None:
        team = db.get(Team, data.team_id)
        if team is None or (dept_id is not None and team.department_id != dept_id):
            raise HTTPException(
                status_code=409, detail="Invalid team for selected department."
            )

    emp = Employee(
        employee_code=f"EMP-{str(uuid.uuid4())[:8].upper()}",
        full_name=cand.full_name,
        email=cand.email,
        phone=cand.phone,
        department_id=dept_id,
        team_id=data.team_id,
        role_id=ROLE_EMPLOYEE,
        job_title=data.job_title or cand.applied_position,
        start_date=data.start_date or _utc_now().date(),
        password_hash=get_password_hash(data.password),
        employment_status=(
            "Probation" if data.contract_type == "Probation" else "Full-time"
        ),
    )
    db.add(emp)
    db.flush()

    db.add(
        LeaveBalance(
            employee_id=emp.id,
            leave_year=_utc_now().year,
            annual_entitlement=Decimal("12.00"),
            carried_over_days=Decimal("0.00"),
            used_days=Decimal("0.00"),
            pending_days=Decimal("0.00"),
            updated_at=_utc_now(),
        )
    )

    if data.create_contract:
        db.add(
            EmploymentContract(
                employee_id=emp.id,
                contract_code=f"HD-{emp.id}-{uuid.uuid4().hex[:4].upper()}",
                contract_type=data.contract_type,
                base_salary=data.base_salary,
                allowance=data.allowance,
                currency=data.currency,
                start_date=data.start_date or _utc_now().date(),
                status="Active",
                created_by_id=current_user.id,
                updated_by_id=current_user.id,
            )
        )

    cand.stage = "Hired"
    cand.converted_employee_id = emp.id
    cand.updated_at = _utc_now()
    cand.updated_by_id = current_user.id
    _record_audit(
        db,
        current_user,
        f"HRM_CANDIDATE_ONBOARD cand={cand.id} emp={emp.id}",
    )
    db.commit()
    db.refresh(cand)
    return cand
