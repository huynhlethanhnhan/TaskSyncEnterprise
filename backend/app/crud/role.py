from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.role import Role
from app.schemas.role import RoleCreate, RoleUpdate


def get_all(db: Session):

    stmt = (
        select(Role)
        .order_by(Role.id.desc())
    )

    return db.scalars(stmt).all()


def get_by_id(db: Session, role_id: int):

    return db.get(Role, role_id)


def create(db: Session, data: RoleCreate):

    obj = Role(**data.model_dump())

    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


def update(
        db: Session,
        obj: Role,
        data: RoleUpdate):

    values = data.model_dump(exclude_unset=True)

    for k, v in values.items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)

    return obj


def delete(db: Session, obj: Role):

    db.delete(obj)
    db.commit()