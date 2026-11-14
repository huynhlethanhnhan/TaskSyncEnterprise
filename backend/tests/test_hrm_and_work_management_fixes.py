# 📂 FILE: backend/tests/test_hrm_and_work_management_fixes.py
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch

from sqlalchemy import select

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.core.security import get_password_hash, verify_password
from app.core.settings import Settings
from app.crud import task as crud_task
from app.models.department import Department
from app.models.discussion_topic import DiscussionTopic
from app.models.employee import Employee
from app.models.hrm import EmploymentContract, LeaveBalance
from app.models.project import Project
from app.models.role import Role
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.team import Team
from app.models.vacation import Vacation
from app.startup.production_check import run_production_readiness_check

TEST_PWD = "Admin@Task2026!"


def _ensure_roles(db) -> None:
    for rid, rname in [
        (ROLE_ADMIN, "admin"),
        (ROLE_MANAGER, "manager"),
        (ROLE_EMPLOYEE, "employee"),
    ]:
        if db.get(Role, rid) is None:
            db.add(Role(id=rid, role_name=rname, description=rname, is_system=True))
    db.flush()


def _make_employee(
    db,
    code: str,
    email: str,
    role_id: int = ROLE_EMPLOYEE,
    department_id: int | None = None,
    team_id: int | None = None,
) -> Employee:
    _ensure_roles(db)
    emp = Employee(
        employee_code=code,
        full_name=f"User {code}",
        email=email,
        password_hash=get_password_hash(TEST_PWD),
        role_id=role_id,
        department_id=department_id,
        team_id=team_id,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    db.add(emp)
    db.flush()
    return emp


def _auth_header(client, email: str) -> dict[str, str]:
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": TEST_PWD},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_seed_password_upgrade_and_production_warning():
    dev_settings = Settings(ENVIRONMENT="development")
    assert dev_settings.SEED_ADMIN_PASSWORD.get_secret_value() == "Admin@Task2026!"

    # Verify bcrypt hashing compatibility with Admin@Task2026!
    hashed = get_password_hash(dev_settings.SEED_ADMIN_PASSWORD.get_secret_value())
    assert verify_password("Admin@Task2026!", hashed)

    # Verify production audit deducts points if default Admin@Task2026! is left unchanged
    prod_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="A_Super_Strong_Unique_Production_Secret_Key_2026_XYZ!",
        ALLOWED_HOSTS=["api.tasksync.example.com"],
        SEED_ADMIN_PASSWORD="Admin@Task2026!",
    )
    with patch("app.startup.production_check.settings", prod_settings), patch(
        "app.startup.production_check.SystemValidator.run_all_checks",
        return_value={"db": "PASS", "redis": "PASS"},
    ):
        report = run_production_readiness_check()
        assert report["security_warnings"] is True
        assert report["score"] < 100


def test_work_management_manager_department_scope_and_acting_team_leader(client, db):
    dept_a = Department(department_code="ENG", name="Engineering", is_active=True)
    dept_b = Department(department_code="FIN", name="Finance", is_active=True)
    db.add_all([dept_a, dept_b])
    db.flush()

    team_a1 = Team(department_id=dept_a.id, team_code="ENG-1", name="Core", is_active=True)
    team_a2 = Team(department_id=dept_a.id, team_code="ENG-2", name="Platform", is_active=True)
    team_b1 = Team(department_id=dept_b.id, team_code="FIN-1", name="Audit", is_active=True)
    db.add_all([team_a1, team_a2, team_b1])
    db.flush()

    admin = _make_employee(db, "ADM01", "adm01@example.com", ROLE_ADMIN)
    mgr_a = _make_employee(
        db, "MGR01", "mgra@example.com", ROLE_MANAGER, department_id=dept_a.id, team_id=team_a1.id
    )
    dept_a.manager_id = mgr_a.id
    # Acting/temporary Team Leader: home team is team_a1, delegated to lead team_a2
    acting_leader = _make_employee(
        db, "EMP_TL", "actingtl@example.com", ROLE_EMPLOYEE, department_id=dept_a.id, team_id=team_a1.id
    )
    team_a2.leader_id = acting_leader.id
    worker_a2 = _make_employee(
        db, "EMP_W2", "worker2@example.com", ROLE_EMPLOYEE, department_id=dept_a.id, team_id=team_a2.id
    )
    emp_b = _make_employee(
        db, "EMP_B", "empb@example.com", ROLE_EMPLOYEE, department_id=dept_b.id, team_id=team_b1.id
    )

    proj_a2 = Project(
        project_code="PRJ-A2",
        name="Platform Upgrade",
        department_id=dept_a.id,
        team_id=team_a2.id,
        status="In Progress",
        priority="High",
        budget=1000,
        created_by=admin.id,
        is_deleted=False,
    )
    proj_b = Project(
        project_code="PRJ-B1",
        name="Finance ERP",
        department_id=dept_b.id,
        team_id=team_b1.id,
        status="In Progress",
        priority="Medium",
        budget=500,
        created_by=admin.id,
        is_deleted=False,
    )
    db.add_all([proj_a2, proj_b])
    db.flush()

    sprint_a2 = Sprint(
        project_id=proj_a2.id,
        name="Sprint Alpha",
        status="Active",
        is_deleted=False,
    )
    topic_a2 = DiscussionTopic(
        project_id=proj_a2.id,
        title="Query Optimization Epic",
        content="SQL & API tuning",
        is_deleted=False,
    )
    db.add_all([sprint_a2, topic_a2])
    db.commit()

    mgr_headers = _auth_header(client, mgr_a.email)
    tl_headers = _auth_header(client, acting_leader.email)

    # 1. Manager of Dept A sees proj_a2 even though proj_a2 belongs to team_a2 (different team in same dept!)
    mgr_projects = client.get("/api/v1/projects", headers=mgr_headers)
    assert mgr_projects.status_code == 200
    mgr_proj_ids = {p["id"] for p in mgr_projects.json()}
    assert proj_a2.id in mgr_proj_ids
    assert proj_b.id not in mgr_proj_ids

    # Manager cannot access Dept B's project directly
    assert client.get(f"/api/v1/projects/{proj_b.id}", headers=mgr_headers).status_code == 403

    # 2. Acting Team Leader of team_a2 can access proj_a2 and create a task inside it
    assert client.get(f"/api/v1/projects/{proj_a2.id}", headers=tl_headers).status_code == 200
    create_resp = client.post(
        "/api/v1/tasks",
        headers=tl_headers,
        json={
            "project_id": proj_a2.id,
            "sprint_id": sprint_a2.id,
            "topic_id": topic_a2.id,
            "title": "Optimize 3-table join query",
            "priority": "Urgent",
            "status": "To Do",
            "story_points": 5,
            "deadline": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
    )
    assert create_resp.status_code == 201, create_resp.text
    task_id = create_resp.json()["id"]

    # 3. Multi-table task search endpoint finds the task by Sprint/Topic/Project keyword + overdue_only
    search_resp = client.get(
        "/api/v1/tasks/search",
        headers=mgr_headers,
        params={
            "keyword": "Query Optimization Epic",
            "department_id": dept_a.id,
            "team_id": team_a2.id,
            "priority": "Urgent",
            "overdue_only": True,
        },
    )
    assert search_resp.status_code == 200, search_resp.text
    found_ids = [item["id"] for item in search_resp.json()]
    assert task_id in found_ids

    # Finance employee cannot see Engineering task via search
    b_headers = _auth_header(client, emp_b.email)
    search_b = client.get(
        "/api/v1/tasks/search",
        headers=b_headers,
        params={"keyword": "Optimize 3-table join query"},
    )
    assert search_b.status_code == 200
    assert search_b.json() == []

    # 4. Soft-deleted task must return 404 from crud_task.get_by_id & REST GET /{id}
    del_resp = client.delete(f"/api/v1/tasks/{task_id}", headers=mgr_headers)
    assert del_resp.status_code == 200
    assert crud_task.get_by_id(db, task_id) is None
    assert client.get(f"/api/v1/tasks/{task_id}", headers=mgr_headers).status_code == 404

    # Cleanup unused variable lint
    assert worker_a2.id > 0


def test_hrm_contracts_rbac_and_soft_delete(client, db):
    dept_eng = Department(department_code="D-ENG", name="Tech", is_active=True)
    dept_hr = Department(department_code="D-HR", name="HR", is_active=True)
    db.add_all([dept_eng, dept_hr])
    db.flush()

    team_eng = Team(department_id=dept_eng.id, team_code="T-ENG", name="Backend", is_active=True)
    db.add(team_eng)
    db.flush()

    admin = _make_employee(db, "H-ADM", "hadm@example.com", ROLE_ADMIN)
    mgr_eng = _make_employee(db, "H-MGR", "hmgr@example.com", ROLE_MANAGER, department_id=dept_eng.id)
    mgr_hr = _make_employee(db, "H-HRMGR", "hhrmgr@example.com", ROLE_MANAGER, department_id=dept_hr.id)
    tl_eng = _make_employee(
        db, "H-TL", "htl@example.com", ROLE_EMPLOYEE, department_id=dept_eng.id, team_id=team_eng.id
    )
    team_eng.leader_id = tl_eng.id
    dev_eng = _make_employee(
        db, "H-DEV", "hdev@example.com", ROLE_EMPLOYEE, department_id=dept_eng.id, team_id=team_eng.id
    )
    db.commit()

    adm_h = _auth_header(client, admin.email)
    mgr_eng_h = _auth_header(client, mgr_eng.email)
    mgr_hr_h = _auth_header(client, mgr_hr.email)
    tl_h = _auth_header(client, tl_eng.email)
    dev_h = _auth_header(client, dev_eng.email)

    # Create contract for dev_eng (by scoped Engineering Manager)
    c1 = client.post(
        "/api/v1/hrm/contracts",
        headers=mgr_eng_h,
        json={
            "employee_id": dev_eng.id,
            "contract_code": "HD-2026-001",
            "contract_type": "Fixed-Term",
            "base_salary": "25000000.00",
            "allowance": "2000000.00",
            "currency": "VND",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "status": "Active",
        },
    )
    assert c1.status_code == 201, c1.text
    contract_id = c1.json()["id"]

    # Contract owner can view own salary/contract
    assert client.get(f"/api/v1/hrm/contracts/{contract_id}", headers=dev_h).status_code == 200
    # Admin can view
    assert client.get(f"/api/v1/hrm/contracts/{contract_id}", headers=adm_h).status_code == 200
    # Scoped Dept Manager can view
    assert client.get(f"/api/v1/hrm/contracts/{contract_id}", headers=mgr_eng_h).status_code == 200
    # Other Dept Manager gets 403
    assert client.get(f"/api/v1/hrm/contracts/{contract_id}", headers=mgr_hr_h).status_code == 403
    # Team Leader CANNOT view teammate's contract/salary (403)
    assert client.get(f"/api/v1/hrm/contracts/{contract_id}", headers=tl_h).status_code == 403
    # HR Manager cannot create contract for Engineering employee (403)
    c_forbid = client.post(
        "/api/v1/hrm/contracts",
        headers=mgr_hr_h,
        json={
            "employee_id": dev_eng.id,
            "contract_code": "HD-2026-999",
            "contract_type": "Indefinite",
            "base_salary": "30000000.00",
            "start_date": "2026-02-01",
            "status": "Active",
        },
    )
    assert c_forbid.status_code == 403

    # Creating a second Active contract expires the previous one cleanly
    c2 = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": dev_eng.id,
            "contract_code": "HD-2026-002",
            "contract_type": "Indefinite",
            "base_salary": "32000000.00",
            "allowance": "3000000.00",
            "start_date": "2026-06-01",
            "status": "Active",
        },
    )
    assert c2.status_code == 201
    c1_refreshed = db.get(EmploymentContract, contract_id)
    db.refresh(c1_refreshed)
    assert c1_refreshed.status == "Expired"

    # Soft delete contract (never hard deleted)
    del_c = client.delete(f"/api/v1/hrm/contracts/{contract_id}", headers=adm_h)
    assert del_c.status_code == 200
    db.refresh(c1_refreshed)
    assert c1_refreshed.is_deleted is True
    assert c1_refreshed.deleted_at is not None
    assert client.get(f"/api/v1/hrm/contracts/{contract_id}", headers=adm_h).status_code == 404


def test_hrm_leave_balance_vacation_attendance_overtime_and_overview(client, db):
    dept = Department(department_code="OPS-HRM", name="Ops HRM", is_active=True)
    db.add(dept)
    db.flush()
    team = Team(department_id=dept.id, team_code="OPS-T", name="Ops Team", is_active=True)
    db.add(team)
    db.flush()

    admin = _make_employee(db, "O-ADM", "oadm@example.com", ROLE_ADMIN)
    mgr = _make_employee(db, "O-MGR", "omgr@example.com", ROLE_MANAGER, department_id=dept.id)
    tl = _make_employee(db, "O-TL", "otl@example.com", ROLE_EMPLOYEE, department_id=dept.id, team_id=team.id)
    team.leader_id = tl.id
    emp = _make_employee(db, "O-EMP", "oemp@example.com", ROLE_EMPLOYEE, department_id=dept.id, team_id=team.id)

    proj = Project(
        project_code="OPS-PRJ",
        name="Ops Delivery",
        department_id=dept.id,
        team_id=team.id,
        status="In Progress",
        priority="High",
        budget=100,
        created_by=mgr.id,
        is_deleted=False,
    )
    db.add(proj)
    db.flush()

    today = date.today()
    leave_start = today + timedelta(days=5)
    leave_end = today + timedelta(days=7)  # 3 days
    task_conflict = Task(
        project_id=proj.id,
        title="Release Hotfix During Leave",
        priority="High",
        status="In Progress",
        deadline=datetime.combine(today + timedelta(days=6), time(17, 0)),
        created_by=mgr.id,
        is_deleted=False,
    )
    db.add(task_conflict)
    db.flush()
    from app.models.task_assignment import TaskAssignment
    db.add(TaskAssignment(task_id=task_conflict.id, employee_id=emp.id))
    db.commit()

    adm_h = _auth_header(client, admin.email)
    mgr_h = _auth_header(client, mgr.email)
    tl_h = _auth_header(client, tl.email)
    emp_h = _auth_header(client, emp.email)

    # 1. Initial leave balance auto-created at 12.0 days
    bal0 = client.get(
        "/api/v1/hrm/leave-balances/me",
        headers=emp_h,
        params={"leave_year": leave_start.year},
    )
    assert bal0.status_code == 200
    assert bal0.json()["remaining_days"] == 12.0

    # 2. Submit 3-day Annual Leave -> reserves pending_days = 3.0
    vac_resp = client.post(
        "/api/v1/vacations",
        headers=emp_h,
        json={
            "type": "Annual Leave",
            "start_date": leave_start.isoformat(),
            "end_date": leave_end.isoformat(),
            "reason": "Family trip",
        },
    )
    assert vac_resp.status_code == 201, vac_resp.text
    vac_id = vac_resp.json()["id"]

    bal1 = client.get(
        "/api/v1/hrm/leave-balances/me",
        headers=emp_h,
        params={"leave_year": leave_start.year},
    ).json()
    assert float(bal1["pending_days"]) == 3.0
    assert bal1["remaining_days"] == 9.0

    # Team Leader can SEE emp's vacation (contextual visibility)
    tl_vacs = client.get("/api/v1/vacations", headers=tl_h)
    assert tl_vacs.status_code == 200
    assert any(v["id"] == vac_id for v in tl_vacs.json())

    # Overlapping vacation rejected with 409
    vac_dup = client.post(
        "/api/v1/vacations",
        headers=emp_h,
        json={
            "type": "Annual Leave",
            "start_date": leave_start.isoformat(),
            "end_date": leave_end.isoformat(),
            "reason": "Overlap",
        },
    )
    assert vac_dup.status_code == 409

    # Manager Approve -> Admin HR Approve moves pending_days -> used_days
    assert (
        client.patch(
            f"/api/v1/vacations/{vac_id}",
            headers=mgr_h,
            json={"status": "Manager Approved"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/vacations/{vac_id}",
            headers=adm_h,
            json={"status": "HR Approved"},
        ).status_code
        == 200
    )
    bal2 = client.get(
        "/api/v1/hrm/leave-balances/me",
        headers=emp_h,
        params={"leave_year": leave_start.year},
    ).json()
    assert float(bal2["pending_days"]) == 0.0
    assert float(bal2["used_days"]) == 3.0
    assert bal2["remaining_days"] == 9.0

    # Admin revoke back to Pending refunds used_days -> pending_days
    assert (
        client.patch(
            f"/api/v1/vacations/{vac_id}",
            headers=adm_h,
            json={"status": "Pending"},
        ).status_code
        == 200
    )
    bal3 = client.get(
        "/api/v1/hrm/leave-balances/me",
        headers=emp_h,
        params={"leave_year": leave_start.year},
    ).json()
    assert float(bal3["used_days"]) == 0.0
    assert float(bal3["pending_days"]) == 3.0

    # 3. Attendance check-in & check-out (10h shift -> 8h standard + 2h OT)
    ci = client.post(
        "/api/v1/hrm/attendance/check-in",
        headers=emp_h,
        json={"work_date": today.isoformat(), "check_in": "08:00:00", "status": "Present"},
    )
    assert ci.status_code == 201, ci.text
    co = client.post(
        "/api/v1/hrm/attendance/check-out",
        headers=emp_h,
        json={"work_date": today.isoformat(), "check_out": "18:00:00"},
    )
    assert co.status_code == 200, co.text
    assert float(co.json()["work_hours"]) == 10.0
    assert float(co.json()["overtime_hours"]) == 2.0

    # 4. Overtime request + Team Leader note + Manager/Admin approval
    ot = client.post(
        "/api/v1/hrm/overtime",
        headers=emp_h,
        json={
            "project_id": proj.id,
            "work_date": today.isoformat(),
            "hours": "2.00",
            "reason": "Release verification",
        },
    )
    assert ot.status_code == 201, ot.text
    ot_id = ot.json()["id"]

    note_resp = client.patch(
        f"/api/v1/hrm/overtime/{ot_id}/leader-note",
        headers=tl_h,
        json={"team_leader_note": "Confirmed sprint release support."},
    )
    assert note_resp.status_code == 200
    assert note_resp.json()["team_leader_note"] == "Confirmed sprint release support."

    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{ot_id}/status",
            headers=mgr_h,
            json={"status": "Manager Approved"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{ot_id}/status",
            headers=adm_h,
            json={"status": "HR Approved"},
        ).status_code
        == 200
    )

    # 5. HRM Overview + Leave-Task Overlap Detection
    overview = client.get("/api/v1/hrm/me/overview", headers=emp_h)
    assert overview.status_code == 200, overview.text
    ov_data = overview.json()
    assert ov_data["attendance_days_this_month"] >= 1
    assert len(ov_data["leave_task_conflicts"]) == 1
    assert ov_data["leave_task_conflicts"][0]["task_id"] == task_conflict.id

    # 6. Soft-delete vacation refunds remaining pending_days cleanly
    del_vac = client.delete(f"/api/v1/vacations/{vac_id}", headers=emp_h)
    assert del_vac.status_code == 200
    bal4 = client.get(
        "/api/v1/hrm/leave-balances/me",
        headers=emp_h,
        params={"leave_year": leave_start.year},
    ).json()
    assert float(bal4["pending_days"]) == 0.0
    assert bal4["remaining_days"] == 12.0
    vac_row = db.scalar(select(Vacation).where(Vacation.id == vac_id))
    assert vac_row is not None and vac_row.is_deleted is True
