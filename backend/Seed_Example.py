"""Deterministic enterprise demo dataset for TaskSyncEnterprise.

Run after Alembic migrations:
    python Seed_Example.py

Use ``--reset`` only when replacing an existing demo dataset. All timestamps are
stored as naive UTC because the current SQL Server models use ``DATETIME``.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select, update

import app.models  # noqa: F401 - register every mapped table before reset
from app.core.security import get_password_hash
from app.database import Base, SessionLocal
from app.models.audit import AuditLog
from app.models.department import Department
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.role import Role
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_checklist import TaskChecklist
from app.models.task_comment import TaskComment
from app.models.team import Team
from app.models.vacation import Vacation

DEMO_PASSWORD = "TaskSync@2026"

DEPARTMENTS = [
    ("EXEC", "Ban điều hành", "Điều phối chiến lược và vận hành toàn doanh nghiệp"),
    ("IT", "Công nghệ thông tin", "Phát triển sản phẩm và vận hành nền tảng số"),
    ("PRODUCT", "Sản phẩm", "Nghiên cứu người dùng và quản lý vòng đời sản phẩm"),
    ("HR", "Nhân sự", "Tuyển dụng, phát triển và chăm sóc nhân sự"),
    ("FIN", "Tài chính - Kế toán", "Ngân sách, kế toán và kiểm soát tài chính"),
    ("SALES", "Kinh doanh", "Phát triển khách hàng và tăng trưởng doanh thu"),
    ("OPS", "Vận hành", "Chuẩn hóa quy trình và chất lượng dịch vụ"),
]

MANAGERS = [
    ("MGR001", "Nguyễn Minh Khang", "manager.it@tasksync.example.com", "IT", "Giám đốc Công nghệ"),
    ("MGR002", "Trần Thu Hà", "manager.product@tasksync.example.com", "PRODUCT", "Giám đốc Sản phẩm"),
    ("MGR003", "Lê Hoàng Anh", "manager.hr@tasksync.example.com", "HR", "Trưởng phòng Nhân sự"),
    ("MGR004", "Phạm Ngọc Mai", "manager.finance@tasksync.example.com", "FIN", "Trưởng phòng Tài chính"),
    ("MGR005", "Vũ Quốc Bảo", "manager.sales@tasksync.example.com", "SALES", "Giám đốc Kinh doanh"),
    ("MGR006", "Đặng Thanh Tâm", "manager.ops@tasksync.example.com", "OPS", "Trưởng phòng Vận hành"),
    ("MGR007", "Bùi Gia Hân", "manager.exec@tasksync.example.com", "EXEC", "Quản lý Điều hành"),
]

STAFF_BY_DEPARTMENT = {
    "EXEC": ["Huỳnh Lê Thành Nhân", "Đỗ Minh Châu", "Nguyễn Hải Yến", "Trần Gia Bảo"],
    "IT": ["Lê Đức Anh", "Phạm Tuấn Kiệt", "Nguyễn Thảo Vy", "Võ Minh Trí"],
    "PRODUCT": ["Trần Khánh Linh", "Nguyễn Quốc Huy", "Đặng Ngọc Ánh", "Lê Thanh Bình"],
    "HR": ["Phan Mỹ Duyên", "Vũ Thùy Trang", "Ngô Đức Mạnh", "Bùi Hoài Nam"],
    "FIN": ["Nguyễn Phương Thảo", "Trần Nhật Minh", "Lâm Bảo Ngọc", "Đỗ Quốc Trung"],
    "SALES": ["Hoàng Minh Quân", "Phạm Khánh An", "Lý Tuệ Nhi", "Nguyễn Thành Đạt"],
    "OPS": ["Trương Gia Linh", "Võ Anh Tú", "Đinh Ngọc Huyền", "Phan Hoàng Long"],
}

PROJECT_NAMES = [
    "Nền tảng TaskSync Enterprise 2026",
    "Ứng dụng nhân sự nội bộ",
    "Kho dữ liệu báo cáo quản trị",
    "Chuẩn hóa quy trình tuyển dụng",
    "Tự động hóa đối soát tài chính",
    "Cổng chăm sóc khách hàng doanh nghiệp",
    "Tối ưu vận hành đa chi nhánh",
    "Chương trình phát triển quản lý",
    "Hệ thống cảnh báo SLA thời gian thực",
    "Nâng cấp bảo mật và phân quyền",
    "Phân tích hiệu suất phòng ban",
    "Trung tâm thông báo hợp nhất",
]

TASK_TEMPLATES = [
    ("Khảo sát yêu cầu nghiệp vụ", "High", "Done", 100),
    ("Thiết kế luồng dữ liệu và phân quyền", "High", "In Progress", 65),
    ("Xây dựng API và kiểm thử tích hợp", "Urgent", "In Progress", 45),
    ("Hoàn thiện giao diện đa trình duyệt", "Medium", "To Do", 10),
    ("Kiểm thử nghiệm thu với người dùng", "Medium", "To Do", 0),
    ("Triển khai và theo dõi sau phát hành", "Low", "To Do", 0),
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def build_seed_plan(now: datetime | None = None) -> dict[str, list[dict]]:
    now = now or _utc_now()
    employees: list[dict] = [
        {
            "employee_code": "ADM001",
            "full_name": "Quản trị viên Hệ thống",
            "email": "admin@tasksync.example.com",
            "role": "admin",
            "department_code": "EXEC",
            "job_title": "System Administrator",
        },
        {
            "employee_code": "ADM002",
            "full_name": "Quản trị viên Vận hành",
            "email": "operations.admin@tasksync.example.com",
            "role": "admin",
            "department_code": "EXEC",
            "job_title": "Operations Administrator",
        },
    ]

    for code, full_name, email, department_code, job_title in MANAGERS:
        employees.append(
            {
                "employee_code": code,
                "full_name": full_name,
                "email": email,
                "role": "manager",
                "department_code": department_code,
                "manager_code": "ADM001",
                "job_title": job_title,
            }
        )

    staff_number = 1
    manager_by_department = {department_code: code for code, _, _, department_code, _ in MANAGERS}
    for department_code, names in STAFF_BY_DEPARTMENT.items():
        for index, full_name in enumerate(names, start=1):
            employees.append(
                {
                    "employee_code": f"EMP{staff_number:03d}",
                    "full_name": full_name,
                    "email": f"employee{staff_number:03d}@tasksync.example.com",
                    "role": "employee",
                    "department_code": department_code,
                    "manager_code": manager_by_department[department_code],
                    "job_title": f"Chuyên viên {DEPARTMENTS[[d[0] for d in DEPARTMENTS].index(department_code)][1]}",
                    "team_index": (index - 1) % 2,
                }
            )
            staff_number += 1

    projects: list[dict] = []
    tasks: list[dict] = []
    department_codes = [item[0] for item in DEPARTMENTS]
    for project_index, name in enumerate(PROJECT_NAMES, start=1):
        department_code = department_codes[(project_index - 1) % len(department_codes)]
        manager_code = manager_by_department[department_code]
        status = ("Active", "Planning", "Active", "Completed")[project_index % 4]
        progress = {"Planning": 20, "Active": 58, "Completed": 100}[status]
        project_code = f"PRJ{project_index:03d}"
        projects.append(
            {
                "project_code": project_code,
                "name": name,
                "description": f"Dự án mẫu phục vụ kiểm thử đầy đủ dữ liệu cho phòng {department_code}.",
                "department_code": department_code,
                "manager_code": manager_code,
                "status": status,
                "priority": ("High", "Medium", "Low")[project_index % 3],
                "progress_percent": progress,
            }
        )
        department_staff = [item for item in employees if item.get("department_code") == department_code and item["role"] == "employee"]
        for task_index, (title, priority, task_status, task_progress) in enumerate(TASK_TEMPLATES, start=1):
            assignee = department_staff[(project_index + task_index) % len(department_staff)]
            deadline_offset = -2 if priority == "Urgent" else project_index + task_index + 2
            tasks.append(
                {
                    "task_code": f"{project_code}-T{task_index:02d}",
                    "project_code": project_code,
                    "title": f"{title} — {name}",
                    "description": "Dữ liệu demo có dấu tiếng Việt để kiểm tra SQL Server, API JSON, React và DOM.",
                    "priority": priority,
                    "status": task_status,
                    "progress_percent": task_progress,
                    "story_points": (3, 5, 8, 5, 3, 2)[task_index - 1],
                    "deadline": now + timedelta(days=deadline_offset),
                    "created_by_code": manager_code,
                    "assignee_code": assignee["employee_code"],
                }
            )

    notification_templates = [
        ("TASKS", "Bạn có công việc mới", "Một công việc vừa được phân công và đang chờ bạn xử lý.", "HIGH"),
        ("PROJECTS", "Dự án vừa cập nhật", "Tiến độ dự án đã thay đổi, vui lòng kiểm tra nội dung mới nhất.", "NORMAL"),
        ("SYSTEM", "TaskSync đang hoạt động", "Kênh thông báo thời gian thực đã sẵn sàng.", "LOW"),
    ]
    notifications: list[dict] = []
    for employee_index, employee in enumerate(employees):
        for notification_index, (kind, title, message, priority) in enumerate(notification_templates):
            created_at = now - timedelta(minutes=employee_index * 3 + notification_index * 17)
            is_read = notification_index == 2
            notifications.append(
                {
                    "employee_code": employee["employee_code"],
                    "type": kind,
                    "title": title,
                    "message": message,
                    "priority": priority,
                    "status": "READ" if is_read else "SENT",
                    "channel": "IN_APP",
                    "event_id": f"seed-{employee['employee_code'].lower()}-{notification_index + 1}",
                    "context_json": json.dumps({"seed": "Seed_Example", "generated_at": now.isoformat()}, ensure_ascii=False),
                    "is_read": is_read,
                    "read_at": created_at + timedelta(minutes=5) if is_read else None,
                    "created_at": created_at,
                }
            )

    return {"employees": employees, "projects": projects, "tasks": tasks, "notifications": notifications}


EXPECTED_COUNTS = {
    "admins": 2,
    "managers": len(MANAGERS),
    "employees": 2 + len(MANAGERS) + sum(len(names) for names in STAFF_BY_DEPARTMENT.values()),
    "departments": len(DEPARTMENTS),
    "teams": len(DEPARTMENTS) * 2,
    "projects": len(PROJECT_NAMES),
    "tasks": len(PROJECT_NAMES) * len(TASK_TEMPLATES),
    "notifications": (2 + len(MANAGERS) + sum(len(names) for names in STAFF_BY_DEPARTMENT.values())) * 3,
}


def _reset_demo_data(db) -> None:
    db.execute(update(Employee).values(manager_id=None))
    db.flush()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()


def seed(reset_existing: bool = False) -> dict[str, int]:
    plan = build_seed_plan()
    db = SessionLocal()
    try:
        existing_employees = db.scalar(select(func.count(Employee.id))) or 0
        if existing_employees and not reset_existing:
            raise RuntimeError("Database đã có dữ liệu. Chạy lại với --reset nếu đây là môi trường demo.")
        if reset_existing:
            _reset_demo_data(db)

        roles = {
            "admin": Role(id=1, role_name="admin", description="Quản trị toàn hệ thống", is_system=True),
            "manager": Role(id=2, role_name="manager", description="Quản lý phòng ban và dự án", is_system=True),
            "employee": Role(id=3, role_name="employee", description="Nhân viên sử dụng hệ thống", is_system=True),
        }
        db.add_all(roles.values())
        db.flush()

        departments: dict[str, Department] = {}
        teams: dict[tuple[str, int], Team] = {}
        for code, name, description in DEPARTMENTS:
            department = Department(department_code=code, name=name, description=description, is_active=True)
            db.add(department)
            db.flush()
            departments[code] = department
            for team_index in range(2):
                team = Team(
                    department_id=department.id,
                    team_code=f"{code}-T{team_index + 1}",
                    name=f"{name} — Nhóm {team_index + 1}",
                    description=f"Nhóm demo số {team_index + 1} của {name}",
                    is_active=True,
                )
                db.add(team)
                db.flush()
                teams[(code, team_index)] = team

        password_hash = get_password_hash(DEMO_PASSWORD)
        employees: dict[str, Employee] = {}
        for record in plan["employees"]:
            manager = employees.get(record.get("manager_code"))
            department_code = record.get("department_code")
            team_index = record.get("team_index", 0)
            employee = Employee(
                employee_code=record["employee_code"],
                full_name=record["full_name"],
                email=record["email"],
                phone=f"090{len(employees) + 1000000:07d}"[-10:],
                gender="Khác" if len(employees) % 3 == 0 else ("Nam" if len(employees) % 2 == 0 else "Nữ"),
                address="Thành phố Hồ Chí Minh, Việt Nam",
                date_of_birth=date(1988 + len(employees) % 12, (len(employees) % 12) + 1, (len(employees) % 24) + 1),
                start_date=date(2022 + len(employees) % 4, (len(employees) % 12) + 1, 1),
                password_hash=password_hash,
                department_id=departments[department_code].id if department_code else None,
                team_id=teams[(department_code, team_index)].id if department_code else None,
                role_id=roles[record["role"]].id,
                manager_id=manager.id if manager else None,
                job_title=record["job_title"],
                is_active=True,
                is_deleted=False,
                is_first_login=False,
            )
            db.add(employee)
            db.flush()
            employees[record["employee_code"]] = employee

        projects: dict[str, Project] = {}
        for index, record in enumerate(plan["projects"]):
            manager = employees[record["manager_code"]]
            project = Project(
                project_code=record["project_code"],
                name=record["name"],
                description=record["description"],
                start_date=date.today() - timedelta(days=60 - index * 2),
                end_date=date.today() + timedelta(days=120 + index * 3),
                status=record["status"],
                priority=record["priority"],
                budget=250_000_000 + index * 25_000_000,
                progress_percent=record["progress_percent"],
                created_by=manager.id,
            )
            db.add(project)
            db.flush()
            projects[record["project_code"]] = project
            member_codes = [record["manager_code"]] + [
                item["employee_code"] for item in plan["employees"]
                if item.get("department_code") == record["department_code"] and item["role"] == "employee"
            ]
            db.add_all(ProjectMember(project_id=project.id, employee_id=employees[code].id) for code in member_codes)

        for index, record in enumerate(plan["tasks"]):
            task = Task(
                project_id=projects[record["project_code"]].id,
                title=record["title"],
                description=record["description"],
                priority=record["priority"],
                status=record["status"],
                story_points=record["story_points"],
                progress_percent=record["progress_percent"],
                deadline=record["deadline"],
                created_by=employees[record["created_by_code"]].id,
                created_at=_utc_now() - timedelta(days=index % 20),
            )
            db.add(task)
            db.flush()
            assignee = employees[record["assignee_code"]]
            db.add(TaskAssignment(task_id=task.id, employee_id=assignee.id))
            db.add_all(
                [
                    TaskChecklist(task_id=task.id, title="Đã xác nhận yêu cầu đầu vào", is_completed=True),
                    TaskChecklist(task_id=task.id, title="Hoàn tất kiểm thử và bàn giao", is_completed=record["status"] == "Done"),
                    TaskComment(task_id=task.id, employee_id=assignee.id, content="Đã cập nhật tiến độ bằng dữ liệu demo tiếng Việt."),
                ]
            )

        for record in plan["notifications"]:
            db.add(
                Notification(
                    employee_id=employees[record["employee_code"]].id,
                    type=record["type"],
                    title=record["title"],
                    message=record["message"],
                    priority=record["priority"],
                    status=record["status"],
                    channel=record["channel"],
                    event_id=record["event_id"],
                    context_json=record["context_json"],
                    is_read=record["is_read"],
                    read_at=record["read_at"],
                    created_at=record["created_at"],
                )
            )

        for employee in employees.values():
            db.add_all(
                [
                    NotificationPreference(employee_id=employee.id, notification_type="TASKS", channel="IN_APP", enabled=True),
                    NotificationPreference(employee_id=employee.id, notification_type="TASKS", channel="WEBSOCKET", enabled=True),
                    NotificationPreference(employee_id=employee.id, notification_type="PROJECTS", channel="IN_APP", enabled=True),
                ]
            )

        staff = [item for item in plan["employees"] if item["role"] == "employee"]
        for index, record in enumerate(staff[:14]):
            requester = employees[record["employee_code"]]
            manager = employees[record["manager_code"]]
            status = ("Pending", "Approved", "Rejected")[index % 3]
            db.add(
                Vacation(
                    type="Nghỉ phép năm" if index % 2 == 0 else "Làm việc từ xa",
                    start_date=date.today() + timedelta(days=index + 1),
                    end_date=date.today() + timedelta(days=index + 2),
                    reason="Dữ liệu mẫu để kiểm thử quy trình phê duyệt.",
                    status=status,
                    requested_by=requester.id,
                    approved_by=manager.id if status != "Pending" else None,
                    approved_at=_utc_now() if status != "Pending" else None,
                )
            )

        for index, admin_code in enumerate(("ADM001", "ADM002"), start=1):
            admin = employees[admin_code]
            db.add(AuditLog(employee_id=admin.id, employee_email=admin.email, action=f"SEED_EXAMPLE_ADMIN_{index}"))

        db.commit()
        counts = dict(EXPECTED_COUNTS)
        counts["vacations"] = 14
        print(json.dumps({"status": "ok", "counts": counts}, ensure_ascii=False))
        return counts
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed TaskSyncEnterprise with a realistic demo dataset")
    parser.add_argument("--reset", action="store_true", help="Delete existing application data before seeding")
    args = parser.parse_args()
    seed(reset_existing=args.reset)
