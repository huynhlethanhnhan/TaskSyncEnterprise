import pytest
from app.models.project import Project
from app.models.employee import Employee
from app.models.department import Department
from app.models.role import Role

def test_manual_task_creation_regression(client, db):
    # 1. Prepare minimal data for testing (simulate DB state if not seeded)
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

    admin = db.query(Employee).filter(Employee.email == "admin_test_task@example.com").first()
    if not admin:
        admin = Employee(
            employee_code="EMP-TEST",
            full_name="Admin Test",
            email="admin_test_task@example.com",
            password_hash="test",
            role_id=admin_role.id,
            department_id=dept.id,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    
    project = db.query(Project).filter(Project.name == "Dự Án Test Project").first()
    if not project:
        project = Project(
            project_code="PRJ-TEST",
            name="Dự Án Test Project",
            description="Test",
            status="Active",
            created_by=admin.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)

    from app.models.sprint import Sprint
    sprint = db.query(Sprint).filter(Sprint.name == "Test Sprint").first()
    if not sprint:
        sprint = Sprint(
            name="Test Sprint",
            goal="Test",
            status="Planned",
            project_id=project.id
        )
        db.add(sprint)
        db.commit()
        db.refresh(sprint)

    from app.models.project_member import ProjectMember
    membership = db.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.employee_id == admin.id).first()
    if not membership:
        membership = ProjectMember(project_id=project.id, employee_id=admin.id)
        db.add(membership)
        db.commit()

    # Login to get token
    response = client.post("/api/v1/auth/login", data={"username": "admin_test_task@example.com", "password": "password123"})
    if response.status_code == 401:
        from app.core.security import get_password_hash
        admin.password_hash = get_password_hash("password123")
        db.commit()
        response = client.post("/api/v1/auth/login", data={"username": "admin_test_task@example.com", "password": "password123"})
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": "test-key-1"}

    # Test Case 1: Minimal Task
    payload_1 = {
        "title": "Manual Create Task Test",
        "description": "demo 1",
        "status": "To Do",
        "priority": "Medium",
        "project_id": project.id,
        "assigned_to": None,
        "sprint_id": None,
        "topic_id": None,
        "deadline": None,
        "story_points": 0
    }
    resp1 = client.post("/api/v1/tasks", json=payload_1, headers=headers)
    assert resp1.status_code == 201 or resp1.status_code == 200

    # Test Case 2: Assignee
    payload_2 = dict(payload_1)
    payload_2["title"] = "Task With Assignee"
    payload_2["assigned_to"] = admin.id
    headers["Idempotency-Key"] = "test-key-2"
    resp2 = client.post("/api/v1/tasks", json=payload_2, headers=headers)
    assert resp2.status_code == 201 or resp2.status_code == 200

    # Test Case 3: Sprint Assignment
    payload_3 = dict(payload_1)
    payload_3["title"] = "Task With Sprint"
    payload_3["sprint_id"] = sprint.id
    headers["Idempotency-Key"] = "test-key-3"
    resp3 = client.post("/api/v1/tasks", json=payload_3, headers=headers)
    assert resp3.status_code == 201 or resp3.status_code == 200

    # Test Case 4: Coercion (sending 0 for optional relationship IDs)
    payload_4 = dict(payload_1)
    payload_4["title"] = "Task With Zero IDs"
    payload_4["sprint_id"] = 0
    payload_4["topic_id"] = 0
    payload_4["assigned_to"] = 0
    headers["Idempotency-Key"] = "test-key-4"
    resp4 = client.post("/api/v1/tasks", json=payload_4, headers=headers)
    assert resp4.status_code == 201 or resp4.status_code == 200
    data = resp4.json()
    assert data["sprint_id"] is None
    assert data["topic_id"] is None
    assert data["assigned_to"] is None

    # Test Case 5: story_points = null -> 201 (optional field)
    payload_5 = dict(payload_1)
    payload_5["title"] = "Task With Null Story Points"
    payload_5["story_points"] = None
    headers["Idempotency-Key"] = "test-key-5"
    resp5 = client.post("/api/v1/tasks", json=payload_5, headers=headers)
    assert resp5.status_code in (200, 201), resp5.json()

    # Test Case 6: story_points = 0 -> accepted, stored as 0 or None per business rule
    payload_6 = dict(payload_1)
    payload_6["title"] = "Task With Zero Story Points"
    payload_6["story_points"] = 0
    headers["Idempotency-Key"] = "test-key-6"
    resp6 = client.post("/api/v1/tasks", json=payload_6, headers=headers)
    assert resp6.status_code in (200, 201), resp6.json()
    # Business rule: 0 is either kept as 0 or coerced to None — both valid outcomes
    assert resp6.json()["story_points"] in (0, None)

