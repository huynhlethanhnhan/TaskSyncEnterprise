"""
TaskSyncEnterprise Final Stabilization Contract Tests (25 Test Cases)
Verifies all backend business rules, project member relations, validation, and RBAC permissions.
"""

import uuid
import pytest
from app.models.role import Role
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.discussion_topic import DiscussionTopic
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.core.security import get_password_hash, create_access_token
from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE


def _init_roles_and_dept(db):
    admin_role = db.query(Role).filter(Role.id == ROLE_ADMIN).first()
    if not admin_role:
        admin_role = Role(id=ROLE_ADMIN, role_name="Admin")
        db.add(admin_role)

    emp_role = db.query(Role).filter(Role.id == ROLE_EMPLOYEE).first()
    if not emp_role:
        emp_role = Role(id=ROLE_EMPLOYEE, role_name="Employee")
        db.add(emp_role)

    dept = db.query(Department).filter(Department.department_code == "STAB-DEPT").first()
    if not dept:
        dept = Department(name="Stabilization Dept", department_code="STAB-DEPT", is_active=True)
        db.add(dept)

    db.commit()
    db.refresh(admin_role)
    db.refresh(emp_role)
    db.refresh(dept)
    return admin_role, emp_role, dept


def _create_user(db, email, role_id=ROLE_ADMIN, full_name="Admin User"):
    uid = uuid.uuid4().hex[:6]
    emp = Employee(
        employee_code=f"EMP-{uid.upper()}",
        full_name=full_name,
        email=email,
        password_hash=get_password_hash("TaskSync@2026"),
        role_id=role_id,
        is_active=True,
        is_deleted=False,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def _get_auth_headers(client, user):
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _create_project(db, name_prefix="Prj"):
    uid = uuid.uuid4().hex[:6].upper()
    proj = Project(
        name=f"{name_prefix} {uid}",
        project_code=f"P-{uid}",
        status="Planning",
        priority="Medium",
        is_deleted=False,
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


# ── TEST SUITE (25 Cases) ──────────────────────────────────────────────────────

# Case 1: Task creation without assignee -> 201 Created
def test_01_create_task_without_assignee(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm1_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    proj = _create_project(db)
    headers = _get_auth_headers(client, admin)

    resp = client.post("/api/v1/tasks", json={
        "title": "Unassigned Task",
        "project_id": proj.id,
        "assigned_to": None,
    }, headers=headers)
    assert resp.status_code == 201, resp.json()
    assert resp.json()["assigned_to"] is None


# Case 2: Task creation with valid Project Member assignee -> 201 Created
def test_02_create_task_with_project_member(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm2_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    emp = _create_user(db, f"emp2_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE, "Project Member")
    proj = _create_project(db)
    db.add(ProjectMember(project_id=proj.id, employee_id=emp.id))
    db.commit()

    headers = _get_auth_headers(client, admin)
    resp = client.post("/api/v1/tasks", json={
        "title": "Member Task",
        "project_id": proj.id,
        "assigned_to": emp.id,
    }, headers=headers)
    assert resp.status_code == 201, resp.json()
    assert resp.json()["assigned_to"] == emp.id


# Case 3: Task creation with non-member assignee -> 409 Conflict
def test_03_create_task_with_non_member_assignee(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm3_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    non_member = _create_user(db, f"nonm3_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE, "Non Member")
    proj = _create_project(db)
    headers = _get_auth_headers(client, admin)

    resp = client.post("/api/v1/tasks", json={
        "title": "Non Member Task",
        "project_id": proj.id,
        "assigned_to": non_member.id,
    }, headers=headers)
    assert resp.status_code == 409, resp.json()


# Case 4: Specific error code for non-member assignee
def test_04_non_member_assignee_error_code(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm4_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    non_member = _create_user(db, f"nonm4_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE)
    proj = _create_project(db)
    headers = _get_auth_headers(client, admin)

    resp = client.post("/api/v1/tasks", json={
        "title": "Non Member Task EC",
        "project_id": proj.id,
        "assigned_to": non_member.id,
    }, headers=headers)
    assert resp.status_code == 409
    body = resp.json()
    assert body.get("error_code") == "ASSIGNEE_NOT_PROJECT_MEMBER"
    assert "Nhân viên được chọn chưa phải thành viên" in body.get("message", "")


# Case 5: Project change reset assignee contract
def test_05_project_change_reset_assignee_contract(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm5_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    emp = _create_user(db, f"emp5_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE)
    proj_a = _create_project(db, "Proj A")
    proj_b = _create_project(db, "Proj B")
    # emp is member of proj_a only
    db.add(ProjectMember(project_id=proj_a.id, employee_id=emp.id))
    db.commit()

    headers = _get_auth_headers(client, admin)
    # Attempting to assign emp to proj_b must fail with 409
    resp = client.post("/api/v1/tasks", json={
        "title": "Proj B Task with Proj A Member",
        "project_id": proj_b.id,
        "assigned_to": emp.id,
    }, headers=headers)
    assert resp.status_code == 409


# Case 6 & 7: Assignee dropdown list and option value contract
def test_06_07_get_project_members_contract(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm6_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    emp = _create_user(db, f"emp6_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE, "Dev One")
    proj = _create_project(db)
    db.add(ProjectMember(project_id=proj.id, employee_id=emp.id))
    db.commit()

    headers = _get_auth_headers(client, admin)
    resp = client.get(f"/api/v1/projects/{proj.id}/members", headers=headers)
    assert resp.status_code == 200, resp.json()
    members = resp.json()
    assert len(members) == 1
    assert members[0]["id"] == emp.id
    assert members[0]["employee_code"] == emp.employee_code
    assert members[0]["full_name"] == "Dev One"


# Case 8: User ID contract (assigned_to stores Employee.id)
def test_08_assigned_to_stores_employee_id(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm8_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    emp = _create_user(db, f"emp8_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE)
    proj = _create_project(db)
    db.add(ProjectMember(project_id=proj.id, employee_id=emp.id))
    db.commit()

    headers = _get_auth_headers(client, admin)
    resp = client.post("/api/v1/tasks", json={
        "title": "Emp ID Task",
        "project_id": proj.id,
        "assigned_to": emp.id,
    }, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["assigned_to"] == emp.id


# Case 9: Empty project members contract
def test_09_empty_project_members(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm9_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    empty_proj = _create_project(db, "Empty Proj")
    headers = _get_auth_headers(client, admin)

    resp = client.get(f"/api/v1/projects/{empty_proj.id}/members", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


# Case 10: Inactive member contract
def test_10_inactive_project_member_excluded(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm10_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    emp_inactive = _create_user(db, f"inact10_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE)
    emp_inactive.is_active = False
    proj = _create_project(db)
    db.add(ProjectMember(project_id=proj.id, employee_id=emp_inactive.id))
    db.commit()

    headers = _get_auth_headers(client, admin)
    resp = client.get(f"/api/v1/projects/{proj.id}/members", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 0


# Case 11 & 12: Sprint project mapping contracts
def test_11_12_sprint_project_mapping(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm11_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    proj_a = _create_project(db, "Proj A")
    proj_b = _create_project(db, "Proj B")

    sprint_a = Sprint(project_id=proj_a.id, name="Sprint A", status="Planned")
    db.add(sprint_a)
    db.commit()

    headers = _get_auth_headers(client, admin)
    # Same project -> success (201)
    resp1 = client.post("/api/v1/tasks", json={
        "title": "Task Sprint Same Proj",
        "project_id": proj_a.id,
        "sprint_id": sprint_a.id,
    }, headers=headers)
    assert resp1.status_code == 201

    # Different project -> 409 Conflict
    resp2 = client.post("/api/v1/tasks", json={
        "title": "Task Sprint Mismatch",
        "project_id": proj_b.id,
        "sprint_id": sprint_a.id,
    }, headers=headers)
    assert resp2.status_code == 409
    assert resp2.json().get("error_code") == "SPRINT_MISMATCH"


# Case 13 & 14: Topic project mapping contracts
def test_13_14_topic_project_mapping(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm13_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    proj_a = _create_project(db, "Proj A")
    proj_b = _create_project(db, "Proj B")

    topic_a = DiscussionTopic(project_id=proj_a.id, title="Topic A", content="A", created_by_id=admin.id)
    db.add(topic_a)
    db.commit()

    headers = _get_auth_headers(client, admin)
    # Same project -> success (201)
    resp1 = client.post("/api/v1/tasks", json={
        "title": "Task Topic Same Proj",
        "project_id": proj_a.id,
        "topic_id": topic_a.id,
    }, headers=headers)
    assert resp1.status_code == 201

    # Different project -> 409 Conflict
    resp2 = client.post("/api/v1/tasks", json={
        "title": "Task Topic Mismatch",
        "project_id": proj_b.id,
        "topic_id": topic_a.id,
    }, headers=headers)
    assert resp2.status_code == 409
    assert resp2.json().get("error_code") == "TOPIC_MISMATCH"


# Case 15, 16, 17, 18: Story Points contracts (null, 0 -> null, 3 valid, 4 invalid Fibonacci)
def test_15_16_17_18_story_points_validation(client, db):
    _init_roles_and_dept(db)
    admin = _create_user(db, f"adm15_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    proj = _create_project(db)
    headers = _get_auth_headers(client, admin)

    # 15: null -> 201
    r15 = client.post("/api/v1/tasks", json={"title": "SP Null", "project_id": proj.id, "story_points": None}, headers=headers)
    assert r15.status_code == 201
    assert r15.json()["story_points"] is None

    # 16: 0 -> 201, coerced to null
    r16 = client.post("/api/v1/tasks", json={"title": "SP Zero", "project_id": proj.id, "story_points": 0}, headers=headers)
    assert r16.status_code == 201
    assert r16.json()["story_points"] is None

    # 17: 3 -> 201
    r17 = client.post("/api/v1/tasks", json={"title": "SP Three", "project_id": proj.id, "story_points": 3}, headers=headers)
    assert r17.status_code == 201
    assert r17.json()["story_points"] == 3

    # 18: 4 (non-Fibonacci) -> 422
    r18 = client.post("/api/v1/tasks", json={"title": "SP Four Invalid", "project_id": proj.id, "story_points": 4}, headers=headers)
    assert r18.status_code == 422


# Case 19 & 20: Employee Creation & Password Strength Policy
def test_19_20_employee_creation_and_password_policy(client, db):
    admin_role, emp_role, dept = _init_roles_and_dept(db)
    admin = _create_user(db, f"adm19_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    headers = _get_auth_headers(client, admin)

    # 19: Valid employee creation -> 201 Created
    r19 = client.post("/api/v1/employees", json={
        "full_name": "Valid Emp",
        "email": f"valid_{uuid.uuid4().hex[:6]}@stab.com",
        "password": "TaskSync@2026",
        "role_id": emp_role.id,
        "department_id": dept.id,
    }, headers=headers)
    assert r19.status_code == 201, r19.json()

    # 20: Weak password "123" -> 422 Validation Error
    r20 = client.post("/api/v1/employees", json={
        "full_name": "Weak Pass Emp",
        "email": f"weak_{uuid.uuid4().hex[:6]}@stab.com",
        "password": "123",
        "role_id": emp_role.id,
        "department_id": dept.id,
    }, headers=headers)
    assert r20.status_code == 422, r20.json()


# Case 21 & 22: Team Validation & Duplicate Code Checks
def test_21_22_team_validation_and_duplicate_code(client, db):
    admin_role, emp_role, dept = _init_roles_and_dept(db)
    admin = _create_user(db, f"adm21_{uuid.uuid4().hex[:4]}@stab.com", ROLE_ADMIN)
    headers = _get_auth_headers(client, admin)

    # 21: Blank/whitespace team code -> 422
    r21 = client.post("/api/v1/teams", json={
        "team_code": "   ",
        "name": "Blank Team",
        "department_id": dept.id,
    }, headers=headers)
    assert r21.status_code == 422, r21.json()

    # 22: Duplicate team_code -> 409
    team_code = f"TM-{uuid.uuid4().hex[:6].upper()}"
    payload = {"team_code": team_code, "name": "Team One", "department_id": dept.id}
    r22_1 = client.post("/api/v1/teams", json=payload, headers=headers)
    assert r22_1.status_code == 201, r22_1.json()

    r22_2 = client.post("/api/v1/teams", json=payload, headers=headers)
    assert r22_2.status_code == 409, r22_2.json()


# Case 23, 24, 25: RBAC Task Update Permissions
def test_23_24_25_rbac_task_update_permissions(client, db):
    _init_roles_and_dept(db)
    emp_assigned = _create_user(db, f"emp_a_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE, "Worker A")
    emp_unassigned = _create_user(db, f"emp_u_{uuid.uuid4().hex[:4]}@stab.com", ROLE_EMPLOYEE, "Worker U")
    proj = _create_project(db)

    # Create task assigned to emp_assigned
    task = Task(project_id=proj.id, title="Assigned Task", status="To Do", story_points=2, progress_percent=0.0)
    db.add(task)
    db.commit()
    db.refresh(task)

    db.add(TaskAssignment(task_id=task.id, employee_id=emp_assigned.id))
    db.commit()

    headers_assigned = _get_auth_headers(client, emp_assigned)
    headers_unassigned = _get_auth_headers(client, emp_unassigned)

    # 23: Assigned employee can update status and progress_percent -> 200
    r23 = client.put(f"/api/v1/tasks/my-task/{task.id}", json={
        "status": "In Progress",
        "progress_percent": 50.0,
    }, headers=headers_assigned)
    assert r23.status_code == 200, r23.json()
    assert r23.json()["status"] == "In Progress"
    assert r23.json()["progress_percent"] == 50.0

    # 24: Assigned employee cannot update protected fields (title, story_points) -> 403
    r24 = client.put(f"/api/v1/tasks/{task.id}", json={
        "title": "Hacked Title",
        "story_points": 8,
    }, headers=headers_assigned)
    assert r24.status_code == 403, r24.json()

    # 25: Unassigned employee cannot update task status -> 403
    r25 = client.put(f"/api/v1/tasks/my-task/{task.id}", json={
        "status": "Done",
        "progress_percent": 100.0,
    }, headers=headers_unassigned)
    assert r25.status_code == 403, r25.json()
