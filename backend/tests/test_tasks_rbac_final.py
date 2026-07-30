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
def setup_rbac_data(db):
    admin = create_test_employee(db, "admin_test@enterprise.com", ROLE_ADMIN, "Admin User")
    manager = create_test_employee(db, "manager_test@enterprise.com", ROLE_MANAGER, "Manager User")
    emp1 = create_test_employee(db, "emp1_test@enterprise.com", ROLE_EMPLOYEE, "Employee One")
    emp2 = create_test_employee(db, "emp2_test@enterprise.com", ROLE_EMPLOYEE, "Employee Two")

    # Projects
    proj1 = Project(project_code="PRJ_ALPHA", name="Project Alpha", created_by=manager.id, is_deleted=False)
    proj2 = Project(project_code="PRJ_BETA", name="Project Beta", created_by=admin.id, is_deleted=False)
    db.add_all([proj1, proj2])
    db.commit()

    # Project memberships
    pm1 = ProjectMember(project_id=proj1.id, employee_id=emp1.id)
    db.add(pm1)
    db.commit()

    # Sprints
    sprint1 = Sprint(name="Sprint 1", project_id=proj1.id, is_deleted=False, status="Active")
    db.add(sprint1)
    db.commit()

    # Tasks
    task1 = Task(
        title="Employee 1 Task",
        project_id=proj1.id,
        sprint_id=sprint1.id,
        created_by=manager.id,
        status="To Do",
        story_points=3,
        is_deleted=False,
    )
    task2 = Task(
        title="Employee 2 Task",
        project_id=proj2.id,
        created_by=admin.id,
        status="To Do",
        story_points=5,
        is_deleted=False,
    )
    db.add_all([task1, task2])
    db.commit()

    # Assignments
    ta1 = TaskAssignment(task_id=task1.id, employee_id=emp1.id)
    ta2 = TaskAssignment(task_id=task2.id, employee_id=emp2.id)
    db.add_all([ta1, ta2])
    db.commit()

    return {
        "admin": admin,
        "manager": manager,
        "emp1": emp1,
        "emp2": emp2,
        "proj1": proj1,
        "proj2": proj2,
        "sprint1": sprint1,
        "task1": task1,
        "task2": task2,
    }


def test_01_admin_sees_all_tasks(client, setup_rbac_data):
    """1. Admin xem được task của Employee."""
    data = setup_rbac_data
    headers = get_auth_header(data["admin"])
    res = client.get("/api/v1/tasks", headers=headers)
    assert res.status_code == 200
    task_ids = [t["id"] for t in res.json()]
    assert data["task1"].id in task_ids
    assert data["task2"].id in task_ids


def test_02_manager_sees_project_tasks(client, setup_rbac_data):
    """2. Manager xem được task trong project mình quản lý."""
    data = setup_rbac_data
    headers = get_auth_header(data["manager"])
    res = client.get("/api/v1/tasks", headers=headers)
    assert res.status_code == 200
    task_ids = [t["id"] for t in res.json()]
    assert data["task1"].id in task_ids


def test_03_employee_sees_assigned_task(client, setup_rbac_data):
    """3. Employee xem được task được giao cho mình."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.get("/api/v1/tasks/my-tasks", headers=headers)
    assert res.status_code == 200
    task_ids = [t["id"] for t in res.json()]
    assert data["task1"].id in task_ids


def test_04_employee_cannot_see_unauthorized_private_task(client, setup_rbac_data):
    """4. Employee không xem được task riêng không thuộc quyền (project 2 nơi emp1 không thuộc)."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.get(f"/api/v1/tasks/{data['task2'].id}", headers=headers)
    assert res.status_code == 403


def test_05_employee_can_update_status_of_assigned_task(client, setup_rbac_data):
    """5. Employee đổi được trạng thái task của mình."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.patch(
        f"/api/v1/tasks/{data['task1'].id}",
        json={"status": "In Progress"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "In Progress"


def test_06_employee_cannot_update_status_of_unassigned_task(client, setup_rbac_data):
    """6. Employee không đổi được trạng thái task của người khác."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.patch(
        f"/api/v1/tasks/{data['task2'].id}",
        json={"status": "In Progress"},
        headers=headers,
    )
    assert res.status_code in (403, 404)


def test_07_employee_cannot_change_assignee(client, setup_rbac_data):
    """7. Employee không đổi được assignee."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.patch(
        f"/api/v1/tasks/{data['task1'].id}",
        json={"assigned_to": data["emp2"].id},
        headers=headers,
    )
    assert res.status_code == 403


def test_08_employee_cannot_change_story_points(client, setup_rbac_data):
    """8. Employee không đổi được Story Point."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.patch(
        f"/api/v1/tasks/{data['task1'].id}",
        json={"story_points": 13},
        headers=headers,
    )
    assert res.status_code == 403


def test_09_employee_cannot_change_deadline(client, setup_rbac_data):
    """9. Employee không đổi được deadline."""
    data = setup_rbac_data
    headers = get_auth_header(data["emp1"])
    res = client.patch(
        f"/api/v1/tasks/{data['task1'].id}",
        json={"deadline": "2028-12-31T23:59:59"},
        headers=headers,
    )
    assert res.status_code == 403


def test_10_admin_and_manager_full_update(client, setup_rbac_data):
    """10. Admin và Manager vẫn cập nhật đầy đủ task theo quyền."""
    data = setup_rbac_data
    headers = get_auth_header(data["admin"])
    res = client.put(
        f"/api/v1/tasks/{data['task1'].id}",
        json={
            "project_id": data["proj1"].id,
            "title": "Admin Updated Title",
            "priority": "High",
            "status": "In Progress",
            "story_points": 8,
        },
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Admin Updated Title"
    assert res.json()["story_points"] == 8


def test_11_task_consistency_in_sprint_and_project(client, setup_rbac_data):
    """11. Task xuất hiện nhất quán trong Project, Sprint và Board."""
    data = setup_rbac_data
    headers = get_auth_header(data["admin"])
    res = client.get("/api/v1/tasks", headers=headers)
    assert res.status_code == 200
    all_tasks = res.json()

    sprint_res = client.get(f"/api/v1/tasks?sprint_id={data['sprint1'].id}", headers=headers)
    assert sprint_res.status_code == 200
    sprint_tasks = sprint_res.json()

    task1_in_all = any(t["id"] == data["task1"].id for t in all_tasks)
    task1_in_sprint = any(t["id"] == data["task1"].id for t in sprint_tasks)

    assert task1_in_all
    assert task1_in_sprint


def test_12_proper_error_status_codes(client, setup_rbac_data):
    """12. API trả đúng 403, 404, 422 tùy trường hợp."""
    data = setup_rbac_data

    # 404 for non-existent task
    res_404 = client.get("/api/v1/tasks/999999", headers=get_auth_header(data["admin"]))
    assert res_404.status_code == 404

    # 403 for unauthorized edit
    res_403 = client.patch(
        f"/api/v1/tasks/{data['task2'].id}",
        json={"status": "Done"},
        headers=get_auth_header(data["emp1"]),
    )
    assert res_403.status_code == 403

    # 422 for invalid schema payload
    res_422 = client.patch(
        f"/api/v1/tasks/{data['task1'].id}",
        json={"assigned_to": "invalid_integer_string"},
        headers=get_auth_header(data["admin"]),
    )
    assert res_422.status_code == 422
