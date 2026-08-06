import pytest
from app.seeds.seed_runner import safe_reset_database, run_seed_pipeline
from app.models.employee import Employee
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.team import Team
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE


def test_seed_dataset_integrity_and_business_rules(db):
    # 1. Reset and run seed
    safe_reset_database(db, confirm=True)
    summary = run_seed_pipeline(db)

    # 2. Check counts match expectations
    assert summary["Employees"] == 32
    assert summary["Teams"] == 5
    assert summary["Projects"] == 8
    assert summary["Sprints"] >= 14
    assert summary["Tasks"] >= 99

    # 3. Check specific test employee001 exists
    emp001 = db.query(Employee).filter_by(employee_code="employee001").first()
    assert emp001 is not None
    assert emp001.email == "employee001@enterprise.com"

    # 4. Check employee001 tasks (EMP001-TASK-001 to 005)
    emp001_tasks = db.query(Task).filter(Task.title.like("Nhiệm vụ 0%")).all()
    assert len(emp001_tasks) == 5

    # 5. Check business rule: max 1 Active Sprint per Project
    projects = db.query(Project).all()
    for prj in projects:
        active_sprints = (
            db.query(Sprint)
            .filter_by(project_id=prj.id, status="Active", is_deleted=False)
            .all()
        )
        assert (
            len(active_sprints) <= 1
        ), f"Project {prj.name} has {len(active_sprints)} active sprints!"

    # 6. Check PRJ-SPRINT-TEST project structure
    prj_test = db.query(Project).filter_by(project_code="PRJ-SPRINT-TEST").first()
    assert prj_test is not None
    prj_test_sprints = db.query(Sprint).filter_by(project_id=prj_test.id).all()
    sprint_names = [s.name for s in prj_test_sprints]
    assert "Sprint A (Past Completed)" in sprint_names
    assert "Sprint B (Planned Eligible)" in sprint_names
    assert "Sprint C (Planned Conflict Test)" in sprint_names

    # 7. Every organization and assignment relation follows the shared rules.
    teams = {team.id: team for team in db.query(Team).all()}
    for employee in db.query(Employee).filter(Employee.team_id.is_not(None)).all():
        assert teams[employee.team_id].department_id == employee.department_id
    for project in projects:
        assert project.department_id is not None
        if project.team_id is not None:
            assert teams[project.team_id].department_id == project.department_id

    assignments = db.query(TaskAssignment).all()
    for assignment in assignments:
        task = db.get(Task, assignment.task_id)
        project = db.get(Project, task.project_id)
        employee = db.get(Employee, assignment.employee_id)
        assert employee.is_active and not employee.is_deleted
        assert (
            employee.team_id == project.team_id
            if project.team_id is not None
            else employee.department_id == project.department_id
        )
