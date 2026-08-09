from datetime import datetime

from sqlalchemy import func, select

from Seed_Example import (
    _clear_application_cache,
    _reset_demo_data,
    _validate_destructive_reset,
)
from app.models.department import Department
from app.models.employee import Employee
from app.models.role import Role
from app.models.team import Team


def test_seed_reset_clears_every_organization_reference_before_table_deletes():
    class RecordingSession:
        def __init__(self):
            self.statements: list[str] = []

        def execute(self, statement):
            self.statements.append(str(statement))

        def flush(self):
            self.statements.append("FLUSH")

        def commit(self):
            self.statements.append("COMMIT")

    session = RecordingSession()

    _reset_demo_data(session)

    employee_delete_index = next(
        index
        for index, statement in enumerate(session.statements)
        if statement.startswith("DELETE FROM") and "employees" in statement
    )
    statements_before_employee_delete = session.statements[:employee_delete_index]
    assert any(
        statement.startswith("UPDATE") and "departments" in statement
        for statement in statements_before_employee_delete
    )
    assert any(
        statement.startswith("UPDATE") and "teams" in statement
        for statement in statements_before_employee_delete
    )
    assert any(
        statement.startswith("UPDATE") and "employees" in statement
        for statement in statements_before_employee_delete
    )


def test_seed_reset_breaks_organization_cycles_before_deleting(db):
    role = db.get(Role, 3)
    if not role:
        role = Role(
            id=3,
            role_name="employee",
            description="Employee",
            is_system=True,
        )
        db.add(role)
        db.flush()
    department = Department(
        department_code="OPS",
        name="Vận hành",
        is_active=True,
        created_at=datetime(2026, 1, 1),
    )
    db.add_all([role, department])
    db.flush()
    team = Team(
        department_id=department.id,
        team_code="OPS-T1",
        name="Vận hành — Nhóm 1",
        is_active=True,
        created_at=datetime(2026, 1, 1),
    )
    db.add(team)
    db.flush()
    employee = Employee(
        employee_code="EMP001",
        full_name="Phan Hoàng Long",
        email="hoang.long@example.com",
        password_hash="test",
        role_id=role.id,
        department_id=department.id,
        team_id=team.id,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    db.add(employee)
    db.flush()
    department.manager_id = employee.id
    team.leader_id = employee.id
    db.commit()

    _reset_demo_data(db)

    assert db.scalar(select(func.count(Employee.id))) == 0
    assert db.scalar(select(func.count(Department.id))) == 0
    assert db.scalar(select(func.count(Team.id))) == 0

    from app.seeds.seed_roles import seed_roles

    seed_roles(db)


def test_seed_cache_clear_removes_stale_entity_ids(monkeypatch):
    cleared_patterns = []

    class FakeCache:
        def clear_pattern(self, pattern):
            cleared_patterns.append(pattern)
            return True

    monkeypatch.setattr("app.cache.cache_service", FakeCache())

    _clear_application_cache()

    assert cleared_patterns == ["*"]


def test_seed_reset_requires_explicit_non_production_local_target():
    approved_url = "mssql+pymssql://localhost/TaskSyncEnterprise"

    for environment, allow_reset, database_url in (
        ("production", "true", approved_url),
        ("development", "false", approved_url),
        (
            "development",
            "true",
            "mssql+pymssql://database.example.com/TaskSyncEnterprise",
        ),
        ("development", "true", "mssql+pymssql://localhost/CustomerData"),
    ):
        try:
            _validate_destructive_reset(
                environment=environment,
                database_url=database_url,
                allow_reset=allow_reset,
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("unsafe seed reset target was accepted")

    _validate_destructive_reset(
        environment="development",
        database_url=approved_url,
        allow_reset="true",
    )
