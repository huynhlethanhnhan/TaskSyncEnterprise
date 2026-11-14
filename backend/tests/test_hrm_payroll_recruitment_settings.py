from datetime import date, time
from decimal import Decimal

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.core.security import get_password_hash
from app.models.department import Department
from app.models.employee import Employee
from app.models.role import Role

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
) -> Employee:
    _ensure_roles(db)
    emp = Employee(
        employee_code=code,
        full_name=f"User {code}",
        email=email,
        password_hash=get_password_hash(TEST_PWD),
        role_id=role_id,
        department_id=department_id,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
    )
    db.add(emp)
    db.flush()
    return emp


def _auth_header(client, email: str) -> dict[str, str]:
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": TEST_PWD},
    )
    assert resp.status_code == 200, resp.json()
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_runtime_settings_sync_and_admin_security_boundary(client, db):
    """Any authenticated user can read /settings/runtime while /settings/system stays Admin-only."""
    dept = Department(name="Engineering", department_code="ENG-SET", is_active=True)
    db.add(dept)
    db.flush()
    admin = _make_employee(db, "ADM-SET", "adm_set@test.com", ROLE_ADMIN, dept.id)
    mgr = _make_employee(db, "MGR-SET", "mgr_set@test.com", ROLE_MANAGER, dept.id)
    emp = _make_employee(db, "EMP-SET", "emp_set@test.com", ROLE_EMPLOYEE, dept.id)
    db.commit()

    adm_h = _auth_header(client, admin.email)
    mgr_h = _auth_header(client, mgr.email)
    emp_h = _auth_header(client, emp.email)

    patch_res = client.patch(
        "/api/v1/settings/system",
        json={"system_name": "TaskSync Corp", "default_task_page_size": 25},
        headers=adm_h,
    )
    assert patch_res.status_code == 200, patch_res.json()

    # Manager and Employee are blocked from Admin /settings/system
    assert client.get("/api/v1/settings/system", headers=mgr_h).status_code == 403
    assert (
        client.patch(
            "/api/v1/settings/system", json={"system_name": "Hack"}, headers=mgr_h
        ).status_code
        == 403
    )
    assert client.get("/api/v1/settings/system", headers=emp_h).status_code == 403

    # Runtime settings reflect updated system_name and page size for all users
    for h in (mgr_h, emp_h):
        rt = client.get("/api/v1/settings/runtime", headers=h)
        assert rt.status_code == 200, rt.json()
        assert rt.json()["system_name"] == "TaskSync Corp"
        assert rt.json()["default_task_page_size"] == 25


def test_attendance_edit_and_payroll_calculation_and_rbac(client, db):
    """Editing attendance recomputes work_hours & OT and feeds directly into monthly payroll calculation."""
    dept_a = Department(name="Dept A", department_code="DEP-A-PAY", is_active=True)
    dept_b = Department(name="Dept B", department_code="DEP-B-PAY", is_active=True)
    db.add_all([dept_a, dept_b])
    db.flush()

    admin = _make_employee(db, "ADM-PAY", "adm_pay@test.com", ROLE_ADMIN, dept_a.id)
    mgr = _make_employee(db, "MGR-PAY", "mgr_pay@test.com", ROLE_MANAGER, dept_a.id)
    dept_a.manager_id = mgr.id
    emp = _make_employee(db, "EMP-PAY", "emp_pay@test.com", ROLE_EMPLOYEE, dept_a.id)
    other = _make_employee(db, "OTH-PAY", "oth_pay@test.com", ROLE_EMPLOYEE, dept_b.id)
    db.commit()

    emp_id = emp.id
    mgr_id = mgr.id

    adm_h = _auth_header(client, admin.email)
    mgr_h = _auth_header(client, mgr.email)
    emp_h = _auth_header(client, emp.email)
    oth_h = _auth_header(client, other.email)

    # Create active contract for emp: 22,000,000 VND base + 2,000,000 allowance
    contract_res = client.post(
        "/api/v1/hrm/contracts",
        json={
            "employee_id": emp_id,
            "contract_code": "HD-PAY-001",
            "contract_type": "Indefinite",
            "base_salary": "22000000.00",
            "allowance": "2000000.00",
            "currency": "VND",
            "start_date": "2026-11-01",
            "status": "Active",
        },
        headers=adm_h,
    )
    assert contract_res.status_code == 201, contract_res.json()

    # Employee checks in and out within seconds (0.00h)
    work_day = date(2026, 11, 10)
    ci = client.post(
        "/api/v1/hrm/attendance/check-in",
        json={
            "work_date": work_day.isoformat(),
            "check_in": "08:12:00",
            "status": "Present",
        },
        headers=emp_h,
    )
    assert ci.status_code == 201, ci.json()
    att_id = ci.json()["id"]

    co = client.post(
        "/api/v1/hrm/attendance/check-out",
        json={"work_date": work_day.isoformat(), "check_out": "08:12:30"},
        headers=emp_h,
    )
    assert co.status_code == 200
    assert Decimal(co.json()["work_hours"]) < Decimal("0.10")

    # Manager creates own attendance log and cannot edit own log
    mgr_ci = client.post(
        "/api/v1/hrm/attendance/check-in",
        json={
            "work_date": work_day.isoformat(),
            "check_in": "08:00:00",
            "status": "Present",
        },
        headers=mgr_h,
    )
    assert mgr_ci.status_code == 201
    assert (
        client.put(
            f"/api/v1/hrm/attendance/{mgr_ci.json()['id']}",
            json={"work_hours": 8},
            headers=mgr_h,
        ).status_code
        == 403
    )

    # Manager edits emp attendance to 08:00 -> 18:00 (10h work => 2h OT auto-computed)
    edit_att = client.put(
        f"/api/v1/hrm/attendance/{att_id}",
        json={
            "check_in": "08:00:00",
            "check_out": "18:00:00",
            "status": "Present",
            "note": "Adjusted shift",
        },
        headers=mgr_h,
    )
    assert edit_att.status_code == 200, edit_att.json()
    assert Decimal(edit_att.json()["work_hours"]) == Decimal("10.00")
    assert Decimal(edit_att.json()["overtime_hours"]) == Decimal("2.00")

    # Employee creates Pending OT and updates it before approval
    ot_res = client.post(
        "/api/v1/hrm/overtime",
        json={"work_date": "2026-11-11", "hours": "2.00", "reason": "Deploy patch"},
        headers=emp_h,
    )
    assert ot_res.status_code == 201
    ot_id = ot_res.json()["id"]
    ot_edit = client.put(
        f"/api/v1/hrm/overtime/{ot_id}",
        json={"hours": "2.00", "reason": "Deploy & smoke test"},
        headers=emp_h,
    )
    assert ot_edit.status_code == 200
    assert ot_edit.json()["reason"] == "Deploy & smoke test"

    # Calculate 2026-11 payroll for emp
    calc_res = client.post(
        "/api/v1/hrm/payrolls/calculate",
        json={
            "pay_period": "2026-11",
            "employee_id": emp_id,
            "standard_work_days": "22.00",
            "overtime_multiplier": "1.50",
        },
        headers=mgr_h,
    )
    assert calc_res.status_code == 200, calc_res.json()
    pay_row = calc_res.json()[0]
    payroll_id = pay_row["id"]
    # 1.00 actual work day -> 1/22 * 22M = 1,000,000 + 2,000,000 allowance + (2h * 125,000 * 1.5 = 375,000) = 3,375,000
    assert Decimal(pay_row["actual_work_days"]) == Decimal("1.00")
    assert Decimal(pay_row["overtime_hours"]) == Decimal("2.00")
    assert Decimal(pay_row["overtime_pay"]) == Decimal("375000.00")
    assert Decimal(pay_row["net_salary"]) == Decimal("3375000.00")

    # Employee can view own payslip, outsider cannot
    assert len(client.get("/api/v1/hrm/payrolls", headers=emp_h).json()) == 1
    assert (
        client.get(f"/api/v1/hrm/payrolls/{payroll_id}", headers=oth_h).status_code
        == 403
    )

    # Manager adjusts bonus/deduction and confirms, but only Admin can mark Paid
    upd_pay = client.put(
        f"/api/v1/hrm/payrolls/{payroll_id}",
        json={"bonus": "500000.00", "deduction": "100000.00", "note": "KPI bonus"},
        headers=mgr_h,
    )
    assert upd_pay.status_code == 200
    assert Decimal(upd_pay.json()["net_salary"]) == Decimal("3775000.00")

    assert (
        client.patch(
            f"/api/v1/hrm/payrolls/{payroll_id}/status",
            json={"status": "Confirmed"},
            headers=mgr_h,
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/hrm/payrolls/{payroll_id}/status",
            json={"status": "Paid"},
            headers=mgr_h,
        ).status_code
        == 403
    )
    paid_res = client.patch(
        f"/api/v1/hrm/payrolls/{payroll_id}/status",
        json={"status": "Paid"},
        headers=adm_h,
    )
    assert paid_res.status_code == 200
    assert paid_res.json()["status"] == "Paid"
    assert paid_res.json()["paid_at"] is not None

    # List leave balances returns scoped rows
    lb_list = client.get("/api/v1/hrm/leave-balances?leave_year=2026", headers=mgr_h)
    assert lb_list.status_code == 200
    assert any(
        item["employee_id"] == mgr_id or item["employee_id"] == emp_id
        for item in lb_list.json()
    )


def test_recruitment_candidate_pipeline_and_admin_onboarding(client, db):
    """Manager/Admin can manage candidates; only Admin can onboard a candidate into Employee + LeaveBalance + Contract."""
    dept = Department(name="Product", department_code="PRD-REC", is_active=True)
    db.add(dept)
    db.flush()
    admin = _make_employee(db, "ADM-REC", "adm_rec@test.com", ROLE_ADMIN, dept.id)
    mgr = _make_employee(db, "MGR-REC", "mgr_rec@test.com", ROLE_MANAGER, dept.id)
    db.commit()

    adm_h = _auth_header(client, admin.email)
    mgr_h = _auth_header(client, mgr.email)

    cand_res = client.post(
        "/api/v1/hrm/candidates",
        json={
            "full_name": "Le Thi Candidate",
            "email": "candidate.le@enterprise.com",
            "phone": "0909123456",
            "applied_position": "Backend Engineer",
            "department_id": dept.id,
            "expected_salary": "25000000",
            "stage": "Interview",
            "source": "LinkedIn",
        },
        headers=mgr_h,
    )
    assert cand_res.status_code == 201, cand_res.json()
    cand_id = cand_res.json()["id"]

    # Manager moves candidate to Offer but cannot onboard to Employee account (Admin only)
    upd_res = client.put(
        f"/api/v1/hrm/candidates/{cand_id}",
        json={"stage": "Offer", "notes": "Strong FastAPI & SQL Server"},
        headers=mgr_h,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["stage"] == "Offer"

    assert (
        client.post(
            f"/api/v1/hrm/candidates/{cand_id}/onboard",
            json={"create_contract": True, "base_salary": "25000000"},
            headers=mgr_h,
        ).status_code
        == 403
    )

    # Admin onboards candidate -> creates Employee + LeaveBalance + Contract
    onboard_res = client.post(
        f"/api/v1/hrm/candidates/{cand_id}/onboard",
        json={
            "department_id": dept.id,
            "create_contract": True,
            "contract_type": "Probation",
            "base_salary": "25000000",
            "allowance": "2000000",
        },
        headers=adm_h,
    )
    assert onboard_res.status_code == 200, onboard_res.json()
    onboarded = onboard_res.json()
    assert onboarded["stage"] == "Hired"
    new_emp_id = onboarded["converted_employee_id"]
    assert new_emp_id is not None

    # Verify newly onboarded employee can log in with Admin@Task2026! and has an active contract
    login_new = client.post(
        "/api/v1/auth/login",
        data={"username": "candidate.le@enterprise.com", "password": TEST_PWD},
    )
    assert login_new.status_code == 200
    contracts = client.get(
        f"/api/v1/hrm/contracts?employee_id={new_emp_id}", headers=adm_h
    ).json()
    assert len(contracts) == 1
    assert Decimal(contracts[0]["base_salary"]) == Decimal("25000000.00")


def test_admin_can_edit_own_attendance_and_clear_checkout(client, db):
    admin = _make_employee(
        db, "ADM-SELF-ATT", "admselfatt@test.com", role_id=ROLE_ADMIN
    )
    db.commit()

    adm_token = client.post(
        "/api/v1/auth/login",
        data={"username": admin.email, "password": TEST_PWD},
    ).json()["access_token"]
    adm_h = {"Authorization": f"Bearer {adm_token}"}

    ci_resp = client.post(
        "/api/v1/hrm/attendance/check-in", json={"status": "Present"}, headers=adm_h
    )
    assert ci_resp.status_code == 201
    att_id = ci_resp.json()["id"]

    co_resp = client.post("/api/v1/hrm/attendance/check-out", json={}, headers=adm_h)
    assert co_resp.status_code == 200
    assert co_resp.json()["check_out"] is not None

    # Admin clears accidental check_out back to None
    clear_resp = client.put(
        f"/api/v1/hrm/attendance/{att_id}",
        json={
            "check_in": "08:30:00",
            "check_out": None,
            "note": "Clear mistaken check-out",
        },
        headers=adm_h,
    )
    assert clear_resp.status_code == 200
    cleared = clear_resp.json()
    assert cleared["check_out"] is None
    assert cleared["check_in"].startswith("08:30")
    assert Decimal(cleared["work_hours"]) == Decimal("0.00")
    assert Decimal(cleared["overtime_hours"]) == Decimal("0.00")

    # Admin updates both check_in and check_out -> calculates 9.50h (8.00h + 1.50h OT)
    edit_resp = client.put(
        f"/api/v1/hrm/attendance/{att_id}",
        json={"check_in": "08:00:00", "check_out": "17:30:00"},
        headers=adm_h,
    )
    assert edit_resp.status_code == 200
    edited = edit_resp.json()
    assert edited["check_out"].startswith("17:30")
    assert Decimal(edited["work_hours"]) == Decimal("9.50")
    assert Decimal(edited["overtime_hours"]) == Decimal("1.50")
