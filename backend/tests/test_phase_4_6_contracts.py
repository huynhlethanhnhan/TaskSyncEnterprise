from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.schemas.vacation import VacationCreate, VacationUpdate
from app.routers.v1.employees import router as employee_router
from app.services import vacation_service


class FakeSession:
    def __init__(self, vacation):
        self.vacation = vacation
        self.commits = 0

    def get(self, _model, _identifier):
        return self.vacation

    def commit(self):
        self.commits += 1

    def refresh(self, _model):
        return None


@pytest.fixture(autouse=True)
def disable_leave_notification(monkeypatch):
    monkeypatch.setattr(
        "app.crud.notification.create_notification",
        lambda *_args, **_kwargs: None,
    )


def vacation(status="Pending", requested_by=10):
    return SimpleNamespace(
        id=1,
        status=status,
        requested_by=requested_by,
        approved_by=None,
        approved_at=None,
        updated_at=None,
        type="Annual",
        start_date="2026-08-01",
        end_date="2026-08-02",
    )


def user(user_id, role_id):
    return SimpleNamespace(id=user_id, role_id=role_id)


def test_new_leave_cannot_skip_pending_state():
    with pytest.raises(ValidationError):
        VacationCreate(
            type="Annual",
            start_date="2026-08-01",
            end_date="2026-08-02",
            status="HR Approved",
        )


def test_update_schema_rejects_unknown_status():
    with pytest.raises(ValidationError):
        VacationUpdate(status="Arbitrary State")


def test_employee_can_withdraw_own_pending_request():
    item = vacation()
    session = FakeSession(item)
    result = vacation_service.update_vacation_status(
        session, item.id, "Withdrawn", user(10, ROLE_EMPLOYEE)
    )
    assert result.status == "Withdrawn"
    assert session.commits == 1


def test_manager_cannot_apply_final_hr_approval():
    item = vacation()
    with pytest.raises(HTTPException) as exc:
        vacation_service.update_vacation_status(
            FakeSession(item), item.id, "HR Approved", user(20, ROLE_MANAGER)
        )
    assert exc.value.status_code == 409


def test_admin_can_finalize_manager_approved_request():
    item = vacation(status="Manager Approved")
    result = vacation_service.update_vacation_status(
        FakeSession(item), item.id, "HR Approved", user(30, ROLE_ADMIN)
    )
    assert result.status == "HR Approved"
    assert result.approved_by == 30


def test_employee_static_routes_are_not_shadowed_by_id_route():
    paths = {route.path for route in employee_router.routes}
    assert "/employees/{employee_id:int}" in paths
    assert "/employees/me" in paths
    assert "/employees/avatar" in paths
