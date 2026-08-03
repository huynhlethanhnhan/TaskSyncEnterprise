from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.models.employee import Employee
from app.models.project_member import ProjectMember
from app.services.project_access import project_scope_predicate


def get_all(
    db: Session,
    current_user: Employee,
    skip=0,
    limit=20,
    department_id: int | None = None,
    team_id: int | None = None,
    status: str | None = None,
) -> list[Project]:

    stmt = (
        select(Project)
        .options(joinedload(Project.department), joinedload(Project.team))
        .where(Project.is_deleted == False)  # noqa: E712
    )
    scope = project_scope_predicate(current_user)
    if scope is not None:
        stmt = stmt.where(scope)
    if department_id is not None:
        member_department_projects = (
            select(ProjectMember.project_id)
            .join(Employee, Employee.id == ProjectMember.employee_id)
            .where(Employee.department_id == department_id)
        )
        stmt = stmt.where(
            or_(
                Project.department_id == department_id,
                Project.id.in_(member_department_projects),
            )
        )
    if team_id is not None:
        member_team_projects = (
            select(ProjectMember.project_id)
            .join(Employee, Employee.id == ProjectMember.employee_id)
            .where(Employee.team_id == team_id)
        )
        stmt = stmt.where(
            or_(
                Project.team_id == team_id,
                Project.id.in_(member_team_projects),
            )
        )
    if status:
        stmt = stmt.where(Project.status == status)
    stmt = stmt.order_by(Project.id.desc()).offset(skip).limit(limit)

    return list(db.scalars(stmt).unique().all())


def get_by_id(db: Session, project_id: int):

    return db.scalar(
        select(Project)
        .options(joinedload(Project.department), joinedload(Project.team))
        .where(
            Project.id == project_id,
            Project.is_deleted == False,  # noqa: E712
        )
    )


def create(db: Session, data: ProjectCreate):

    obj = Project(**data.model_dump())

    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


def update(db: Session, obj: Project, data: ProjectUpdate):

    values = data.model_dump(exclude_unset=True)

    for k, v in values.items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)

    return obj


def delete(db: Session, obj: Project):

    obj.is_deleted = True

    db.commit()
