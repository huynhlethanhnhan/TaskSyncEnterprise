# 📂 FILE: tests/test_audit_websocket_employee_guards.py
import pytest
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.core.security import get_password_hash
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE

def create_user(db, email, role_id):
    hashed = get_password_hash("pass123")
    user = Employee(
        employee_code=f"CODE_{email.split('@')[0]}",
        full_name=f"User {email.split('@')[0]}",
        email=email,
        password_hash=hashed,
        role_id=role_id,
        job_title="Engineer",
        is_active=True,
        is_deleted=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_headers_and_token(client, email):
    response = client.post(
        "/api/v1/auth/login", data={"username": email, "password": "pass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, token

@pytest.fixture
def setup_rbac_data(db):
    admin = create_user(db, "admin_guard@test.com", ROLE_ADMIN)
    manager = create_user(db, "manager_guard@test.com", ROLE_MANAGER)
    employee_member = create_user(db, "emp_member@test.com", ROLE_EMPLOYEE)
    employee_outsider = create_user(db, "emp_outsider@test.com", ROLE_EMPLOYEE)

    project = Project(
        name="Guard Project",
        project_code="GPRJ01",
        status="Active",
        priority="High",
        is_deleted=False,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Assign employee_member to project
    pm = ProjectMember(project_id=project.id, employee_id=employee_member.id)
    db.add(pm)
    db.commit()

    return {
        "admin": admin,
        "manager": manager,
        "employee_member": employee_member,
        "employee_outsider": employee_outsider,
        "project": project,
    }

def test_employee_directory_rbac(client, db, setup_rbac_data):
    emp_headers, _ = get_headers_and_token(client, "emp_member@test.com")
    admin_headers, _ = get_headers_and_token(client, "admin_guard@test.com")

    # 1. Employee calling GET /employees must receive 403 Forbidden
    res_emp = client.get("/api/v1/employees", headers=emp_headers)
    assert res_emp.status_code == 403

    # 2. Admin calling GET /employees receives 200 OK
    res_admin = client.get("/api/v1/employees", headers=admin_headers)
    assert res_admin.status_code == 200

def test_audit_log_rbac(client, db, setup_rbac_data):
    emp_headers, _ = get_headers_and_token(client, "emp_member@test.com")
    admin_headers, _ = get_headers_and_token(client, "admin_guard@test.com")

    # 1. Employee calling GET /audit-logs (or /audit) receives 403 Forbidden
    res_emp = client.get("/api/v1/audit-logs", headers=emp_headers)
    assert res_emp.status_code == 403

    # 2. Admin calling GET /audit-logs receives 200 OK
    res_admin = client.get("/api/v1/audit-logs", headers=admin_headers)
    assert res_admin.status_code == 200

def test_project_members_rbac(client, db, setup_rbac_data):
    proj_id = setup_rbac_data["project"].id
    member_headers, _ = get_headers_and_token(client, "emp_member@test.com")
    outsider_headers, _ = get_headers_and_token(client, "emp_outsider@test.com")
    admin_headers, _ = get_headers_and_token(client, "admin_guard@test.com")

    # 1. Project member (Employee) can view project members
    res_member = client.get(f"/api/v1/projects/{proj_id}/members", headers=member_headers)
    assert res_member.status_code == 200
    members = res_member.json()
    assert len(members) >= 1
    assert "id" in members[0]
    assert "full_name" in members[0]
    assert "job_title" in members[0]

    # 2. Outsider employee is blocked with 403 Forbidden
    res_outsider = client.get(f"/api/v1/projects/{proj_id}/members", headers=outsider_headers)
    assert res_outsider.status_code == 403

    # 3. Admin can view project members
    res_admin = client.get(f"/api/v1/projects/{proj_id}/members", headers=admin_headers)
    assert res_admin.status_code == 200

from starlette.websockets import WebSocketDisconnect

def test_websocket_token_validation(client, db, setup_rbac_data):
    _, valid_token = get_headers_and_token(client, "emp_member@test.com")

    # 1. Test invalid token (server accepts and immediately closes with 4008)
    with client.websocket_connect("/ws/notifications?token=invalid_token") as websocket:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            websocket.receive_text()
        assert exc_info.value.code == 4008

    # 2. Test valid token
    with client.websocket_connect(f"/ws/notifications?token={valid_token}") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"

