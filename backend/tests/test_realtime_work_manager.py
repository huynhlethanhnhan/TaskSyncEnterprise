from app.cache.cache_invalidator import CacheInvalidator
from app.core.constants import ROLE_EMPLOYEE
from app.core.security import get_password_hash
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.team import Team
import pytest


def test_task_invalidation_broadcasts_cross_browser_refresh_without_redis(monkeypatch):
    events = []

    monkeypatch.setattr(CacheInvalidator, "_check_redis_ready", lambda: False)
    monkeypatch.setattr(
        "app.services.notification.websocket_manager.websocket_manager.broadcast_threadsafe",
        lambda payload: events.append(payload) or True,
        raising=False,
    )

    CacheInvalidator.invalidate_task(
        task_id=42,
        project_id=7,
        employee_id=59,
        sprint_id=3,
    )

    assert events == [
        {
            "event": "task.changed",
            "entity_id": 42,
            "project_id": 7,
            "employee_id": 59,
            "sprint_id": 3,
        }
    ]


@pytest.mark.parametrize(
    ("method_name", "event_name"),
    [
        ("invalidate_topic", "topic.changed"),
        ("invalidate_feedback", "feedback.changed"),
        ("invalidate_file", "file.changed"),
        ("invalidate_vacation", "vacation.changed"),
    ],
)
def test_collaboration_invalidation_broadcasts_without_redis(
    monkeypatch, method_name, event_name
):
    events = []
    monkeypatch.setattr(CacheInvalidator, "_check_redis_ready", lambda: False)
    monkeypatch.setattr(
        "app.services.notification.websocket_manager.websocket_manager.broadcast_threadsafe",
        lambda payload: events.append(payload) or True,
        raising=False,
    )

    getattr(CacheInvalidator, method_name)(42)

    assert events == [{"event": event_name, "entity_id": 42}]


def test_employee_avatar_change_clears_embedded_task_detail_avatars(monkeypatch):
    cleared_patterns = []

    class FakeCache:
        def clear_pattern(self, pattern):
            cleared_patterns.append(pattern)
            return True

        def delete(self, _key):
            return True

    monkeypatch.setattr(CacheInvalidator, "_check_redis_ready", lambda: True)
    monkeypatch.setattr(CacheInvalidator, "_get_service", lambda: FakeCache())
    monkeypatch.setattr(CacheInvalidator, "_publish", lambda *args, **kwargs: None)
    monkeypatch.setattr(CacheInvalidator, "invalidate_project", lambda *args, **kwargs: None)
    monkeypatch.setattr(CacheInvalidator, "invalidate_employee", lambda *args, **kwargs: None)
    monkeypatch.setattr(CacheInvalidator, "invalidate_dashboard", lambda: None)

    CacheInvalidator.invalidate_task(employee_id=59)

    assert "task:*" in cleared_patterns


def _login(client, email):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "TaskSync@2026"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_employee(db, code, email):
    employee = Employee(
        employee_code=code,
        full_name=code,
        email=email,
        password_hash=get_password_hash("TaskSync@2026"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    db.add(employee)
    db.flush()
    return employee


def test_team_leader_can_manage_task_and_assigned_employee_can_update_status(client, db):
    department = Department(
        department_code="OPS",
        name="Operations",
        is_active=True,
    )
    db.add(department)
    db.flush()
    team = Team(
        department_id=department.id,
        team_code="OPS-T1",
        name="Operations Team",
        is_active=True,
    )
    db.add(team)
    db.flush()

    leader = _create_employee(db, "LEAD001", "leader@example.com")
    worker = _create_employee(db, "EMP001", "worker@example.com")
    unassigned_worker = _create_employee(db, "EMP002", "unassigned@example.com")
    leader.department_id = department.id
    leader.team_id = team.id
    worker.department_id = department.id
    worker.team_id = team.id
    unassigned_worker.department_id = department.id
    unassigned_worker.team_id = team.id
    team.leader_id = leader.id

    project = Project(
        project_code="PRJ-RT",
        name="Realtime Project",
        status="Active",
        priority="Medium",
        progress_percent=0,
        created_by=leader.id,
        is_deleted=False,
    )
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, employee_id=worker.id))
    db.add(ProjectMember(project_id=project.id, employee_id=unassigned_worker.id))

    task = Task(
        project_id=project.id,
        title="Original",
        status="To Do",
        priority="Medium",
        story_points=3,
        progress_percent=0,
        is_deleted=False,
    )
    db.add(task)
    db.flush()
    db.add(TaskAssignment(task_id=task.id, employee_id=worker.id))
    db.commit()

    leader_response = client.put(
        f"/api/v1/tasks/{task.id}",
        json={"title": "Leader updated"},
        headers=_login(client, leader.email),
    )
    assert leader_response.status_code == 200
    assert leader_response.json()["title"] == "Leader updated"

    worker_response = client.patch(
        f"/api/v1/tasks/{task.id}",
        json={"status": "In Progress"},
        headers=_login(client, worker.email),
    )
    assert worker_response.status_code == 200
    assert worker_response.json()["status"] == "In Progress"

    db.refresh(task)
    assert task.title == "Leader updated"
    assert task.status == "In Progress"

    protected_field_response = client.patch(
        f"/api/v1/tasks/{task.id}",
        json={"title": "Worker unauthorized change"},
        headers=_login(client, worker.email),
    )
    assert protected_field_response.status_code == 403

    unassigned_response = client.patch(
        f"/api/v1/tasks/{task.id}",
        json={"status": "Done"},
        headers=_login(client, unassigned_worker.email),
    )
    assert unassigned_response.status_code == 403
