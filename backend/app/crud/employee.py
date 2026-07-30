from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

from app.core.security import get_password_hash


def get_all(db: Session, skip=0, limit=20):

    stmt = (
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.team))
        .where(Employee.is_deleted == False)  # noqa: E712
        .order_by(Employee.id.desc())
        .offset(skip)
        .limit(limit)
    )

    return db.scalars(stmt).all()


def search(db: Session, keyword: str):

    stmt = (
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.team))
        .where(
            Employee.full_name.contains(keyword),
            Employee.is_deleted == False,  # noqa: E712
        )
    )

    return db.scalars(stmt).all()


def get_by_id(db: Session, employee_id: int):

    return db.scalar(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.team))
        .where(
            Employee.id == employee_id,
            Employee.is_deleted == False,  # noqa: E712
        )
    )


def create(db: Session, data: EmployeeCreate):
    _validate_organization_assignment(
        db,
        department_id=data.department_id,
        team_id=data.team_id,
    )

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
    target_department_id = values.get("department_id", obj.department_id)

    if "department_id" in values and "team_id" not in values:
        if obj.team_id is not None and target_department_id != obj.department_id:
            values["team_id"] = None

    target_team_id = values.get("team_id", obj.team_id)
    _validate_organization_assignment(
        db,
        department_id=target_department_id,
        team_id=target_team_id,
    )

    for k, v in values.items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)

    return obj


def soft_delete(db: Session, obj: Employee):

    obj.is_deleted = True

    db.commit()


def _validate_organization_assignment(
    db: Session,
    *,
    department_id: int | None,
    team_id: int | None,
) -> None:
    if department_id is not None:
        department = db.scalar(
            select(Department).where(
                Department.id == department_id,
                Department.is_active == True,  # noqa: E712
            )
        )
        if department is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department does not exist or is inactive.",
            )

    if team_id is None:
        return

    if department_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An Employee assigned to a Team must also have a Department.",
        )

    team = db.scalar(
        select(Team).where(
            Team.id == team_id,
            Team.is_active == True,  # noqa: E712
        )
    )
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team does not exist or is inactive.",
        )
    if team.department_id != department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team must belong to the Employee's Department.",
        )
