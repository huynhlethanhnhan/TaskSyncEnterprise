# 📂 FILE: app/models/hrm.py
"""HRM SQLAlchemy 2.0 models (Backend-First schema extension)."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Time,
    Unicode,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import AuditMixin

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.employee import Employee
    from app.models.project import Project


class LeaveBalance(Base):
    """Tracks annual leave quotas, carried-over days, and balances per employee/year."""

    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "leave_year", name="uq_leave_balances_emp_year"
        ),
        CheckConstraint(
            "leave_year BETWEEN 2020 AND 2100", name="ck_leave_balances_year"
        ),
        CheckConstraint(
            "annual_entitlement >= 0 AND carried_over_days >= 0 "
            "AND used_days >= 0 AND pending_days >= 0",
            name="ck_leave_balances_non_negative",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )
    leave_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    annual_entitlement: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("12.00"),
        default=Decimal("12.00"),
    )
    carried_over_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    used_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    pending_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[employee_id], lazy="joined"
    )

    @property
    def remaining_days(self) -> float:
        """Computes available leave days dynamically across both SQL Server and SQLite."""
        entitlement = Decimal(str(self.annual_entitlement or 0))
        carried = Decimal(str(self.carried_over_days or 0))
        used = Decimal(str(self.used_days or 0))
        pending = Decimal(str(self.pending_days or 0))
        return float(round(entitlement + carried - used - pending, 2))


class EmploymentContract(Base, AuditMixin):
    """Stores employee compensation & contract lifecycle with soft-delete and audit trail."""

    __tablename__ = "employment_contracts"
    __table_args__ = (
        CheckConstraint(
            "base_salary >= 0 AND allowance >= 0", name="ck_contracts_salary"
        ),
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date", name="ck_contracts_dates"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )
    contract_code: Mapped[str] = mapped_column(Unicode(50), unique=True, nullable=False)
    contract_type: Mapped[str] = mapped_column(
        Unicode(50),
        nullable=False,
        server_default=text("N'Indefinite'"),
        default="Indefinite",
    )
    base_salary: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    allowance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    currency: Mapped[str] = mapped_column(
        Unicode(10), nullable=False, server_default=text("N'VND'"), default="VND"
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Unicode(30),
        nullable=False,
        server_default=text("N'Active'"),
        default="Active",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[employee_id], lazy="joined"
    )


class AttendanceLog(Base):
    """Daily attendance check-in/check-out records per employee."""

    __tablename__ = "attendance_logs"
    __table_args__ = (
        UniqueConstraint(
            "employee_id", "work_date", name="uq_attendance_logs_emp_date"
        ),
        CheckConstraint(
            "work_hours >= 0 AND work_hours <= 24 AND overtime_hours >= 0 AND overtime_hours <= 24",
            name="ck_attendance_logs_hours",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_in: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    check_out: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    work_hours: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    overtime_hours: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    status: Mapped[str] = mapped_column(
        Unicode(30),
        nullable=False,
        server_default=text("N'Present'"),
        default="Present",
    )
    note: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )

    employee: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[employee_id], lazy="joined"
    )


class OvertimeRequest(Base, AuditMixin):
    """Tracks employee overtime requests linked to Work Management projects with multi-level approval."""

    __tablename__ = "overtime_requests"
    __table_args__ = (
        CheckConstraint("hours > 0 AND hours <= 16", name="ck_overtime_requests_hours"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )
    project_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("projects.id"), nullable=True, index=True
    )
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hours: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    status: Mapped[str] = mapped_column(
        Unicode(30),
        nullable=False,
        server_default=text("N'Pending'"),
        default="Pending",
    )
    team_leader_note: Mapped[Optional[str]] = mapped_column(Unicode(300), nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[employee_id], lazy="joined"
    )
    approver: Mapped[Optional["Employee"]] = relationship(
        "Employee", foreign_keys=[approved_by], lazy="joined"
    )
    project: Mapped[Optional["Project"]] = relationship(
        "Project", foreign_keys=[project_id]
    )


class BackupHistoryLog(Base):
    """Stores database backup, snapshot, and logical rollback metadata."""

    __tablename__ = "backup_history_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    backup_type: Mapped[str] = mapped_column(Unicode(30), nullable=False)
    database_name: Mapped[str] = mapped_column(Unicode(128), nullable=False)
    backup_path: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    status: Mapped[str] = mapped_column(
        Unicode(30),
        nullable=False,
        server_default=text("N'SUCCESS'"),
        default="SUCCESS",
    )
    performed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )

    performer: Mapped[Optional["Employee"]] = relationship(
        "Employee", foreign_keys=[performed_by]
    )


class PayrollRecord(Base, AuditMixin):
    """Monthly employee payroll snapshot computed from active contract, attendance, leave & approved overtime."""

    __tablename__ = "payroll_records"
    __table_args__ = (
        UniqueConstraint("employee_id", "pay_period", name="uq_payroll_emp_period"),
        CheckConstraint(
            "standard_work_days > 0 AND actual_work_days >= 0 "
            "AND paid_leave_days >= 0 AND overtime_hours >= 0",
            name="ck_payroll_work_days",
        ),
        CheckConstraint(
            "base_salary >= 0 AND allowance >= 0 AND overtime_pay >= 0 "
            "AND bonus >= 0 AND deduction >= 0 AND net_salary >= 0",
            name="ck_payroll_amounts",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), nullable=False, index=True
    )
    contract_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employment_contracts.id"), nullable=True
    )
    pay_period: Mapped[str] = mapped_column(Unicode(7), nullable=False, index=True)
    standard_work_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("22.00"),
        default=Decimal("22.00"),
    )
    actual_work_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    paid_leave_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    overtime_hours: Mapped[Decimal] = mapped_column(
        Numeric(6, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    base_salary: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    allowance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    overtime_pay: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    bonus: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    deduction: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    net_salary: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        server_default=text("0.00"),
        default=Decimal("0.00"),
    )
    currency: Mapped[str] = mapped_column(
        Unicode(10), nullable=False, server_default=text("N'VND'"), default="VND"
    )
    status: Mapped[str] = mapped_column(
        Unicode(30), nullable=False, server_default=text("N'Draft'"), default="Draft"
    )
    note: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    employee: Mapped["Employee"] = relationship(
        "Employee", foreign_keys=[employee_id], lazy="joined"
    )
    contract: Mapped[Optional["EmploymentContract"]] = relationship(
        "EmploymentContract", foreign_keys=[contract_id]
    )


class RecruitmentCandidate(Base, AuditMixin):
    """Tracks HRM recruitment pipeline candidates and onboarding conversion to Employee."""

    __tablename__ = "recruitment_candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(Unicode(150), nullable=False)
    email: Mapped[str] = mapped_column(Unicode(150), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(Unicode(30), nullable=True)
    applied_position: Mapped[str] = mapped_column(Unicode(120), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id"), nullable=True, index=True
    )
    expected_salary: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    stage: Mapped[str] = mapped_column(
        Unicode(30),
        nullable=False,
        server_default=text("N'Applied'"),
        default="Applied",
    )
    interview_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    converted_employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("SYSUTCDATETIME()")
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    department: Mapped[Optional["Department"]] = relationship(
        "Department", foreign_keys=[department_id]
    )
    converted_employee: Mapped[Optional["Employee"]] = relationship(
        "Employee", foreign_keys=[converted_employee_id]
    )
