# 📂 FILE: backend/tests/test_dashboard.py
import pytest
from datetime import date
from app.models.employee import Employee
from app.models.project import Project
from app.models.task import Task
from app.models.vacation import Vacation
from app.core.security import get_password_hash
from app.core.constants import ROLE_EMPLOYEE


def test_dashboard_endpoints(client, db):
    # 1. SETUP: Create an Employee user and dashboard mock data
    emp_email = "dash_worker@example.com"

    emp_user = Employee(
        employee_code="EMP_DASH_001",
        full_name="Dashboard Worker",
        email=emp_email,
        password_hash=get_password_hash("dashpass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    db.add(emp_user)
    db.commit()
    db.refresh(emp_user)

    # Create test projects
    project1 = Project(
        name="Dashboard Project 1",
        project_code="PRJ_DASH_1",
        status="Active",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    project2 = Project(
        name="Dashboard Project 2",
        project_code="PRJ_DASH_2",
        status="Planning",
        priority="High",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project1)
    db.add(project2)
    db.commit()

    # Create test tasks
    task1 = Task(
        project_id=project1.id,
        title="Dashboard Task 1",
        status="To Do",
        priority="Medium",
        is_deleted=False,
    )
    task2 = Task(
        project_id=project1.id,
        title="Dashboard Task 2",
        status="Done",
        priority="High",
        is_deleted=False,
    )
    db.add(task1)
    db.add(task2)
    db.commit()

    # Create test vacation request
    vacation = Vacation(
        type="Annual Leave",
        start_date=date(2026, 8, 1),
        end_date=date(2026, 8, 5),
        reason="Summer trip",
        status="Pending",
        requested_by=emp_user.id,
    )
    db.add(vacation)
    db.commit()

    # 2. LOGIN: Get auth token
    response = client.post(
        "/api/v1/auth/login", data={"username": emp_email, "password": "dashpass"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. TEST Overview Endpoint
    res_overview = client.get("/api/v1/dashboard/overview", headers=headers)
    assert res_overview.status_code == 200

    overview_data = res_overview.json()["data"]
    assert overview_data["total_employees"] >= 1
    assert overview_data["active_employees"] >= 1
    assert overview_data["total_projects"] >= 2
    assert overview_data["active_projects"] >= 1
    assert overview_data["total_tasks"] >= 2
    assert overview_data["completed_tasks"] >= 1
    assert overview_data["pending_tasks"] >= 1
    assert overview_data["vacation_requests"] >= 1
    assert overview_data["pending_vacation_requests"] >= 1

    # 4. TEST Analytics Endpoint
    res_analytics = client.get("/api/v1/dashboard/analytics", headers=headers)
    assert res_analytics.status_code == 200

    analytics_data = res_analytics.json()["data"]
    assert "overview" in analytics_data
    assert "tasks_by_status" in analytics_data
    assert "projects_by_status" in analytics_data

    # Assert breakdown elements contain keys
    assert len(analytics_data["tasks_by_status"]) > 0
    assert any(x["status"] == "Done" for x in analytics_data["tasks_by_status"])
