import pytest
from app.models.employee import Employee
from app.core.security import verify_password, get_password_hash
from app.core.constants import ROLE_ADMIN


@pytest.fixture
def seeded_admin_user(db):
    """Ensure administrator account admin@gmail.com exists in the test database harness."""
    user = db.query(Employee).filter(Employee.email == "admin@gmail.com").first()
    if not user:
        user = Employee(
            employee_code="EMP_ADMIN",
            full_name="System Administrator",
            email="admin@gmail.com",
            password_hash=get_password_hash("123456"),
            role_id=ROLE_ADMIN,
            is_active=True,
            is_deleted=False,
            is_first_login=False,
            login_count=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_admin_credentials_in_db(db, seeded_admin_user):
    """Verify admin@gmail.com exists in DB and password matches 123456."""
    user = db.query(Employee).filter(Employee.email == "admin@gmail.com").first()
    assert user is not None, "Administrator account admin@gmail.com should exist in DB"
    assert verify_password(
        "123456", user.password_hash
    ), "Password hash should match 123456"


def test_login_endpoint_success(client, db, seeded_admin_user):
    """Verify POST /api/v1/auth/login with form-data returns tokens and user profile."""
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@gmail.com", "password": "123456"},
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@gmail.com"


def test_login_endpoint_invalid_credentials(client, db, seeded_admin_user):
    """Verify invalid password returns 401 Unauthorized."""
    res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@gmail.com", "password": "wrong_password_999"},
    )
    assert res.status_code == 401
    data = res.json()
    assert "access_token" not in data


def test_protected_endpoints_with_bearer_token(client, db, seeded_admin_user):
    """Verify protected endpoints succeed with Bearer token header."""
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@gmail.com", "password": "123456"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_tasks = client.get("/api/v1/tasks", headers=headers)
    assert res_tasks.status_code == 200

    res_employees = client.get("/api/v1/employees", headers=headers)
    assert res_employees.status_code == 200


def test_protected_endpoints_without_token(client):
    """Verify protected endpoints return 401 without Authorization header."""
    res = client.get("/api/v1/tasks")
    assert res.status_code == 401


def test_refresh_token_rotation_and_revocation(client, db, seeded_admin_user):
    """Verify refresh endpoint rotates refresh tokens and revokes previous token."""
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@gmail.com", "password": "123456"},
    )
    refresh_token = login_res.json()["refresh_token"]

    # First refresh call should succeed
    ref_res = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data

    # Reusing the old refresh token must be rejected with 401
    reuse_res = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert reuse_res.status_code == 401
