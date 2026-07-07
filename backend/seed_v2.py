# 📂 FILE: backend/seed_v2.py
import sys
import os

# Add current folder to sys.path to resolve app imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.role import Role
from app.models.department import Department
from app.models.team import Team
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_checklist import TaskChecklist
from app.models.task_comment import TaskComment
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.models.vacation import Vacation
from app.core.security import get_password_hash


def seed():
    db = SessionLocal()
    try:
        print("[INFO] Cleaning existing records in correct dependency order...")
        db.query(TaskAssignment).delete()
        db.query(TaskChecklist).delete()
        db.query(TaskComment).delete()
        db.query(Task).delete()
        db.query(ProjectMember).delete()
        db.query(Project).delete()
        db.query(Vacation).delete()
        db.query(Notification).delete()
        db.query(AuditLog).delete()
        db.query(Employee).delete()
        db.query(Team).delete()
        db.query(Department).delete()
        db.query(Role).delete()
        db.commit()
        print("[INFO] Clean completed.")

        print("[INFO] Seeding database with clean production-ready records...")

        # 1. Create Roles (IDs 1, 2, 3)
        roles = {
            "admin": Role(id=1, role_name="admin", description="Administrator Role with full access", is_system=True),
            "manager": Role(id=2, role_name="manager", description="Manager Role for department heads", is_system=True),
            "employee": Role(id=3, role_name="employee", description="Standard Employee Role", is_system=True),
        }
        for r in roles.values():
            db.add(r)
        db.flush()
        print("- Roles seeded")

        # 2. Create IT Department
        dept_it = Department(
            department_code="IT",
            name="Information Technology",
            description="Information Technology Department",
            is_active=True
        )
        db.add(dept_it)
        db.flush()
        print("- Department seeded")

        # 3. Create Employees
        admin = Employee(
            employee_code="EMP001",
            full_name="System Admin",
            email="admin@gmail.com",
            password_hash=get_password_hash("123456"),
            role_id=1,
            is_active=True,
            is_first_login=False,
            job_title="System Administrator"
        )
        db.add(admin)
        db.flush()  # To obtain admin.id

        manager = Employee(
            employee_code="EMP002",
            full_name="Project Manager",
            email="manager@gmail.com",
            password_hash=get_password_hash("123456"),
            role_id=2,
            department_id=dept_it.id,
            manager_id=admin.id,
            is_active=True,
            is_first_login=False,
            job_title="IT Manager"
        )
        db.add(manager)
        db.flush()

        employee = Employee(
            employee_code="EMP003",
            full_name="Huỳnh Lê Thành Nhân",
            email="demo1@gmail.com",
            password_hash=get_password_hash("123456"),
            role_id=3,
            department_id=dept_it.id,
            manager_id=manager.id,
            is_active=True,
            is_first_login=False,
            job_title="Software Engineer"
        )
        db.add(employee)
        db.flush()
        print("- Employees seeded (admin@gmail.com, manager@gmail.com, demo1@gmail.com)")

        # 4. Create Project
        project = Project(
            project_code="PRJ_IT_001",
            name="IT Project V2",
            description="Tái cấu trúc hệ thống quản trị TaskSync Enterprise",
            status="Planning",
            priority="Medium",
            progress_percent=0.0,
            created_by=admin.id
        )
        db.add(project)
        db.flush()

        # Add Project Members
        db.add(ProjectMember(project_id=project.id, employee_id=manager.id))
        db.add(ProjectMember(project_id=project.id, employee_id=employee.id))
        db.flush()
        print("- Project and project members seeded")

        # 5. Create 3 Tasks
        # Task 1: Completed JWT integration
        task1 = Task(
            project_id=project.id,
            title="Tích hợp luồng xác thực JWT",
            description="Tích hợp luồng xác thực Access Token & Refresh Token qua HTTPOnly Cookie bảo mật.",
            priority="High",
            status="Done",
            story_points=5,
            progress_percent=100.0,
            created_by=admin.id
        )
        db.add(task1)
        db.flush()
        db.add(TaskAssignment(task_id=task1.id, employee_id=employee.id))

        # Task 2: In Progress Dashboard Refactoring
        task2 = Task(
            project_id=project.id,
            title="Tái cấu trúc UI Dashboard Figma",
            description="Thiết kế và tối ưu giao diện Dashboard theo chuẩn Figma mới nhất, tránh lag khi load dữ liệu.",
            priority="Medium",
            status="In Progress",
            story_points=3,
            progress_percent=40.0,
            created_by=manager.id
        )
        db.add(task2)
        db.flush()
        db.add(TaskAssignment(task_id=task2.id, employee_id=employee.id))
        db.add(TaskChecklist(task_id=task2.id, title="Phác thảo layout Dashboard", is_completed=True))
        db.add(TaskChecklist(task_id=task2.id, title="Liên kết API thống kê", is_completed=False))

        # Task 3: To Do DB schema checks
        task3 = Task(
            project_id=project.id,
            title="Xác minh lược đồ cơ sở dữ liệu SQL Server",
            description="Chạy Alembic migrations nâng cấp, hạ cấp và kiểm tra toàn vẹn dữ liệu trong cơ sở dữ liệu.",
            priority="High",
            status="To Do",
            story_points=8,
            progress_percent=0.0,
            created_by=admin.id
        )
        db.add(task3)
        db.flush()
        db.add(TaskAssignment(task_id=task3.id, employee_id=manager.id))

        db.commit()
        print("SUCCESS: Database seeded successfully with clean production-ready data!")

    except Exception as e:
        db.rollback()
        print(f"ERROR: Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
