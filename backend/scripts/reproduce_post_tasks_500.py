# 📂 FILE: backend/scripts/reproduce_post_tasks_500.py
"""
Reproduction script for POST /api/v1/tasks 500 Internal Server Error.
Attempts POST /api/v1/tasks with the exact minimal payload sent by E2E test,
using the active development database session and admin user credentials.
"""

import sys
import os
import traceback

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import SessionLocal
from app.models.employee import Employee
from app.models.project import Project
from app.schemas.task import TaskCreate
from app.services.project_access import require_project_management
from app.crud import task as crud_task
from app.routers.v1.tasks import create_task


def test_reproduce():
    print("=" * 60)
    print("      REPRODUCING POST /tasks 500 EXCEPTION")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Fetch admin user
        admin = db.scalars(
            select(Employee).where(Employee.email == "admin@tasksync.example.com")
        ).first()
        if not admin:
            admin = db.scalars(select(Employee).where(Employee.role_id == 1)).first()
        if not admin:
            print("ERROR: No admin user found in database.")
            return

        print(
            f"Admin user: id={admin.id}, email='{admin.email}', role_id={admin.role_id}"
        )

        # 2. Fetch target project
        project = db.scalars(select(Project).where(Project.is_deleted == False)).first()
        if not project:
            print("ERROR: No active project found in database.")
            return

        print(
            f"Target project: id={project.id}, name='{project.name}', created_by={project.created_by}"
        )

        # 3. Create TaskCreate schema payload (matching E2E minimal payload)
        minimal_payload_dict = {
            "title": "E2E Minimal Task 1700000000000",
            "name": "E2E Minimal Task 1700000000000",
            "description": None,
            "status": "To Do",
            "priority": "Medium",
            "project_id": project.id,
            "assigned_to": None,
            "sprint_id": None,
            "topic_id": None,
            "deadline": None,
            "story_points": None,
        }

        print("\nPayload:")
        print(minimal_payload_dict)

        data = TaskCreate(**minimal_payload_dict)
        print("\nParsed TaskCreate Schema:")
        print(data.model_dump())

        print("\nExecuting require_project_management...")
        require_project_management(db, data.project_id, admin)
        print("require_project_management PASSED!")

        print("\nExecuting crud_task.create...")
        secured_data = data.model_copy(update={"created_by": admin.id})
        task_obj = crud_task.create(db, secured_data)
        print(f"crud_task.create PASSED! Created Task ID={task_obj.id}")

        print("\nTesting TaskResponse schema serialization...")
        from app.schemas.task import TaskResponse

        serialized = TaskResponse.model_validate(task_obj)
        print("TaskResponse serialization PASSED!")
        print(serialized.model_dump_json())

        print("\nExecuting full create_task router endpoint function...")
        result = create_task(data=data, db=db, current_user=admin)
        print(f"create_task router endpoint PASSED! Task ID={result.id}")

    except Exception as exc:
        print("\n" + "!" * 60)
        print("EXACT EXCEPTION CAPTURED:")
        print("!" * 60)
        print(f"Exception Type: {type(exc).__name__}")
        print(f"Exception Message: {exc}")
        print("\nFull Traceback:")
        traceback.print_exc()
        print("!" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    test_reproduce()
