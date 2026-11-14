# 📂 FILE: app/routers/v1/hrm.py
"""FastAPI v1 router for the Human Resource Management (HRM) subsystem."""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.cache import CacheInvalidator
from app.core.deps import RequireAdmin, RequireEmployee, RequireManager, get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.schemas.hrm import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceLogResponse,
    AttendanceUpdate,
    BackupHistoryCreate,
    BackupHistoryResponse,
    CandidateCreate,
    CandidateOnboardRequest,
    CandidateResponse,
    CandidateUpdate,
    EmploymentContractCreate,
    EmploymentContractResponse,
    EmploymentContractUpdate,
    HRMOverviewResponse,
    LeaveBalanceAdjust,
    LeaveBalanceResponse,
    LeaveTaskConflictItem,
    OvertimeLeaderNoteUpdate,
    OvertimeRequestCreate,
    OvertimeRequestResponse,
    OvertimeRequestStatusUpdate,
    OvertimeRequestUpdate,
    PayrollCalculateRequest,
    PayrollRecordResponse,
    PayrollStatusUpdate,
    PayrollUpdate,
)
from app.services import hrm_service

router = APIRouter(prefix="/hrm", tags=["HRM"])


# ---------------------------------------------------------------------------
# 360 Overview & Work-HRM Overlap Detection
# ---------------------------------------------------------------------------


@router.get(
    "/me/overview",
    response_model=HRMOverviewResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_my_hrm_overview(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.get_hrm_overview(db, current_user)


@router.get(
    "/leave-task-conflicts",
    response_model=list[LeaveTaskConflictItem],
    dependencies=[Depends(RequireEmployee)],
)
def get_leave_task_conflicts(
    employee_id: Optional[int] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.get_leave_task_conflicts(
        db, current_user, employee_id=employee_id, project_id=project_id
    )


# ---------------------------------------------------------------------------
# Leave Balances
# ---------------------------------------------------------------------------


@router.get(
    "/leave-balances",
    response_model=list[LeaveBalanceResponse],
    dependencies=[Depends(RequireEmployee)],
)
def list_leave_balances(
    leave_year: Optional[int] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    target_year = leave_year or datetime.now(timezone.utc).year
    return hrm_service.list_leave_balances(
        db, current_user, leave_year=target_year, employee_id=employee_id
    )


@router.get(
    "/leave-balances/me",
    response_model=LeaveBalanceResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_my_leave_balance(
    leave_year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    target_year = leave_year or datetime.now(timezone.utc).year
    return hrm_service.get_employee_leave_balance(
        db, current_user.id, target_year, current_user
    )


@router.get(
    "/leave-balances/{employee_id:int}",
    response_model=LeaveBalanceResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_employee_leave_balance(
    employee_id: int,
    leave_year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    target_year = leave_year or datetime.now(timezone.utc).year
    return hrm_service.get_employee_leave_balance(
        db, employee_id, target_year, current_user
    )


@router.put(
    "/leave-balances/{employee_id:int}",
    response_model=LeaveBalanceResponse,
    dependencies=[Depends(RequireManager)],
)
def adjust_employee_leave_balance(
    employee_id: int,
    data: LeaveBalanceAdjust,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    bal = hrm_service.adjust_leave_balance(db, employee_id, data, current_user)
    CacheInvalidator.invalidate_hrm(employee_id)
    return bal


# ---------------------------------------------------------------------------
# Employment Contracts (Admin + Scoped Dept Manager + Contract Owner)
# ---------------------------------------------------------------------------


@router.get(
    "/contracts",
    response_model=list[EmploymentContractResponse],
    dependencies=[Depends(RequireEmployee)],
)
def list_contracts(
    employee_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.list_contracts(
        db, current_user, employee_id=employee_id, status_filter=status_filter
    )


@router.get(
    "/contracts/{contract_id:int}",
    response_model=EmploymentContractResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.get_contract(db, contract_id, current_user)


@router.post(
    "/contracts",
    response_model=EmploymentContractResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireManager)],
)
def create_contract(
    data: EmploymentContractCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    contract = hrm_service.create_contract(db, data, current_user)
    CacheInvalidator.invalidate_hrm(contract.employee_id)
    return contract


@router.put(
    "/contracts/{contract_id:int}",
    response_model=EmploymentContractResponse,
    dependencies=[Depends(RequireManager)],
)
def update_contract(
    contract_id: int,
    data: EmploymentContractUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    contract = hrm_service.update_contract(db, contract_id, data, current_user)
    CacheInvalidator.invalidate_hrm(contract.employee_id)
    return contract


@router.delete(
    "/contracts/{contract_id:int}",
    dependencies=[Depends(RequireManager)],
)
def delete_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    hrm_service.delete_contract(db, contract_id, current_user)
    CacheInvalidator.invalidate_hrm()
    return {"message": "Employment contract archived (soft deleted)."}


# ---------------------------------------------------------------------------
# Attendance Check-In / Check-Out
# ---------------------------------------------------------------------------


@router.post(
    "/attendance/check-in",
    response_model=AttendanceLogResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireEmployee)],
)
def check_in(
    data: AttendanceCheckIn,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    log = hrm_service.check_in_attendance(db, current_user, data)
    CacheInvalidator.invalidate_hrm(current_user.id)
    return log


@router.post(
    "/attendance/check-out",
    response_model=AttendanceLogResponse,
    dependencies=[Depends(RequireEmployee)],
)
def check_out(
    data: AttendanceCheckOut,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    log = hrm_service.check_out_attendance(db, current_user, data)
    CacheInvalidator.invalidate_hrm(current_user.id)
    return log


@router.get(
    "/attendance",
    response_model=list[AttendanceLogResponse],
    dependencies=[Depends(RequireEmployee)],
)
def list_attendance(
    employee_id: Optional[int] = None,
    work_date_from: Optional[date] = None,
    work_date_to: Optional[date] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.list_attendance(
        db,
        current_user,
        employee_id=employee_id,
        work_date_from=work_date_from,
        work_date_to=work_date_to,
        limit=limit,
    )


@router.get(
    "/attendance/{attendance_id:int}",
    response_model=AttendanceLogResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_attendance_detail(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.get_attendance_log(db, attendance_id, current_user)


@router.put(
    "/attendance/{attendance_id:int}",
    response_model=AttendanceLogResponse,
    dependencies=[Depends(RequireManager)],
)
def update_attendance(
    attendance_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    log = hrm_service.update_attendance_log(db, attendance_id, data, current_user)
    CacheInvalidator.invalidate_hrm(log.employee_id)
    return log


# ---------------------------------------------------------------------------
# Overtime Requests
# ---------------------------------------------------------------------------


@router.post(
    "/overtime",
    response_model=OvertimeRequestResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireEmployee)],
)
def create_overtime(
    data: OvertimeRequestCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    ot = hrm_service.create_overtime_request(db, current_user, data)
    CacheInvalidator.invalidate_hrm(current_user.id)
    return ot


@router.get(
    "/overtime",
    response_model=list[OvertimeRequestResponse],
    dependencies=[Depends(RequireEmployee)],
)
def list_overtime(
    status_filter: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.list_overtime_requests(
        db, current_user, status_filter=status_filter, employee_id=employee_id
    )


@router.put(
    "/overtime/{overtime_id:int}",
    response_model=OvertimeRequestResponse,
    dependencies=[Depends(RequireEmployee)],
)
def update_overtime(
    overtime_id: int,
    data: OvertimeRequestUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    ot = hrm_service.update_overtime_request(db, overtime_id, data, current_user)
    CacheInvalidator.invalidate_hrm(ot.employee_id)
    return ot


@router.patch(
    "/overtime/{overtime_id:int}/leader-note",
    response_model=OvertimeRequestResponse,
    dependencies=[Depends(RequireEmployee)],
)
def add_overtime_leader_note(
    overtime_id: int,
    data: OvertimeLeaderNoteUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.add_overtime_leader_note(
        db, overtime_id, data.team_leader_note, current_user
    )


@router.patch(
    "/overtime/{overtime_id:int}/status",
    response_model=OvertimeRequestResponse,
    dependencies=[Depends(RequireEmployee)],
)
def update_overtime_status(
    overtime_id: int,
    data: OvertimeRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    ot = hrm_service.update_overtime_status(
        db, overtime_id, data.status, data.note, current_user
    )
    CacheInvalidator.invalidate_hrm(ot.employee_id)
    return ot


@router.delete(
    "/overtime/{overtime_id:int}",
    dependencies=[Depends(RequireEmployee)],
)
def delete_overtime(
    overtime_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    hrm_service.delete_overtime_request(db, overtime_id, current_user)
    CacheInvalidator.invalidate_hrm()
    return {"message": "Overtime request archived (soft deleted)."}


# ---------------------------------------------------------------------------
# Backup & Rollback Governance Audit (Admin Only)
# ---------------------------------------------------------------------------


@router.get(
    "/backups",
    response_model=list[BackupHistoryResponse],
    dependencies=[Depends(RequireAdmin)],
)
def list_backup_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.list_backup_history(db, current_user, limit=limit)


@router.post(
    "/backups",
    response_model=BackupHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireAdmin)],
)
def create_backup_log(
    data: BackupHistoryCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.record_backup_history(db, data, current_user)


# ---------------------------------------------------------------------------
# Payroll Calculation & Payslips
# ---------------------------------------------------------------------------


@router.post(
    "/payrolls/calculate",
    response_model=list[PayrollRecordResponse],
    dependencies=[Depends(RequireManager)],
)
def calculate_payrolls(
    data: PayrollCalculateRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    rows = hrm_service.calculate_payrolls(db, data, current_user)
    CacheInvalidator.invalidate_hrm()
    return rows


@router.get(
    "/payrolls",
    response_model=list[PayrollRecordResponse],
    dependencies=[Depends(RequireEmployee)],
)
def list_payrolls(
    pay_period: Optional[str] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.list_payrolls(
        db, current_user, pay_period=pay_period, employee_id=employee_id
    )


@router.get(
    "/payrolls/{payroll_id:int}",
    response_model=PayrollRecordResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_payroll(
    payroll_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.get_payroll(db, payroll_id, current_user)


@router.put(
    "/payrolls/{payroll_id:int}",
    response_model=PayrollRecordResponse,
    dependencies=[Depends(RequireManager)],
)
def update_payroll(
    payroll_id: int,
    data: PayrollUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    row = hrm_service.update_payroll(db, payroll_id, data, current_user)
    CacheInvalidator.invalidate_hrm(row.employee_id)
    return row


@router.patch(
    "/payrolls/{payroll_id:int}/status",
    response_model=PayrollRecordResponse,
    dependencies=[Depends(RequireManager)],
)
def update_payroll_status(
    payroll_id: int,
    data: PayrollStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    row = hrm_service.update_payroll_status(
        db, payroll_id, data.status, data.note, current_user
    )
    CacheInvalidator.invalidate_hrm(row.employee_id)
    return row


# ---------------------------------------------------------------------------
# Recruitment & Onboarding Pipeline
# ---------------------------------------------------------------------------


@router.get(
    "/candidates",
    response_model=list[CandidateResponse],
    dependencies=[Depends(RequireManager)],
)
def list_candidates(
    stage: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.list_candidates(db, current_user, stage=stage)


@router.post(
    "/candidates",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireManager)],
)
def create_candidate(
    data: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    cand = hrm_service.create_candidate(db, data, current_user)
    CacheInvalidator.invalidate_hrm()
    return cand


@router.get(
    "/candidates/{candidate_id:int}",
    response_model=CandidateResponse,
    dependencies=[Depends(RequireManager)],
)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return hrm_service.get_candidate(db, candidate_id, current_user)


@router.put(
    "/candidates/{candidate_id:int}",
    response_model=CandidateResponse,
    dependencies=[Depends(RequireManager)],
)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    cand = hrm_service.update_candidate(db, candidate_id, data, current_user)
    CacheInvalidator.invalidate_hrm()
    return cand


@router.delete(
    "/candidates/{candidate_id:int}",
    dependencies=[Depends(RequireManager)],
)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    hrm_service.delete_candidate(db, candidate_id, current_user)
    CacheInvalidator.invalidate_hrm()
    return {"message": "Candidate archived (soft deleted)."}


@router.post(
    "/candidates/{candidate_id:int}/onboard",
    response_model=CandidateResponse,
    dependencies=[Depends(RequireAdmin)],
)
def onboard_candidate(
    candidate_id: int,
    data: CandidateOnboardRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    cand = hrm_service.onboard_candidate(db, candidate_id, data, current_user)
    CacheInvalidator.invalidate_hrm()
    CacheInvalidator.invalidate_employee()
    return cand
