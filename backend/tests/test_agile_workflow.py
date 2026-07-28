from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.backlog_item import BacklogItem
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.schemas.sprint import SprintCreate
from app.services import sprint_service
from app.services.task_service import validate_task_relationships
from app.crud import project as crud_project
from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER


def _project(code: str, name: str) -> Project:
    return Project(
        project_code=code,
        name=name,
        status="Planning",
        priority="Medium",
        progress_percent=0,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )


def _sprint(project_id: int, name: str, status: str = "Planned") -> Sprint:
    return Sprint(
        project_id=project_id,
        name=name,
        status=status,
        capacity=20,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )


def _backlog_item(project_id: int, title: str) -> BacklogItem:
    return BacklogItem(
        project_id=project_id,
        title=title,
        status="Backlog",
        priority="Medium",
        story_points=3,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )


def test_sprint_creation_rejects_reversed_dates(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.commit()

    with pytest.raises(ValidationError):
        SprintCreate(
            project_id=project.id,
            name="Sprint 1",
            start_date=datetime(2026, 2, 10),
            end_date=datetime(2026, 2, 1),
        )


def test_cross_project_backlog_assignment_is_rejected(db):
    first_project = _project("PRJ-1", "Project 1")
    second_project = _project("PRJ-2", "Project 2")
    db.add_all([first_project, second_project])
    db.flush()
    sprint = _sprint(first_project.id, "Sprint 1")
    item = _backlog_item(second_project.id, "Foreign item")
    db.add_all([sprint, item])
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        sprint_service.add_backlog_item(db, sprint, item)

    assert exc_info.value.status_code == 409


def test_duplicate_sprint_assignment_is_rejected(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.flush()
    first_sprint = _sprint(project.id, "Sprint 1")
    second_sprint = _sprint(project.id, "Sprint 2")
    item = _backlog_item(project.id, "Item")
    db.add_all([first_sprint, second_sprint, item])
    db.commit()

    sprint_service.add_backlog_item(db, first_sprint, item)

    with pytest.raises(HTTPException) as exc_info:
        sprint_service.add_backlog_item(db, second_sprint, item)

    assert exc_info.value.status_code == 409


def test_empty_sprint_cannot_start(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.flush()
    sprint = _sprint(project.id, "Sprint 1")
    db.add(sprint)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        sprint_service.start_sprint(db, sprint)

    assert exc_info.value.status_code == 409


def test_only_one_sprint_can_be_active_per_project(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.flush()
    first_sprint = _sprint(project.id, "Sprint 1")
    second_sprint = _sprint(project.id, "Sprint 2")
    first_item = _backlog_item(project.id, "Item 1")
    second_item = _backlog_item(project.id, "Item 2")
    db.add_all([first_sprint, second_sprint, first_item, second_item])
    db.commit()
    sprint_service.add_backlog_item(db, first_sprint, first_item)
    sprint_service.add_backlog_item(db, second_sprint, second_item)
    sprint_service.start_sprint(db, first_sprint)

    with pytest.raises(HTTPException) as exc_info:
        sprint_service.start_sprint(db, second_sprint)

    assert exc_info.value.status_code == 409


def test_completing_sprint_returns_unfinished_item_to_product_backlog(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.flush()
    sprint = _sprint(project.id, "Sprint 1", status="Active")
    db.add(sprint)
    db.flush()
    task = Task(
        project_id=project.id,
        sprint_id=sprint.id,
        title="Unfinished task",
        status="In Progress",
        priority="Medium",
        story_points=3,
        progress_percent=50,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    db.add(task)
    db.flush()
    item = _backlog_item(project.id, "Unfinished item")
    item.sprint_id = sprint.id
    item.task_id = task.id
    item.status = "In Sprint"
    db.add(item)
    db.commit()

    completed = sprint_service.complete_sprint(db, sprint)

    assert completed.status == "Completed"
    assert item.sprint_id is None
    assert item.task_id is None
    assert item.status == "Backlog"
    assert task.sprint_id == sprint.id


def test_task_cannot_reference_sprint_from_another_project(db):
    first_project = _project("PRJ-1", "Project 1")
    second_project = _project("PRJ-2", "Project 2")
    db.add_all([first_project, second_project])
    db.flush()
    sprint = _sprint(second_project.id, "Foreign Sprint")
    db.add(sprint)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        validate_task_relationships(
            db,
            project_id=first_project.id,
            sprint_id=sprint.id,
            assigned_to=None,
            topic_id=None,
        )

    assert exc_info.value.status_code == 409


def test_task_assignee_must_be_an_active_project_member(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.flush()
    employee = Employee(
        employee_code="EMP-1",
        full_name="Employee 1",
        email="employee@example.com",
        password_hash="test",
        role_id=3,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    db.add(employee)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        validate_task_relationships(
            db,
            project_id=project.id,
            sprint_id=None,
            assigned_to=employee.id,
            topic_id=None,
        )

    assert exc_info.value.status_code == 409

    db.add(ProjectMember(project_id=project.id, employee_id=employee.id))
    db.commit()

    validate_task_relationships(
        db,
        project_id=project.id,
        sprint_id=None,
        assigned_to=employee.id,
        topic_id=None,
    )


def test_project_list_is_scoped_for_manager_and_employee(db):
    manager = Employee(
        employee_code="MANAGER",
        full_name="Manager",
        email="manager@example.com",
        password_hash="test",
        role_id=ROLE_MANAGER,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    employee = Employee(
        employee_code="EMPLOYEE",
        full_name="Employee",
        email="employee@example.com",
        password_hash="test",
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    admin = Employee(
        employee_code="ADMIN",
        full_name="Admin",
        email="admin@example.com",
        password_hash="test",
        role_id=ROLE_ADMIN,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    db.add_all([manager, employee, admin])
    db.flush()
    managed_project = _project("PRJ-1", "Managed Project")
    managed_project.created_by = manager.id
    unrelated_project = _project("PRJ-2", "Unrelated Project")
    unrelated_project.created_by = admin.id
    db.add_all([managed_project, unrelated_project])
    db.flush()
    db.add(
        ProjectMember(
            project_id=managed_project.id,
            employee_id=employee.id,
        )
    )
    db.commit()

    assert [project.id for project in crud_project.get_all(db, manager)] == [
        managed_project.id
    ]
    assert [project.id for project in crud_project.get_all(db, employee)] == [
        managed_project.id
    ]
    assert {project.id for project in crud_project.get_all(db, admin)} == {
        managed_project.id,
        unrelated_project.id,
    }


def test_sprint_detail_progress_uses_real_task_status_and_story_points(db):
    project = _project("PRJ-1", "Project 1")
    db.add(project)
    db.flush()
    sprint = _sprint(project.id, "Sprint 1", status="Active")
    db.add(sprint)
    db.flush()
    db.add_all(
        [
            Task(
                project_id=project.id,
                sprint_id=sprint.id,
                title="Done",
                status="Done",
                priority="Medium",
                story_points=3,
                progress_percent=100,
                is_deleted=False,
                created_at=datetime(2026, 1, 1),
            ),
            Task(
                project_id=project.id,
                sprint_id=sprint.id,
                title="Open",
                status="In Progress",
                priority="Medium",
                story_points=5,
                progress_percent=40,
                is_deleted=False,
                created_at=datetime(2026, 1, 1),
            ),
        ]
    )
    db.commit()

    detail = sprint_service.serialize_sprint_detail(db, sprint)

    assert detail["total_tasks"] == 2
    assert detail["completed_tasks"] == 1
    assert detail["remaining_tasks"] == 1
    assert detail["progress_percent"] == 50
    assert detail["total_story_points"] == 8
    assert detail["completed_story_points"] == 3
    assert detail["remaining_story_points"] == 5
