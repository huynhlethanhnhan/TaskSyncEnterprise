# 📂 FILE: backend/tests/test_story_points_contract.py
import pytest
from app.models.project import Project
from app.models.employee import Employee
from app.models.department import Department
from app.models.role import Role

def test_story_points_mssql_contract(client, db):
    # Setup test fixtures
    admin_role = db.query(Role).filter(Role.role_name == "Admin").first()
    if not admin_role:
        admin_role = Role(role_name="Admin")
        db.add(admin_role)
        db.commit()

    dept = db.query(Department).first()
    if not dept:
        dept = Department(name="IT", department_code="IT")
        db.add(dept)
        db.commit()

    admin = db.query(Employee).filter(Employee.email == "sp_admin@example.com").first()
    if not admin:
        admin = Employee(
            employee_code="EMP-SP",
            full_name="SP Admin",
            email="sp_admin@example.com",
            password_hash="test",
            role_id=admin_role.id,
            department_id=dept.id,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    project = db.query(Project).filter(Project.name == "SP Test Project").first()
    if not project:
        project = Project(
            project_code="PRJ-SP",
            name="SP Test Project",
            description="Test",
            status="Active",
            created_by=admin.id,
        )
        db.add(project)
        db.commit()
        db.refresh(project)

    # Login
    from app.core.security import get_password_hash
    admin.password_hash = get_password_hash("password123")
    db.commit()

    login_res = client.post("/api/v1/auth/login", data={"username": "sp_admin@example.com", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. story_points = None -> 201 Created & returns null
    res1 = client.post("/api/v1/tasks", json={
        "title": "Minimal Task Null Story Points",
        "status": "To Do",
        "priority": "Medium",
        "project_id": project.id,
        "story_points": None,
    }, headers=headers)
    assert res1.status_code == 201
    task1_id = res1.json()["id"]
    assert res1.json()["story_points"] is None

    # Verify GET returns story_points: null
    get_res1 = client.get(f"/api/v1/tasks/{task1_id}", headers=headers)
    assert get_res1.status_code == 200
    assert get_res1.json()["story_points"] is None

    # 2. Normalization: story_points = 0, "0", "" -> None
    for val in (0, "0", ""):
        res_norm = client.post("/api/v1/tasks", json={
            "title": f"Normalized Task {val}",
            "status": "To Do",
            "priority": "Medium",
            "project_id": project.id,
            "story_points": val,
        }, headers=headers)
        assert res_norm.status_code == 201
        assert res_norm.json()["story_points"] is None

    # 3. Valid Fibonacci story_points = 3 -> 201 Created
    res3 = client.post("/api/v1/tasks", json={
        "title": "Task Fibonacci 3",
        "status": "To Do",
        "priority": "High",
        "project_id": project.id,
        "story_points": 3,
    }, headers=headers)
    assert res3.status_code == 201
    assert res3.json()["story_points"] == 3

    # 4. Invalid story_points = 4 -> 422 Unprocessable Entity
    res4 = client.post("/api/v1/tasks", json={
        "title": "Task Invalid Fibonacci 4",
        "status": "To Do",
        "priority": "Medium",
        "project_id": project.id,
        "story_points": 4,
    }, headers=headers)
    assert res4.status_code == 422
