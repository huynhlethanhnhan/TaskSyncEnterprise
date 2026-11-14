"""Idempotent HRM & Upcoming Work Demo Seeder for TaskSyncEnterprise."""

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
import calendar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.models.department import Department
from app.models.employee import Employee
from app.models.hrm import (
    AttendanceLog,
    EmploymentContract,
    LeaveBalance,
    OvertimeRequest,
    PayrollRecord,
    RecruitmentCandidate,
)
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.vacation import Vacation
from app.schemas.hrm import PayrollCalculateRequest
from app.services import hrm_service


def _utc_now_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def ensure_hrm_and_upcoming_demo_data(db: Session) -> dict[str, int]:
    """Populate realistic upcoming deadlines, leaves, contracts, attendance, OT, candidates & payroll idempotently."""
    now = _utc_now_naive()
    today = now.date()
    current_period = f"{today.year:04d}-{today.month:02d}"

    stats = {
        "tasks_cleaned": 0,
        "upcoming_tasks_added": 0,
        "upcoming_leaves_added": 0,
        "contracts_added": 0,
        "leave_balances_added": 0,
        "attendance_added": 0,
        "overtime_added": 0,
        "candidates_added": 0,
        "payrolls_recalculated": 0,
    }

    # 0. Clean known mojibake task titles if present in dev DB
    bad_tasks = (
        db.execute(
            select(Task).where(
                Task.is_deleted == False,
                Task.title.like("CÃ%Trigger Audit Log%"),
            )
        )
        .scalars()
        .all()
    )
    for bt in bad_tasks:
        bt.title = "Cài đặt Trigger Audit Log và Soft-Delete"
        stats["tasks_cleaned"] += 1
    if stats["tasks_cleaned"]:
        db.commit()

    active_employees = (
        db.execute(
            select(Employee)
            .where(Employee.is_deleted == False, Employee.is_active == True)
            .order_by(Employee.id.asc())
        )
        .scalars()
        .all()
    )
    if not active_employees:
        return stats

    admin_user = next(
        (e for e in active_employees if e.role_id == ROLE_ADMIN), active_employees[0]
    )
    staff_employees = [
        e for e in active_employees if e.role_id == ROLE_EMPLOYEE
    ] + [
        e for e in active_employees if e.role_id == ROLE_MANAGER
    ] or active_employees
    active_projects = (
        db.execute(
            select(Project)
            .where(Project.is_deleted == False)
            .order_by(Project.id.asc())
        )
        .scalars()
        .all()
    )
    departments = (
        db.execute(
            select(Department)
            .where(Department.is_active == True)
            .order_by(Department.id.asc())
        )
        .scalars()
        .all()
    )

    # 1. Upcoming Deadlines within 14 days
    cutoff = now + timedelta(days=14)
    upcoming_deadline_count = (
        db.execute(
            select(func.count(Task.id)).where(
                Task.is_deleted == False,
                Task.status != "Done",
                Task.deadline.is_not(None),
                Task.deadline >= now,
                Task.deadline <= cutoff,
            )
        ).scalar()
        or 0
    )
    if upcoming_deadline_count < 5 and active_projects:
        upcoming_specs = [
            (
                "Hoàn thiện báo cáo tổng hợp Sprint & KPI quý IV",
                "In Progress",
                "Urgent",
                2,
                5,
            ),
            (
                "Rà soát bảo mật phân quyền API & Token khôi phục mật khẩu",
                "Review",
                "High",
                4,
                3,
            ),
            (
                "Kiểm thử đồng bộ bảng lương và hợp đồng nhân sự tháng hiện tại",
                "In Progress",
                "High",
                6,
                5,
            ),
            (
                "Chuẩn hóa dữ liệu backup & diễn tập kịch bản rollback SQL Server",
                "To Do",
                "Medium",
                9,
                3,
            ),
            (
                "Cập nhật tài liệu triển khai Docker Production & Nginx Gateway",
                "To Do",
                "High",
                12,
                2,
            ),
        ]
        needed = 5 - int(upcoming_deadline_count)
        for idx, (title, st, prio, offset_days, sp) in enumerate(
            upcoming_specs[:needed]
        ):
            exists = db.execute(
                select(Task.id).where(
                    Task.is_deleted == False,
                    Task.title == title,
                    Task.deadline >= now,
                )
            ).first()
            if exists:
                continue
            project = active_projects[idx % len(active_projects)]
            assignee = staff_employees[idx % len(staff_employees)]
            pm_exists = db.execute(
                select(ProjectMember.id).where(
                    ProjectMember.project_id == project.id,
                    ProjectMember.employee_id == assignee.id,
                )
            ).first()
            if not pm_exists:
                db.add(
                    ProjectMember(
                        project_id=project.id,
                        employee_id=assignee.id,
                    )
                )
                db.flush()

            new_task = Task(
                project_id=project.id,
                title=title,
                description="Hạng mục trọng tâm có thời hạn hoàn thành trong 14 ngày tới.",
                status=st,
                priority=prio,
                story_points=sp,
                progress_percent=65.0 if st == "In Progress" else (90.0 if st == "Review" else 15.0),
                deadline=now + timedelta(days=offset_days),
                created_by=admin_user.id,
            )
            db.add(new_task)
            db.flush()
            db.add(TaskAssignment(task_id=new_task.id, employee_id=assignee.id))
            stats["upcoming_tasks_added"] += 1
        db.commit()

    # 2. Upcoming Approved & Pending Leaves (>= today)
    upcoming_approved_count = (
        db.execute(
            select(func.count(Vacation.id)).where(
                Vacation.is_deleted == False,
                Vacation.start_date >= today,
                Vacation.status.in_(["Approved", "HR Approved", "Manager Approved"]),
            )
        ).scalar()
        or 0
    )
    if upcoming_approved_count < 4:
        leave_specs = [
            ("Annual Leave", 1, 2, "HR Approved", "Nghỉ phép năm cùng gia đình theo kế hoạch đã duyệt."),
            ("Annual Leave", 3, 2, "Approved", "Nghỉ phép cá nhân xử lý thủ tục hành chính."),
            ("Sick Leave", 6, 1, "Manager Approved", "Nghỉ khám sức khỏe định kỳ theo lịch bệnh viện."),
            ("Personal Leave", 10, 2, "Approved", "Nghỉ tham dự lễ tốt nghiệp tại TP.HCM."),
            ("Annual Leave", 2, 1, "Pending", "Đăng ký nghỉ phép ngắn ngày chờ quản lý phê duyệt."),
        ]
        for idx, (ltype, start_off, dur_days, lstatus, reason) in enumerate(leave_specs):
            if lstatus != "Pending" and idx >= (4 - int(upcoming_approved_count)):
                continue
            emp = staff_employees[idx % len(staff_employees)]
            start_d = today + timedelta(days=start_off)
            end_d = start_d + timedelta(days=dur_days)
            dup = db.execute(
                select(Vacation.id).where(
                    Vacation.is_deleted == False,
                    Vacation.requested_by == emp.id,
                    Vacation.start_date == start_d,
                )
            ).first()
            if dup:
                continue
            db.add(
                Vacation(
                    type=ltype,
                    start_date=start_d,
                    end_date=end_d,
                    reason=reason,
                    status=lstatus,
                    requested_by=emp.id,
                    approved_by=admin_user.id if lstatus != "Pending" else None,
                    approved_at=now if lstatus != "Pending" else None,
                )
            )
            stats["upcoming_leaves_added"] += 1
        db.commit()

    # 3. Active Employment Contracts for active employees
    contracted_emp_ids = set(
        db.execute(
            select(EmploymentContract.employee_id).where(
                EmploymentContract.is_deleted == False,
                EmploymentContract.status == "Active",
            )
        )
        .scalars()
        .all()
    )
    for idx, emp in enumerate(active_employees):
        if emp.id in contracted_emp_ids:
            continue
        code = f"HDLD-{today.year}-{emp.id:04d}"
        exists_code = db.execute(
            select(EmploymentContract.id).where(
                EmploymentContract.contract_code == code
            )
        ).first()
        if exists_code:
            code = f"HDLD-{today.year}-{emp.id:04d}-R1"

        if emp.role_id == ROLE_ADMIN:
            base_sal = Decimal("42000000.00")
            allow = Decimal("4500000.00")
            ctype = "Indefinite"
        elif emp.role_id == ROLE_MANAGER:
            base_sal = Decimal(str(30000000 + (idx % 4) * 2000000))
            allow = Decimal("3000000.00")
            ctype = "Indefinite"
        else:
            base_sal = Decimal(str(17000000 + (idx % 6) * 1800000))
            allow = Decimal("1800000.00")
            ctype = "Fixed-Term" if idx % 3 == 0 else "Indefinite"

        start_d = date(today.year, max(1, today.month - 6), 1)
        end_d = date(today.year + 1, start_d.month, 1) if ctype == "Fixed-Term" else None
        db.add(
            EmploymentContract(
                employee_id=emp.id,
                contract_code=code,
                contract_type=ctype,
                base_salary=base_sal,
                allowance=allow,
                currency="VND",
                start_date=start_d,
                end_date=end_d,
                status="Active",
                created_by_id=admin_user.id,
            )
        )
        stats["contracts_added"] += 1
    if stats["contracts_added"]:
        db.commit()

    # 4. Leave Balances for current year
    existing_lb_emp_ids = set(
        db.execute(
            select(LeaveBalance.employee_id).where(
                LeaveBalance.leave_year == today.year
            )
        )
        .scalars()
        .all()
    )
    for idx, emp in enumerate(active_employees):
        if emp.id in existing_lb_emp_ids:
            continue
        db.add(
            LeaveBalance(
                employee_id=emp.id,
                leave_year=today.year,
                annual_entitlement=Decimal("14.00" if emp.role_id != ROLE_EMPLOYEE else "12.00"),
                carried_over_days=Decimal(str(idx % 3)),
                used_days=Decimal(str((idx % 4) + 1)),
                pending_days=Decimal("1.00" if idx % 5 == 0 else "0.00"),
                updated_at=now,
            )
        )
        stats["leave_balances_added"] += 1
    if stats["leave_balances_added"]:
        db.commit()

    # 5. Attendance Logs in current month (up to 10 weekdays per active employee)
    first_of_month = date(today.year, today.month, 1)
    _, last_day_num = calendar.monthrange(today.year, today.month)
    sample_days: list[date] = []
    cur = first_of_month
    limit_date = min(today, date(today.year, today.month, last_day_num))
    while cur <= limit_date:
        if cur.weekday() < 5:  # Mon-Fri
            sample_days.append(cur)
        cur += timedelta(days=1)
    sample_days = sample_days[-10:]

    existing_att_pairs = set(
        db.execute(
            select(AttendanceLog.employee_id, AttendanceLog.work_date).where(
                AttendanceLog.work_date >= first_of_month
            )
        ).all()
    )
    for emp in active_employees:
        for d_idx, wd in enumerate(sample_days):
            if (emp.id, wd) in existing_att_pairs:
                continue
            late = (emp.id + d_idx) % 7 == 0
            in_time = time(8, 52 if late else 28)
            db.add(
                AttendanceLog(
                    employee_id=emp.id,
                    work_date=wd,
                    check_in=in_time,
                    check_out=time(17, 35),
                    work_hours=Decimal("7.50" if late else "8.00"),
                    overtime_hours=Decimal("0.00"),
                    status="Late" if late else "Present",
                    note="Chấm công chuẩn hệ thống" if not late else "Đi muộn nhẹ do kẹt xe",
                )
            )
            stats["attendance_added"] += 1
    if stats["attendance_added"]:
        db.commit()

    # 6. Overtime Requests
    ot_count = (
        db.execute(
            select(func.count(OvertimeRequest.id)).where(
                OvertimeRequest.is_deleted == False
            )
        ).scalar()
        or 0
    )
    if ot_count < 5 and active_projects:
        ot_specs = [
            (2.5, "Approved", "Triển khai vá bảo mật & tối ưu truy vấn SQL Server cuối sprint"),
            (3.0, "Approved", "Hoàn thiện pipeline CI/CD & kiểm thử hiệu năng tải cao"),
            (2.0, "Approved", "Hỗ trợ đồng bộ dữ liệu hợp đồng & bảng lương kỳ mới"),
            (2.0, "Pending", "Nghiên cứu tích hợp cảnh báo thông minh Realtime Dashboard"),
            (1.5, "Pending", "Kiểm tra lại toàn bộ tài liệu hướng dẫn vận hành hệ thống"),
        ]
        for idx, (hrs, ot_status, reason) in enumerate(ot_specs):
            if ot_count + stats["overtime_added"] >= 5:
                break
            emp = staff_employees[idx % len(staff_employees)]
            wd = sample_days[-1 - (idx % max(1, len(sample_days)))] if sample_days else today
            db.add(
                OvertimeRequest(
                    employee_id=emp.id,
                    project_id=active_projects[idx % len(active_projects)].id,
                    work_date=wd,
                    hours=Decimal(str(hrs)),
                    reason=reason,
                    status=ot_status,
                    approved_by=admin_user.id if ot_status == "Approved" else None,
                    approved_at=now if ot_status == "Approved" else None,
                    created_by_id=emp.id,
                )
            )
            stats["overtime_added"] += 1
        db.commit()

    # 7. Recruitment Candidates pipeline
    cand_count = (
        db.execute(
            select(func.count(RecruitmentCandidate.id)).where(
                RecruitmentCandidate.is_deleted == False
            )
        ).scalar()
        or 0
    )
    if cand_count == 0:
        cand_specs = [
            ("Trần Gia Hưng", "tranhung.dev@example.com", "0903111222", "Senior Backend Engineer (Python/FastAPI)", 32000000, "Interview", 2, "LinkedIn", "Kinh nghiệm 5 năm SQL Server & FastAPI microservices."),
            ("Nguyễn Ngọc Minh Anh", "minhanh.fe@example.com", "0903222333", "Frontend React/TypeScript Lead", 29000000, "Offer", 1, "ITViec", "Đã vượt qua vòng technical & architecture review."),
            ("Lê Quốc Việt", "vietle.qa@example.com", "0903333444", "QA Automation Engineer", 22000000, "Screening", 4, "TopCV", "Thành thạo Playwright & API contract testing."),
            ("Phạm Thị Thu Trang", "thutrang.hr@example.com", "0903444555", "HR & C&B Specialist", 20000000, "Applied", 5, "Referral", "Có kinh nghiệm tính lương C&B doanh nghiệp IT."),
            ("Đoàn Hải Đăng", "haidang.devops@example.com", "0903555666", "DevOps / SRE Engineer", 35000000, "Interview", 3, "LinkedIn", "Chuyên sâu Docker, Nginx, Prometheus & SQL Backup DR."),
            ("Võ Hoàng Yến", "yenvo.ba@example.com", "0903666777", "Product Business Analyst", 24000000, "Hired", -2, "ITViec", "Đã nhận offer, sẵn sàng onboard đầu tuần tới."),
        ]
        for idx, (name, mail, phone, pos, sal, stage, iv_off, src, notes) in enumerate(cand_specs):
            dept_id = departments[idx % len(departments)].id if departments else None
            db.add(
                RecruitmentCandidate(
                    full_name=name,
                    email=mail,
                    phone=phone,
                    applied_position=pos,
                    department_id=dept_id,
                    expected_salary=Decimal(str(sal)),
                    stage=stage,
                    interview_date=today + timedelta(days=iv_off),
                    source=src,
                    notes=notes,
                    created_by_id=admin_user.id,
                )
            )
            stats["candidates_added"] += 1
        db.commit()

    # 8. Calculate real current-month Payroll records & mark realistic sample statuses
    try:
        recalculated = hrm_service.calculate_payrolls(
            db,
            PayrollCalculateRequest(
                pay_period=current_period,
                standard_work_days=Decimal("22.00"),
                overtime_multiplier=Decimal("1.50"),
            ),
            admin_user,
        )
        stats["payrolls_recalculated"] = len(recalculated)
        # Promote top 3 non-zero records to Paid / Approved for realistic showcase
        if recalculated:
            for r_idx, rec in enumerate(recalculated[:4]):
                if rec.net_salary and rec.net_salary > 0:
                    if r_idx < 2:
                        rec.status = "Paid"
                        rec.paid_at = now
                    elif r_idx == 2:
                        rec.status = "Approved"
            db.commit()
    except Exception as exc:
        print(f"[SEED_HRM] Payroll calculation note: {exc}")
        db.rollback()

    return stats


if __name__ == "__main__":
    from app.database import SessionLocal

    session = SessionLocal()
    try:
        result = ensure_hrm_and_upcoming_demo_data(session)
        print("[SEED_HRM] Completed:", result)
    finally:
        session.close()
