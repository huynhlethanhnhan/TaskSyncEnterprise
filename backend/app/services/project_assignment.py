from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BusinessRuleException
from app.models.employee import Employee
from app.models.project_member import ProjectMember
from app.models.team import Team
from app.services.project_access import get_active_project


def get_eligible_project_assignees(
    db: Session,
    project_id: int,
    *,
    include_explicit_members: bool = True,
) -> list[Employee]:
    """Return the authoritative active assignee set for a Project."""
    project = get_active_project(db, project_id)

    if project.team_id is None and project.department_id is None:
        return []

    predicates = []
    if project.team_id is not None:
        team = db.get(Team, project.team_id)
        if team is None or not team.is_active:
            raise BusinessRuleException(
                message="Project references a missing or inactive Team.",
                error_code="PROJECT_TEAM_INVALID",
                status_code=409,
            )
        if (
            project.department_id is not None
            and team.department_id != project.department_id
        ):
            raise BusinessRuleException(
                message="Team does not belong to the Project Department.",
                error_code="TEAM_DEPARTMENT_MISMATCH",
                status_code=409,
            )
        predicates.append(Employee.team_id == project.team_id)
    else:
        predicates.append(Employee.department_id == project.department_id)

    if include_explicit_members:
        explicit_employee_ids = select(ProjectMember.employee_id).where(
            ProjectMember.project_id == project.id
        )
        predicates.append(Employee.id.in_(explicit_employee_ids))

    statement = (
        select(Employee)
        .options(selectinload(Employee.vacations))
        .where(
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
            or_(*predicates),
        )
        .order_by(Employee.full_name, Employee.id)
    )
    return list(db.scalars(statement).unique().all())


def validate_project_assignee(
    db: Session,
    project_id: int,
    employee_id: int,
) -> Employee:
    for employee in get_eligible_project_assignees(db, project_id):
        if employee.id == employee_id:
            return employee

    raise BusinessRuleException(
        message="Nhân viên được chọn chưa phải thành viên hợp lệ của dự án.",
        error_code="ASSIGNEE_NOT_PROJECT_MEMBER",
        status_code=409,
    )
