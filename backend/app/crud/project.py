from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


def get_all(db: Session, skip=0, limit=20):

    stmt = (
        select(Project)
        .where(Project.is_deleted == False)
        .offset(skip)
        .limit(limit)
        .order_by(Project.id.desc())
    )

    return db.scalars(stmt).all()


def get_by_id(db: Session, project_id: int):

    return db.get(Project, project_id)


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
