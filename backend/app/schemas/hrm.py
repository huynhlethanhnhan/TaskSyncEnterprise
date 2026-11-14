# 📂 FILE: app/schemas/hrm.py
"""Pydantic v2 request and response schemas for the HRM module."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

ContractType = Literal[
    "Probation", "Fixed-Term", "Indefinite", "Part-Time", "Contractor"
]
ContractStatus = Literal["Draft", "Active", "Expired", "Terminated"]
AttendanceStatus = Literal[
    "Present", "Remote", "Late", "Half-Day", "Leave", "Absent", "Holiday"
]
OvertimeStatus = Literal[
    "Pending", "Manager Approved", "HR Approved", "Rejected", "Withdrawn"
]
PayrollStatus = Literal["Draft", "Confirmed", "Paid"]
CandidateStage = Literal[
    "Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"
]


class LeaveBalanceResponse(BaseModel):
    id: int
    employee_id: int
    leave_year: int
    annual_entitlement: Decimal
    carried_over_days: Decimal
    used_days: Decimal
    pending_days: Decimal
    remaining_days: float
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LeaveBalanceAdjust(BaseModel):
    leave_year: int = Field(ge=2020, le=2100)
    annual_entitlement: Decimal = Field(ge=Decimal("0"), le=Decimal("365"))
    carried_over_days: Decimal = Field(
        default=Decimal("0.00"), ge=Decimal("0"), le=Decimal("365")
    )


class EmploymentContractCreate(BaseModel):
    employee_id: int
    contract_code: str = Field(min_length=3, max_length=50)
    contract_type: ContractType = "Indefinite"
    base_salary: Decimal = Field(ge=Decimal("0"))
    allowance: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0"))
    currency: str = Field(default="VND", min_length=2, max_length=10)
    start_date: date
    end_date: Optional[date] = None
    status: ContractStatus = "Active"

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class EmploymentContractUpdate(BaseModel):
    contract_type: Optional[ContractType] = None
    base_salary: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    allowance: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    currency: Optional[str] = Field(default=None, min_length=2, max_length=10)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[ContractStatus] = None


class EmploymentContractResponse(BaseModel):
    id: int
    employee_id: int
    contract_code: str
    contract_type: str
    base_salary: Decimal
    allowance: Decimal
    currency: str
    start_date: date
    end_date: Optional[date] = None
    status: str
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceCheckIn(BaseModel):
    work_date: Optional[date] = None
    check_in: Optional[time] = None
    status: Literal["Present", "Remote"] = "Present"
    note: Optional[str] = Field(default=None, max_length=255)


class AttendanceCheckOut(BaseModel):
    work_date: Optional[date] = None
    check_out: Optional[time] = None
    note: Optional[str] = Field(default=None, max_length=255)


class AttendanceUpdate(BaseModel):
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    work_hours: Optional[Decimal] = Field(
        default=None, ge=Decimal("0"), le=Decimal("24")
    )
    overtime_hours: Optional[Decimal] = Field(
        default=None, ge=Decimal("0"), le=Decimal("24")
    )
    status: Optional[AttendanceStatus] = None
    note: Optional[str] = Field(default=None, max_length=255)


class AttendanceLogResponse(BaseModel):
    id: int
    employee_id: int
    work_date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    work_hours: Decimal
    overtime_hours: Decimal
    status: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OvertimeRequestCreate(BaseModel):
    project_id: Optional[int] = None
    work_date: date
    hours: Decimal = Field(gt=Decimal("0"), le=Decimal("16"))
    reason: Optional[str] = Field(default=None, max_length=500)


class OvertimeRequestUpdate(BaseModel):
    project_id: Optional[int] = None
    work_date: Optional[date] = None
    hours: Optional[Decimal] = Field(default=None, gt=Decimal("0"), le=Decimal("16"))
    reason: Optional[str] = Field(default=None, max_length=500)


class OvertimeRequestStatusUpdate(BaseModel):
    status: OvertimeStatus
    note: Optional[str] = Field(default=None, max_length=300)


class OvertimeLeaderNoteUpdate(BaseModel):
    team_leader_note: str = Field(min_length=1, max_length=300)


class OvertimeRequestResponse(BaseModel):
    id: int
    employee_id: int
    project_id: Optional[int] = None
    work_date: date
    hours: Decimal
    reason: Optional[str] = None
    status: str
    team_leader_note: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LeaveTaskConflictItem(BaseModel):
    employee_id: int
    employee_name: str
    task_id: int
    task_title: str
    task_deadline: datetime
    vacation_id: int
    vacation_status: str
    leave_start_date: date
    leave_end_date: date


class HRMOverviewResponse(BaseModel):
    employee_id: int
    full_name: str
    role_id: int
    employment_status: str
    is_team_leader: bool
    led_team_ids: list[int]
    leave_balance: LeaveBalanceResponse
    active_contract: Optional[EmploymentContractResponse] = None
    attendance_days_this_month: int
    total_work_hours_this_month: float
    total_overtime_hours_this_month: float
    pending_leave_requests: int
    pending_overtime_requests: int
    leave_task_conflicts: list[LeaveTaskConflictItem]


BackupType = Literal["FULL", "DIFFERENTIAL", "LOG", "SNAPSHOT", "LOGICAL_ROLLBACK"]
BackupStatus = Literal["SUCCESS", "VERIFIED", "FAILED", "RESTORED"]


class BackupHistoryCreate(BaseModel):
    backup_type: BackupType = "SNAPSHOT"
    database_name: str = Field(
        default="TaskSyncEnterprise", min_length=1, max_length=128
    )
    backup_path: Optional[str] = Field(default=None, max_length=500)
    status: BackupStatus = "SUCCESS"
    notes: Optional[str] = Field(default=None, max_length=500)


class BackupHistoryResponse(BaseModel):
    id: int
    backup_type: str
    database_name: str
    backup_path: Optional[str] = None
    status: str
    performed_by: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayrollCalculateRequest(BaseModel):
    pay_period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    employee_id: Optional[int] = None
    standard_work_days: Decimal = Field(
        default=Decimal("22.00"), gt=Decimal("0"), le=Decimal("31")
    )
    overtime_multiplier: Decimal = Field(
        default=Decimal("1.50"), ge=Decimal("1"), le=Decimal("4")
    )


class PayrollUpdate(BaseModel):
    actual_work_days: Optional[Decimal] = Field(
        default=None, ge=Decimal("0"), le=Decimal("31")
    )
    paid_leave_days: Optional[Decimal] = Field(
        default=None, ge=Decimal("0"), le=Decimal("31")
    )
    overtime_hours: Optional[Decimal] = Field(
        default=None, ge=Decimal("0"), le=Decimal("200")
    )
    overtime_pay: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    bonus: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    deduction: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    note: Optional[str] = Field(default=None, max_length=500)


class PayrollStatusUpdate(BaseModel):
    status: PayrollStatus
    note: Optional[str] = Field(default=None, max_length=500)


class PayrollRecordResponse(BaseModel):
    id: int
    employee_id: int
    contract_id: Optional[int] = None
    pay_period: str
    standard_work_days: Decimal
    actual_work_days: Decimal
    paid_leave_days: Decimal
    overtime_hours: Decimal
    base_salary: Decimal
    allowance: Decimal
    overtime_pay: Decimal
    bonus: Decimal
    deduction: Decimal
    net_salary: Decimal
    currency: str
    status: str
    note: Optional[str] = None
    paid_at: Optional[datetime] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    applied_position: str = Field(min_length=2, max_length=120)
    department_id: Optional[int] = None
    expected_salary: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    stage: CandidateStage = "Applied"
    interview_date: Optional[date] = None
    source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class CandidateUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    email: Optional[str] = Field(default=None, min_length=5, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=30)
    applied_position: Optional[str] = Field(default=None, min_length=2, max_length=120)
    department_id: Optional[int] = None
    expected_salary: Optional[Decimal] = Field(default=None, ge=Decimal("0"))
    stage: Optional[CandidateStage] = None
    interview_date: Optional[date] = None
    source: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class CandidateOnboardRequest(BaseModel):
    department_id: Optional[int] = None
    team_id: Optional[int] = None
    job_title: Optional[str] = Field(default=None, max_length=100)
    password: str = Field(default="Admin@Task2026!", min_length=8)
    create_contract: bool = True
    contract_type: ContractType = "Probation"
    base_salary: Decimal = Field(default=Decimal("15000000"), ge=Decimal("0"))
    allowance: Decimal = Field(default=Decimal("1500000"), ge=Decimal("0"))
    currency: str = Field(default="VND", min_length=2, max_length=10)
    start_date: Optional[date] = None


class CandidateResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    applied_position: str
    department_id: Optional[int] = None
    expected_salary: Optional[Decimal] = None
    stage: str
    interview_date: Optional[date] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    converted_employee_id: Optional[int] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
