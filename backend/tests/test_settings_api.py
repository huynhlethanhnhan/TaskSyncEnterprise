import pytest
import uuid
from app.models.employee import Employee
from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE
from app.core.security import create_access_token


def create_test_employee(db, email, role_id):
    emp = Employee(
        employee_code=f"EMP_{uuid.uuid4().hex[:6]}",
        email=email,
        full_name="Test Setting User",
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


def test_01_user_get_and_patch_preferences(client, db):
    emp = create_test_employee(db, "pref_user@test.com", ROLE_EMPLOYEE)
    headers = get_auth_header(emp)

    # GET preferences
    res_get = client.get("/api/v1/settings/me", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["theme"] == "system"

    # PATCH preferences
    res_patch = client.patch(
        "/api/v1/settings/me",
        json={"theme": "dark", "language": "en", "compact_mode": True},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["theme"] == "dark"
    assert res_patch.json()["language"] == "en"
    assert res_patch.json()["compact_mode"] is True

    # GET again to verify DB persistence
    res_get2 = client.get("/api/v1/settings/me", headers=headers)
    assert res_get2.status_code == 200
    assert res_get2.json()["theme"] == "dark"


def test_02_admin_system_settings_rbac(client, db):
    admin = create_test_employee(db, "admin_sett@test.com", ROLE_ADMIN)
    emp = create_test_employee(db, "emp_sett@test.com", ROLE_EMPLOYEE)

    # Employee GET system settings -> 403 Forbidden
    res_emp_get = client.get("/api/v1/settings/system", headers=get_auth_header(emp))
    assert res_emp_get.status_code == 403

    # Admin GET system settings -> 200 OK
    res_admin_get = client.get("/api/v1/settings/system", headers=get_auth_header(admin))
    assert res_admin_get.status_code == 200
    assert "system_name" in res_admin_get.json()

    # Admin PATCH system settings -> 200 OK
    res_admin_patch = client.patch(
        "/api/v1/settings/system",
        json={"system_name": "New TaskSync Enterprise", "default_sprint_capacity": 45},
        headers=get_auth_header(admin),
    )
    assert res_admin_patch.status_code == 200
    assert res_admin_patch.json()["system_name"] == "New TaskSync Enterprise"
    assert res_admin_patch.json()["default_sprint_capacity"] == 45
