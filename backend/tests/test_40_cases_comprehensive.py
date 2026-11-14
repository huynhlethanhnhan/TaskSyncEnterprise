# 📂 FILE: backend/tests/test_40_cases_comprehensive.py
"""40-case comprehensive verification suite across Security, Work Management, RBAC, HRM & Schema."""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import select

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.core.security import get_password_hash, verify_password
from app.core.settings import Settings
from app.crud import task as crud_task
from app.database import Base
from app.models.audit import AuditLog
from app.models.department import Department
from app.models.discussion_topic import DiscussionTopic
from app.models.employee import Employee
from app.models.hrm import (
    AttendanceLog,
    BackupHistoryLog,
    EmploymentContract,
    LeaveBalance,
    OvertimeRequest,
)
from app.models.mixins import AuditMixin
from app.models.project import Project
from app.models.role import Role
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.team import Team
from app.models.vacation import Vacation
from app.schemas.employee import EmployeeCreate
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


def _make_emp(
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
        full_name=f"Employee {code}",
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


def _headers(client, email: str) -> dict[str, str]:
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": TEST_PWD})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _setup_org(db):
    d1 = Department(department_code="D-ENG", name="Engineering", is_active=True)
    d2 = Department(department_code="D-FIN", name="Finance", is_active=True)
    db.add_all([d1, d2])
    db.flush()

    t1 = Team(department_id=d1.id, team_code="ENG-1", name="Core", is_active=True)
    t2 = Team(department_id=d1.id, team_code="ENG-2", name="Platform", is_active=True)
    t3 = Team(department_id=d1.id, team_code="ENG-3", name="Mobile", is_active=True)
    tf = Team(department_id=d2.id, team_code="FIN-1", name="Audit", is_active=True)
    db.add_all([t1, t2, t3, tf])
    db.flush()

    adm = _make_emp(db, "ADM", "adm@example.com", ROLE_ADMIN)
    mgr1 = _make_emp(db, "MGR1", "mgr1@example.com", ROLE_MANAGER, d1.id, t1.id)
    mgr2 = _make_emp(db, "MGR2", "mgr2@example.com", ROLE_MANAGER, d2.id, tf.id)
    d1.manager_id = mgr1.id
    d2.manager_id = mgr2.id

    tl_acting = _make_emp(db, "TL2", "tl2@example.com", ROLE_EMPLOYEE, d1.id, t1.id)
    t2.leader_id = tl_acting.id

    emp_t2 = _make_emp(db, "E2", "e2@example.com", ROLE_EMPLOYEE, d1.id, t2.id)
    emp_fin = _make_emp(db, "EF", "ef@example.com", ROLE_EMPLOYEE, d2.id, tf.id)

    p_t2 = Project(
        project_code="PRJ-T2",
        name="Platform Modernization",
        department_id=d1.id,
        team_id=t2.id,
        status="In Progress",
        priority="High",
        budget=5000,
        created_by=adm.id,
        is_deleted=False,
    )
    p_t3 = Project(
        project_code="PRJ-T3",
        name="Mobile V3",
        department_id=d1.id,
        team_id=t3.id,
        status="In Progress",
        priority="Medium",
        budget=3000,
        created_by=adm.id,
        is_deleted=False,
    )
    p_fin = Project(
        project_code="PRJ-FIN",
        name="Finance Audit System",
        department_id=d2.id,
        team_id=tf.id,
        status="In Progress",
        priority="Low",
        budget=1000,
        created_by=adm.id,
        is_deleted=False,
    )
    db.add_all([p_t2, p_t3, p_fin])
    db.commit()
    return {
        "d1": d1,
        "d2": d2,
        "t1": t1,
        "t2": t2,
        "t3": t3,
        "tf": tf,
        "adm": adm,
        "mgr1": mgr1,
        "mgr2": mgr2,
        "tl_acting": tl_acting,
        "emp_t2": emp_t2,
        "emp_fin": emp_fin,
        "p_t2": p_t2,
        "p_t3": p_t3,
        "p_fin": p_fin,
    }


# ---------------------------------------------------------------------------
# Group A: Password Security & Auth Policy (TC01 - TC05)
# ---------------------------------------------------------------------------


def test_tc01_default_seed_password_is_admin_task_2026():
    s = Settings(ENVIRONMENT="development")
    pwd = s.SEED_ADMIN_PASSWORD.get_secret_value()
    assert pwd == "Admin@Task2026!"
    schema = EmployeeCreate(
        employee_code="SEC01",
        full_name="Security Check",
        email="sec01@example.com",
        password=pwd,
        role_id=ROLE_ADMIN,
    )
    assert schema.password == "Admin@Task2026!"


def test_tc02_bcrypt_hashing_and_verification_no_plaintext_match():
    hashed = get_password_hash("Admin@Task2026!")
    assert hashed != "Admin@Task2026!"
    assert verify_password("Admin@Task2026!", hashed) is True
    assert verify_password("TaskSync@2026", hashed) is False


def test_tc03_production_readiness_flags_default_seed_password():
    prod = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="A_Very_Strong_Random_Secret_Key_32Plus_Chars_2026!",
        ALLOWED_HOSTS=["app.tasksync.example.com"],
        SEED_ADMIN_PASSWORD="Admin@Task2026!",
    )
    with patch("app.startup.production_check.settings", prod), patch(
        "app.startup.production_check.SystemValidator.run_all_checks",
        return_value={"db": "PASS", "redis": "PASS"},
    ):
        rep = run_production_readiness_check()
        assert rep["security_warnings"] is True
        assert rep["score"] == 80


def test_tc04_production_readiness_passes_with_rotated_seed_password():
    prod = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="A_Very_Strong_Random_Secret_Key_32Plus_Chars_2026!",
        ALLOWED_HOSTS=["app.tasksync.example.com"],
        SEED_ADMIN_PASSWORD="Rotated#Strong#Prod#Password#99!",
    )
    with patch("app.startup.production_check.settings", prod), patch(
        "app.startup.production_check.SystemValidator.run_all_checks",
        return_value={"db": "PASS", "redis": "PASS"},
    ):
        rep = run_production_readiness_check()
        assert rep["security_warnings"] is False
        assert rep["score"] == 100
        assert rep["is_ready"] is True


def test_tc05_seed_runner_never_prints_plaintext_password():
    backend_root = Path(__file__).resolve().parents[1]
    seed_runner_src = (backend_root / "app" / "seeds" / "seed_runner.py").read_text(
        encoding="utf-8"
    )
    seed_emp_src = (backend_root / "app" / "seeds" / "seed_employees.py").read_text(
        encoding="utf-8"
    )
    assert "TaskSync@2026" not in seed_runner_src
    assert "Admin@Task2026!" not in seed_runner_src
    assert "TaskSync@2026" not in seed_emp_src


# ---------------------------------------------------------------------------
# Group B: Contextual Team Leader & Work Management RBAC / Queries (TC06 - TC15)
# ---------------------------------------------------------------------------


def test_tc06_manager_sees_other_team_project_in_own_department(client, db):
    org = _setup_org(db)
    h = _headers(client, org["mgr1"].email)
    resp = client.get("/api/v1/projects", headers=h)
    assert resp.status_code == 200
    ids = {p["id"] for p in resp.json()}
    assert org["p_t2"].id in ids
    assert org["p_t3"].id in ids


def test_tc07_manager_via_department_manager_id_sees_cross_team_project(client, db):
    org = _setup_org(db)
    # Remove mgr1.department_id but keep Department.manager_id == mgr1.id
    org["mgr1"].department_id = None
    db.commit()
    h = _headers(client, org["mgr1"].email)
    resp = client.get(f"/api/v1/projects/{org['p_t2'].id}", headers=h)
    assert resp.status_code == 200


def test_tc08_manager_blocked_from_other_department_project(client, db):
    org = _setup_org(db)
    h = _headers(client, org["mgr1"].email)
    assert client.get(f"/api/v1/projects/{org['p_fin'].id}", headers=h).status_code == 403
    assert client.delete(f"/api/v1/projects/{org['p_fin'].id}", headers=h).status_code == 403


def test_tc09_acting_temporary_team_leader_can_access_and_create_tasks_in_led_team(client, db):
    org = _setup_org(db)
    h = _headers(client, org["tl_acting"].email)
    assert client.get(f"/api/v1/projects/{org['p_t2'].id}", headers=h).status_code == 200
    t_resp = client.post(
        "/api/v1/tasks",
        headers=h,
        json={"project_id": org["p_t2"].id, "title": "Acting TL Task", "priority": "High"},
    )
    assert t_resp.status_code == 201, t_resp.text


def test_tc10_acting_team_leader_blocked_from_unrelated_team_project(client, db):
    org = _setup_org(db)
    h = _headers(client, org["tl_acting"].email)
    assert client.get(f"/api/v1/projects/{org['p_t3'].id}", headers=h).status_code == 403
    assert (
        client.post(
            "/api/v1/tasks",
            headers=h,
            json={"project_id": org["p_t3"].id, "title": "Forbidden", "priority": "Low"},
        ).status_code
        == 403
    )


def test_tc11_regular_employee_cannot_create_or_delete_tasks(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    created = client.post(
        "/api/v1/tasks",
        headers=adm_h,
        json={"project_id": org["p_t2"].id, "title": "Protected Task"},
    ).json()

    emp_h = _headers(client, org["emp_t2"].email)
    assert (
        client.post(
            "/api/v1/tasks",
            headers=emp_h,
            json={"project_id": org["p_t2"].id, "title": "Self Create"},
        ).status_code
        == 403
    )
    assert client.delete(f"/api/v1/tasks/{created['id']}", headers=emp_h).status_code == 403


def test_tc12_task_soft_delete_hides_from_get_by_id_and_rest_apis(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    created = client.post(
        "/api/v1/tasks",
        headers=adm_h,
        json={"project_id": org["p_t2"].id, "title": "To Soft Delete"},
    ).json()
    tid = created["id"]

    assert client.delete(f"/api/v1/tasks/{tid}", headers=adm_h).status_code == 200
    assert crud_task.get_by_id(db, tid) is None
    assert client.get(f"/api/v1/tasks/{tid}", headers=adm_h).status_code == 404
    assert (
        client.put(f"/api/v1/tasks/{tid}", headers=adm_h, json={"status": "Done"}).status_code
        == 404
    )
    row = db.get(Task, tid)
    assert row is not None and row.is_deleted is True


def test_tc13_multi_table_task_search_by_keyword_sprint_topic_project(client, db):
    org = _setup_org(db)
    sp = Sprint(project_id=org["p_t2"].id, name="Sprint-Omega-Search", status="Active", is_deleted=False)
    tp = DiscussionTopic(
        project_id=org["p_t2"].id,
        title="Topic-Apollo-Epic",
        content="Apollo Epic details",
        is_deleted=False,
    )
    db.add_all([sp, tp])
    db.flush()
    task = Task(
        project_id=org["p_t2"].id,
        sprint_id=sp.id,
        topic_id=tp.id,
        title="Build Analytics API",
        priority="High",
        status="To Do",
        is_deleted=False,
    )
    db.add(task)
    db.commit()

    mgr_h = _headers(client, org["mgr1"].email)
    for kw in ("Sprint-Omega-Search", "Topic-Apollo-Epic", "Platform Modernization", "Analytics"):
        r = client.get("/api/v1/tasks/search", headers=mgr_h, params={"keyword": kw})
        assert r.status_code == 200
        assert any(item["id"] == task.id for item in r.json()), f"Failed keyword: {kw}"


def test_tc14_multi_table_task_search_filters_priority_status_assignee_overdue(client, db):
    org = _setup_org(db)
    overdue_task = Task(
        project_id=org["p_t2"].id,
        title="Urgent Late Item",
        priority="Urgent",
        status="In Progress",
        deadline=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2),
        is_deleted=False,
    )
    future_task = Task(
        project_id=org["p_t2"].id,
        title="Low Future Item",
        priority="Low",
        status="Done",
        deadline=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=5),
        is_deleted=False,
    )
    db.add_all([overdue_task, future_task])
    db.flush()
    db.add(TaskAssignment(task_id=overdue_task.id, employee_id=org["emp_t2"].id))
    db.commit()

    mgr_h = _headers(client, org["mgr1"].email)
    r = client.get(
        "/api/v1/tasks/search",
        headers=mgr_h,
        params={
            "department_id": org["d1"].id,
            "team_id": org["t2"].id,
            "priority": "Urgent",
            "status": "In Progress",
            "assigned_to": org["emp_t2"].id,
            "overdue_only": True,
        },
    )
    assert r.status_code == 200
    assert [t["id"] for t in r.json()] == [overdue_task.id]


def test_tc15_multi_table_task_search_respects_rbac_isolation(client, db):
    org = _setup_org(db)
    t = Task(project_id=org["p_t2"].id, title="Secret-Eng-Task-XYZ", priority="High", is_deleted=False)
    db.add(t)
    db.commit()

    fin_h = _headers(client, org["emp_fin"].email)
    r = client.get("/api/v1/tasks/search", headers=fin_h, params={"keyword": "Secret-Eng-Task-XYZ"})
    assert r.status_code == 200
    assert r.json() == []


# ---------------------------------------------------------------------------
# Group C: HRM Leave Balances & Vacation Workflow (TC16 - TC24)
# ---------------------------------------------------------------------------


def test_tc16_leave_balance_auto_initializes_at_12_days(client, db):
    org = _setup_org(db)
    h = _headers(client, org["emp_t2"].email)
    r = client.get("/api/v1/hrm/leave-balances/me", headers=h, params={"leave_year": 2026})
    assert r.status_code == 200
    assert float(r.json()["annual_entitlement"]) == 12.0
    assert r.json()["remaining_days"] == 12.0


def test_tc17_annual_leave_create_reserves_pending_days(client, db):
    org = _setup_org(db)
    h = _headers(client, org["emp_t2"].email)
    r = client.post(
        "/api/v1/vacations",
        headers=h,
        json={"type": "Annual Leave", "start_date": "2026-08-10", "end_date": "2026-08-13", "reason": "Trip"},
    )
    assert r.status_code == 201
    bal = client.get("/api/v1/hrm/leave-balances/me", headers=h, params={"leave_year": 2026}).json()
    assert float(bal["pending_days"]) == 4.0
    assert bal["remaining_days"] == 8.0


def test_tc18_vacation_insufficient_balance_rejected_409(client, db):
    org = _setup_org(db)
    h = _headers(client, org["emp_t2"].email)
    r = client.post(
        "/api/v1/vacations",
        headers=h,
        json={"type": "Annual Leave", "start_date": "2026-09-01", "end_date": "2026-09-15", "reason": "Too long"},
    )
    assert r.status_code == 409


def test_tc19_vacation_overlapping_dates_rejected_409(client, db):
    org = _setup_org(db)
    h = _headers(client, org["emp_t2"].email)
    assert (
        client.post(
            "/api/v1/vacations",
            headers=h,
            json={"type": "Annual Leave", "start_date": "2026-10-05", "end_date": "2026-10-07"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/v1/vacations",
            headers=h,
            json={"type": "Annual Leave", "start_date": "2026-10-07", "end_date": "2026-10-09"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/vacations",
            headers=h,
            json={"type": "Annual Leave", "start_date": "2026-10-08", "end_date": "2026-10-09"},
        ).status_code
        == 201
    )


def test_tc20_vacation_manager_scoped_get_by_id_blocks_other_dept(client, db):
    org = _setup_org(db)
    emp_h = _headers(client, org["emp_t2"].email)
    vac = client.post(
        "/api/v1/vacations",
        headers=emp_h,
        json={"type": "Sick Leave", "start_date": "2026-10-01", "end_date": "2026-10-01"},
    ).json()

    mgr2_h = _headers(client, org["mgr2"].email)
    assert client.get(f"/api/v1/vacations/{vac['id']}", headers=mgr2_h).status_code == 403
    assert (
        client.patch(
            f"/api/v1/vacations/{vac['id']}", headers=mgr2_h, json={"status": "Manager Approved"}
        ).status_code
        == 403
    )


def test_tc21_vacation_anti_self_approval_blocked_403(client, db):
    org = _setup_org(db)
    mgr_h = _headers(client, org["mgr1"].email)
    vac = client.post(
        "/api/v1/vacations",
        headers=mgr_h,
        json={"type": "Annual Leave", "start_date": "2026-11-01", "end_date": "2026-11-02"},
    ).json()
    assert (
        client.patch(
            f"/api/v1/vacations/{vac['id']}", headers=mgr_h, json={"status": "Manager Approved"}
        ).status_code
        == 403
    )


def test_tc22_vacation_team_leader_sees_team_leaves_cannot_approve(client, db):
    org = _setup_org(db)
    emp_h = _headers(client, org["emp_t2"].email)
    vac = client.post(
        "/api/v1/vacations",
        headers=emp_h,
        json={"type": "Annual Leave", "start_date": "2026-11-10", "end_date": "2026-11-11"},
    ).json()

    tl_h = _headers(client, org["tl_acting"].email)
    assert client.get(f"/api/v1/vacations/{vac['id']}", headers=tl_h).status_code == 200
    assert (
        client.patch(
            f"/api/v1/vacations/{vac['id']}", headers=tl_h, json={"status": "Manager Approved"}
        ).status_code
        == 409
    )


def test_tc23_vacation_hr_approved_deducts_and_revoke_refunds_balance(client, db):
    org = _setup_org(db)
    emp_h = _headers(client, org["emp_t2"].email)
    mgr_h = _headers(client, org["mgr1"].email)
    adm_h = _headers(client, org["adm"].email)

    vac = client.post(
        "/api/v1/vacations",
        headers=emp_h,
        json={"type": "Annual Leave", "start_date": "2026-07-01", "end_date": "2026-07-05"},
    ).json()
    vid = vac["id"]
    assert client.patch(f"/api/v1/vacations/{vid}", headers=mgr_h, json={"status": "Manager Approved"}).status_code == 200
    assert client.patch(f"/api/v1/vacations/{vid}", headers=adm_h, json={"status": "HR Approved"}).status_code == 200

    bal_after_hr = client.get("/api/v1/hrm/leave-balances/me", headers=emp_h, params={"leave_year": 2026}).json()
    assert float(bal_after_hr["used_days"]) == 5.0
    assert float(bal_after_hr["pending_days"]) == 0.0

    # Revoke back to Pending -> refunds used_days back to pending_days
    assert client.patch(f"/api/v1/vacations/{vid}", headers=adm_h, json={"status": "Pending"}).status_code == 200
    bal_after_revoke = client.get("/api/v1/hrm/leave-balances/me", headers=emp_h, params={"leave_year": 2026}).json()
    assert float(bal_after_revoke["used_days"]) == 0.0
    assert float(bal_after_revoke["pending_days"]) == 5.0

    # Soft delete refunds pending_days to 0
    assert client.delete(f"/api/v1/vacations/{vid}", headers=emp_h).status_code == 200
    bal_after_del = client.get("/api/v1/hrm/leave-balances/me", headers=emp_h, params={"leave_year": 2026}).json()
    assert float(bal_after_del["pending_days"]) == 0.0
    assert client.get(f"/api/v1/vacations/{vid}", headers=emp_h).status_code == 404


def test_tc24_admin_leave_balance_adjustment_and_audit_log(client, db):
    org = _setup_org(db)
    mgr_h = _headers(client, org["mgr1"].email)
    # Manager blocked from adjusting own balance
    assert (
        client.put(
            f"/api/v1/hrm/leave-balances/{org['mgr1'].id}",
            headers=mgr_h,
            json={"leave_year": 2026, "annual_entitlement": "18.00", "carried_over_days": "2.00"},
        ).status_code
        == 403
    )

    adm_h = _headers(client, org["adm"].email)
    r = client.put(
        f"/api/v1/hrm/leave-balances/{org['emp_t2'].id}",
        headers=adm_h,
        json={"leave_year": 2026, "annual_entitlement": "15.00", "carried_over_days": "3.00"},
    )
    assert r.status_code == 200
    assert r.json()["remaining_days"] == 18.0
    audit = db.scalar(select(AuditLog).where(AuditLog.action.like("HRM_LEAVE_BALANCE_ADJUST%")))
    assert audit is not None


# ---------------------------------------------------------------------------
# Group D: Employment Contracts & Salary RBAC (TC25 - TC31)
# ---------------------------------------------------------------------------


def test_tc25_contract_create_by_admin_and_scoped_dept_manager(client, db):
    org = _setup_org(db)
    mgr_h = _headers(client, org["mgr1"].email)
    payload = {
        "employee_id": org["emp_t2"].id,
        "contract_code": "HD-TC25",
        "contract_type": "Fixed-Term",
        "base_salary": "22000000.00",
        "allowance": "1500000.00",
        "start_date": "2026-01-01",
        "status": "Active",
    }
    assert client.post("/api/v1/hrm/contracts", headers=mgr_h, json=payload).status_code == 201
    assert client.post("/api/v1/hrm/contracts", headers=mgr_h, json=payload).status_code == 409


def test_tc26_contract_salary_visible_to_admin_dept_manager_owner_only(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    mgr_h = _headers(client, org["mgr1"].email)
    emp_h = _headers(client, org["emp_t2"].email)

    cid = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-TC26",
            "base_salary": "24000000.00",
            "start_date": "2026-01-01",
        },
    ).json()["id"]

    for h in (adm_h, mgr_h, emp_h):
        r = client.get(f"/api/v1/hrm/contracts/{cid}", headers=h)
        assert r.status_code == 200
        assert r.json()["base_salary"] == "24000000.00"


def test_tc27_contract_salary_blocked_for_other_dept_manager_and_team_leader(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    cid = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-TC27",
            "base_salary": "24000000.00",
            "start_date": "2026-01-01",
        },
    ).json()["id"]

    for email in (org["mgr2"].email, org["tl_acting"].email, org["emp_fin"].email):
        h = _headers(client, email)
        assert client.get(f"/api/v1/hrm/contracts/{cid}", headers=h).status_code == 403
        assert (
            client.get(
                "/api/v1/hrm/contracts", headers=h, params={"employee_id": org["emp_t2"].id}
            ).status_code
            == 403
        )


def test_tc28_manager_cannot_create_or_modify_own_contract(client, db):
    org = _setup_org(db)
    mgr_h = _headers(client, org["mgr1"].email)
    assert (
        client.post(
            "/api/v1/hrm/contracts",
            headers=mgr_h,
            json={
                "employee_id": org["mgr1"].id,
                "contract_code": "HD-SELF",
                "base_salary": "99000000.00",
                "start_date": "2026-01-01",
            },
        ).status_code
        == 403
    )


def test_tc29_creating_second_active_contract_expires_prior_contract(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    c1 = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-TC29-A",
            "base_salary": "20000000.00",
            "start_date": "2026-01-01",
            "status": "Active",
        },
    ).json()["id"]
    client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-TC29-B",
            "base_salary": "26000000.00",
            "start_date": "2026-06-01",
            "status": "Active",
        },
    )
    assert client.get(f"/api/v1/hrm/contracts/{c1}", headers=adm_h).json()["status"] == "Expired"


def test_tc30_contract_invalid_date_range_rejected_422_and_400(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    bad = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-BAD",
            "base_salary": "10000000.00",
            "start_date": "2026-05-01",
            "end_date": "2026-04-01",
        },
    )
    assert bad.status_code == 422

    ok = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-GOOD",
            "base_salary": "10000000.00",
            "start_date": "2026-05-01",
        },
    ).json()["id"]
    upd_bad = client.put(
        f"/api/v1/hrm/contracts/{ok}", headers=adm_h, json={"end_date": "2026-01-01"}
    )
    assert upd_bad.status_code == 400


def test_tc31_contract_soft_delete_preserves_row_with_audit_trail(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    cid = client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["emp_t2"].id,
            "contract_code": "HD-TC31",
            "base_salary": "18000000.00",
            "start_date": "2026-01-01",
        },
    ).json()["id"]
    assert client.delete(f"/api/v1/hrm/contracts/{cid}", headers=adm_h).status_code == 200
    assert client.get(f"/api/v1/hrm/contracts/{cid}", headers=adm_h).status_code == 404
    row = db.get(EmploymentContract, cid)
    assert row is not None and row.is_deleted is True and row.deleted_by_id == org["adm"].id
    assert db.scalar(select(AuditLog).where(AuditLog.action.like("HRM_CONTRACT_SOFT_DELETE%"))) is not None


# ---------------------------------------------------------------------------
# Group E: Attendance & Overtime Workflow (TC32 - TC36)
# ---------------------------------------------------------------------------


def test_tc32_attendance_checkin_duplicate_and_checkout_hours(client, db):
    org = _setup_org(db)
    h = _headers(client, org["emp_t2"].email)
    d = date.today().isoformat()
    assert (
        client.post(
            "/api/v1/hrm/attendance/check-in",
            headers=h,
            json={"work_date": d, "check_in": "08:00:00", "status": "Remote"},
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/v1/hrm/attendance/check-in",
            headers=h,
            json={"work_date": d, "check_in": "08:05:00"},
        ).status_code
        == 409
    )
    out = client.post(
        "/api/v1/hrm/attendance/check-out",
        headers=h,
        json={"work_date": d, "check_out": "18:30:00"},
    )
    assert out.status_code == 200
    assert float(out.json()["work_hours"]) == 10.5
    assert float(out.json()["overtime_hours"]) == 2.5


def test_tc33_attendance_checkout_before_checkin_or_duplicate_rejected(client, db):
    org = _setup_org(db)
    h = _headers(client, org["emp_t2"].email)
    d = date.today().isoformat()
    # Checkout without check-in -> 404
    assert (
        client.post(
            "/api/v1/hrm/attendance/check-out",
            headers=h,
            json={"work_date": d, "check_out": "17:00:00"},
        ).status_code
        == 404
    )
    client.post(
        "/api/v1/hrm/attendance/check-in",
        headers=h,
        json={"work_date": d, "check_in": "09:00:00"},
    )
    assert (
        client.post(
            "/api/v1/hrm/attendance/check-out",
            headers=h,
            json={"work_date": d, "check_out": "08:00:00"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/hrm/attendance/check-out",
            headers=h,
            json={"work_date": d, "check_out": "17:00:00"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/v1/hrm/attendance/check-out",
            headers=h,
            json={"work_date": d, "check_out": "18:00:00"},
        ).status_code
        == 409
    )


def test_tc34_overtime_full_workflow_team_leader_note_manager_admin(client, db):
    org = _setup_org(db)
    emp_h = _headers(client, org["emp_t2"].email)
    tl_h = _headers(client, org["tl_acting"].email)
    mgr_h = _headers(client, org["mgr1"].email)
    adm_h = _headers(client, org["adm"].email)

    ot = client.post(
        "/api/v1/hrm/overtime",
        headers=emp_h,
        json={"project_id": org["p_t2"].id, "work_date": date.today().isoformat(), "hours": "3.00", "reason": "Deploy"},
    ).json()
    oid = ot["id"]
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{oid}/leader-note",
            headers=tl_h,
            json={"team_leader_note": "Verified prod deploy"},
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{oid}/status",
            headers=mgr_h,
            json={"status": "Manager Approved"},
        ).status_code
        == 200
    )
    hr_res = client.patch(
        f"/api/v1/hrm/overtime/{oid}/status",
        headers=adm_h,
        json={"status": "HR Approved"},
    )
    assert hr_res.status_code == 200
    assert hr_res.json()["team_leader_note"] == "Verified prod deploy"
    assert db.scalar(select(AuditLog).where(AuditLog.action.like("HRM_OT_HR_APPROVED%"))) is not None


def test_tc35_overtime_anti_self_approval_and_cross_dept_blocked(client, db):
    org = _setup_org(db)
    emp_h = _headers(client, org["emp_t2"].email)
    mgr1_h = _headers(client, org["mgr1"].email)
    mgr2_h = _headers(client, org["mgr2"].email)
    fin_h = _headers(client, org["emp_fin"].email)

    oid = client.post(
        "/api/v1/hrm/overtime",
        headers=emp_h,
        json={"work_date": date.today().isoformat(), "hours": "2.00", "reason": "Bugfix"},
    ).json()["id"]

    # Owner cannot self-approve
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{oid}/status", headers=emp_h, json={"status": "Manager Approved"}
        ).status_code
        == 403
    )
    # Cross-dept manager blocked
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{oid}/status", headers=mgr2_h, json={"status": "Manager Approved"}
        ).status_code
        == 403
    )
    # Unrelated employee blocked from adding leader note
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{oid}/leader-note", headers=fin_h, json={"team_leader_note": "Hack"}
        ).status_code
        == 403
    )
    # Manager cannot jump straight to HR Approved
    assert (
        client.patch(
            f"/api/v1/hrm/overtime/{oid}/status", headers=mgr1_h, json={"status": "HR Approved"}
        ).status_code
        == 409
    )


def test_tc36_overtime_soft_delete_workflow(client, db):
    org = _setup_org(db)
    emp_h = _headers(client, org["emp_t2"].email)
    oid = client.post(
        "/api/v1/hrm/overtime",
        headers=emp_h,
        json={"work_date": date.today().isoformat(), "hours": "1.50"},
    ).json()["id"]
    assert client.delete(f"/api/v1/hrm/overtime/{oid}", headers=emp_h).status_code == 200
    assert all(x["id"] != oid for x in client.get("/api/v1/hrm/overtime", headers=emp_h).json())
    row = db.get(OvertimeRequest, oid)
    assert row is not None and row.is_deleted is True


# ---------------------------------------------------------------------------
# Group F: Cross-Module Integration, Overview, Backups & Schema (TC37 - TC40)
# ---------------------------------------------------------------------------


def test_tc37_leave_task_overlap_warning_detects_deadline_conflict(client, db):
    org = _setup_org(db)
    today = date.today()
    t_active = Task(
        project_id=org["p_t2"].id,
        title="Active Overlap Task",
        status="In Progress",
        deadline=datetime.combine(today + timedelta(days=4), time(12, 0)),
        is_deleted=False,
    )
    t_done = Task(
        project_id=org["p_t2"].id,
        title="Already Done Task",
        status="Done",
        deadline=datetime.combine(today + timedelta(days=4), time(12, 0)),
        is_deleted=False,
    )
    db.add_all([t_active, t_done])
    db.flush()
    db.add_all([
        TaskAssignment(task_id=t_active.id, employee_id=org["emp_t2"].id),
        TaskAssignment(task_id=t_done.id, employee_id=org["emp_t2"].id),
    ])
    db.commit()

    emp_h = _headers(client, org["emp_t2"].email)
    client.post(
        "/api/v1/vacations",
        headers=emp_h,
        json={
            "type": "Annual Leave",
            "start_date": (today + timedelta(days=3)).isoformat(),
            "end_date": (today + timedelta(days=5)).isoformat(),
        },
    )
    conflicts = client.get(
        "/api/v1/hrm/leave-task-conflicts", headers=emp_h, params={"project_id": org["p_t2"].id}
    )
    assert conflicts.status_code == 200
    assert [c["task_id"] for c in conflicts.json()] == [t_active.id]


def test_tc38_hrm_me_overview_aggregates_all_subsystems(client, db):
    org = _setup_org(db)
    tl_h = _headers(client, org["tl_acting"].email)
    adm_h = _headers(client, org["adm"].email)

    client.post(
        "/api/v1/hrm/contracts",
        headers=adm_h,
        json={
            "employee_id": org["tl_acting"].id,
            "contract_code": "HD-TL-OV",
            "base_salary": "35000000.00",
            "start_date": "2026-01-01",
            "status": "Active",
        },
    )
    d = date.today().isoformat()
    client.post("/api/v1/hrm/attendance/check-in", headers=tl_h, json={"work_date": d, "check_in": "08:00:00"})
    client.post("/api/v1/hrm/attendance/check-out", headers=tl_h, json={"work_date": d, "check_out": "17:30:00"})
    client.post("/api/v1/hrm/overtime", headers=tl_h, json={"work_date": d, "hours": "1.50"})

    ov = client.get("/api/v1/hrm/me/overview", headers=tl_h)
    assert ov.status_code == 200
    data = ov.json()
    assert data["is_team_leader"] is True
    assert org["t2"].id in data["led_team_ids"]
    assert data["active_contract"]["contract_code"] == "HD-TL-OV"
    assert data["attendance_days_this_month"] == 1
    assert data["total_work_hours_this_month"] == 9.5
    assert data["pending_overtime_requests"] == 1


def test_tc39_backup_history_governance_admin_only(client, db):
    org = _setup_org(db)
    adm_h = _headers(client, org["adm"].email)
    mgr_h = _headers(client, org["mgr1"].email)
    emp_h = _headers(client, org["emp_t2"].email)

    assert client.post("/api/v1/hrm/backups", headers=mgr_h, json={"backup_type": "FULL"}).status_code == 403
    assert client.get("/api/v1/hrm/backups", headers=emp_h).status_code == 403

    r = client.post(
        "/api/v1/hrm/backups",
        headers=adm_h,
        json={
            "backup_type": "LOGICAL_ROLLBACK",
            "database_name": "TaskSyncEnterprise",
            "status": "VERIFIED",
            "notes": "Verified before HRM upgrade",
        },
    )
    assert r.status_code == 201
    listed = client.get("/api/v1/hrm/backups", headers=adm_h)
    assert listed.status_code == 200
    assert listed.json()[0]["backup_type"] == "LOGICAL_ROLLBACK"
    assert db.scalar(select(AuditLog).where(AuditLog.action.like("DB_BACKUP_LOGICAL_ROLLBACK%"))) is not None


def test_tc40_alembic_single_head_and_all_20_domain_models_registered():
    backend_root = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))
    script = ScriptDirectory.from_config(alembic_cfg)

    heads = script.get_heads()
    assert heads == ["b2c3d4e5f6a7"]
    rev = script.get_revision("b2c3d4e5f6a7")
    assert rev.down_revision == "a1b2c3d4e5f6"
    prev_rev = script.get_revision("a1b2c3d4e5f6")
    assert prev_rev.down_revision == "91d53e9f6c91"

    table_names = set(Base.metadata.tables.keys())
    for expected in (
        "vacations",
        "leave_balances",
        "employment_contracts",
        "attendance_logs",
        "overtime_requests",
        "backup_history_logs",
        "payroll_records",
        "recruitment_candidates",
    ):
        assert any(t == expected or t.endswith(f".{expected}") for t in table_names)

    for model_cls in (EmploymentContract, OvertimeRequest):
        assert issubclass(model_cls, AuditMixin)
        assert hasattr(model_cls, "is_deleted")
        assert hasattr(model_cls, "deleted_at")
    assert hasattr(Vacation, "is_deleted")
    assert hasattr(Vacation, "deleted_at")
    assert hasattr(LeaveBalance, "remaining_days")
    assert hasattr(AttendanceLog, "overtime_hours")
    assert hasattr(BackupHistoryLog, "backup_type")
