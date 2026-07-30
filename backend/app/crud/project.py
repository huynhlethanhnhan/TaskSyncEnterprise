from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.models.employee import Employee
from app.services.project_access import project_scope_predicate


def get_all(
    db: Session,
    current_user: Employee,
    skip=0,
    limit=20,
) -> list[Project]:

    stmt = select(Project).where(Project.is_deleted == False)  # noqa: E712
    scope = project_scope_predicate(current_user)
    if scope is not None:
        stmt = stmt.where(scope)
    stmt = stmt.order_by(Project.id.desc()).offset(skip).limit(limit)

    return list(db.scalars(stmt).all())


def get_by_id(db: Session, project_id: int):

    return db.scalar(
        select(Project).where(
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
