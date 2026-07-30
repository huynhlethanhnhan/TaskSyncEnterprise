import pytest
import uuid
from app.models.employee import Employee
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.project_member import ProjectMember
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
from app.core.security import create_access_token


def create_test_employee(db, email, role_id, full_name="Test User"):
    emp = Employee(
        employee_code=f"EMP_{uuid.uuid4().hex[:6]}",
        email=email,
        full_name=full_name,
        role_id=role_id,
        password_hash="hashed_pass_test",
        is_active=True,
        is_deleted=False,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def get_auth_header(emp):
    token = create_access_token(data={"sub": str(emp.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_sprint_data(db):
    admin = create_test_employee(db, "admin_sprint@enterprise.com", ROLE_ADMIN, "Admin Sprint")
    manager = create_test_employee(db, "manager_sprint@enterprise.com", ROLE_MANAGER, "Manager Sprint")
    emp1 = create_test_employee(db, "emp_sprint@enterprise.com", ROLE_EMPLOYEE, "Emp Sprint")

    proj1 = Project(project_code="PRJ_SPR1", name="Sprint Project 1", created_by=manager.id, is_deleted=False)
    db.add(proj1)
    db.commit()

    pm1 = ProjectMember(project_id=proj1.id, employee_id=manager.id)
    pm2 = ProjectMember(project_id=proj1.id, employee_id=emp1.id)
    db.add_all([pm1, pm2])
    db.commit()

    sprint_planned_valid = Sprint(name="Sprint Planned Eligible", project_id=proj1.id, status="Planned", is_deleted=False)
    sprint_planned_conflict = Sprint(name="Sprint Planned Conflict", project_id=proj1.id, status="Planned", is_deleted=False)
    sprint_active_existing = Sprint(name="Sprint Active Existing", project_id=proj1.id, status="Active", is_deleted=False)
    sprint_empty = Sprint(name="Sprint Empty", project_id=proj1.id, status="Planned", is_deleted=False)

    db.add_all([sprint_planned_valid, sprint_planned_conflict, sprint_active_existing, sprint_empty])
    db.commit()

    # Add task to eligible sprint
    task1 = Task(title="Task in Valid Sprint", project_id=proj1.id, sprint_id=sprint_planned_valid.id, is_deleted=False)
    task2 = Task(title="Task in Conflict Sprint", project_id=proj1.id, sprint_id=sprint_planned_conflict.id, is_deleted=False)
    task3 = Task(title="Task in Active Sprint", project_id=proj1.id, sprint_id=sprint_active_existing.id, is_deleted=False)
    db.add_all([task1, task2, task3])
    db.commit()

    return {
        "admin": admin,
        "manager": manager,
        "emp1": emp1,
        "proj1": proj1,
        "sprint_valid": sprint_planned_valid,
        "sprint_conflict": sprint_planned_conflict,
        "sprint_active": sprint_active_existing,
        "sprint_empty": sprint_empty,
    }


def test_01_admin_starts_valid_sprint_when_no_active_conflict(client, setup_sprint_data, db):
    data = setup_sprint_data
    # First complete the existing active sprint so valid sprint can be started
    data["sprint_active"].status = "Completed"
    db.commit()

    headers = get_auth_header(data["admin"])
    res = client.patch(f"/api/v1/sprints/{data['sprint_valid'].id}/start", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "Active"


def test_02_manager_starts_sprint_in_managed_project(client, setup_sprint_data, db):
    data = setup_sprint_data
    data["sprint_active"].status = "Completed"
    db.commit()

    headers = get_auth_header(data["manager"])
    res = client.patch(f"/api/v1/sprints/{data['sprint_valid'].id}/start", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "Active"


def test_03_employee_cannot_start_sprint(client, setup_sprint_data):
    data = setup_sprint_data
    headers = get_auth_header(data["emp1"])
    res = client.patch(f"/api/v1/sprints/{data['sprint_valid'].id}/start", headers=headers)
    assert res.status_code == 403


def test_04_activation_conflict_when_project_already_has_active_sprint(client, setup_sprint_data):
    data = setup_sprint_data
    headers = get_auth_header(data["admin"])
    res = client.patch(f"/api/v1/sprints/{data['sprint_valid'].id}/start", headers=headers)
    assert res.status_code == 409
    body = res.json()
    err_msg = body.get("message") or body.get("detail", "")
    assert "Sprint 'Sprint Active Existing'" in err_msg


def test_05_activation_conflict_when_sprint_empty(client, setup_sprint_data, db):
    data = setup_sprint_data
    data["sprint_active"].status = "Completed"
    db.commit()

    headers = get_auth_header(data["admin"])
    res = client.patch(f"/api/v1/sprints/{data['sprint_empty'].id}/start", headers=headers)
    assert res.status_code == 409
    body = res.json()
    err_msg = body.get("message") or body.get("detail", "")
    assert "chưa có Task" in err_msg


def test_06_non_existent_sprint_404(client, setup_sprint_data):
    data = setup_sprint_data
    headers = get_auth_header(data["admin"])
    res = client.patch("/api/v1/sprints/999999/start", headers=headers)
    assert res.status_code == 404
