from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

from app.core.security import get_password_hash


def get_all(db: Session, skip=0, limit=20):

    stmt = (
        select(Employee)
        .where(Employee.is_deleted == False)
        .offset(skip)
        .limit(limit)
        .order_by(Employee.id.desc())
    )

    return db.scalars(stmt).all()


def search(db: Session, keyword: str):

    stmt = select(Employee).where(Employee.full_name.contains(keyword))

    return db.scalars(stmt).all()


def get_by_id(db: Session, employee_id: int):

    return db.get(Employee, employee_id)


def create(db: Session, data: EmployeeCreate):

    obj = Employee(
        employee_code=data.employee_code,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        gender=data.gender,
        address=data.address,
        date_of_birth=data.date_of_birth,
        start_date=data.start_date,
        department_id=data.department_id,
        team_id=data.team_id,
        role_id=data.role_id,
        manager_id=data.manager_id,
        job_title=data.job_title,
        password_hash=get_password_hash(data.password),
    )

    db.add(obj)
    db.commit()
    db.refresh(obj)

    return obj


def update(db: Session, obj: Employee, data: EmployeeUpdate):

    values = data.model_dump(exclude_unset=True)

    for k, v in values.items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)

    return obj


def soft_delete(db: Session, obj: Employee):

    obj.is_deleted = True

    db.commit()
