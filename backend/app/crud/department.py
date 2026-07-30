from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.core.constants import ROLE_ADMIN


def _get_employee_count(db: Session, department_id: int) -> int:
    return (
        db.scalar(
            select(func.count(Employee.id)).where(
                Employee.department_id == department_id,
                Employee.is_active == True,  # noqa: E712
                Employee.is_deleted == False,  # noqa: E712
            )
        )
        or 0
    )


def _get_team_count(db: Session, department_id: int) -> int:
    return (
        db.scalar(
            select(func.count(Team.id)).where(
                Team.department_id == department_id,
                Team.is_active == True,  # noqa: E712
            )
        )
        or 0
    )


def _get_work_metrics(
    db: Session,
    department_ids: list[int],
) -> dict[int, tuple[int, int, int]]:
    del db
    return {department_id: (0, 0, 0) for department_id in department_ids}


def _serialize_department(
    db: Session,
    department: Department,
    *,
    employee_count: int | None = None,
    team_count: int | None = None,
    work_metrics: tuple[int, int, int] | None = None,
) -> dict:
    manager = getattr(department, "manager", None)
    if employee_count is None:
        employee_count = _get_employee_count(db, department.id)
    if team_count is None:
        team_count = _get_team_count(db, department.id)
    if work_metrics is None:
        work_metrics = _get_work_metrics(db, [department.id]).get(
            department.id,
            (0, 0, 0),
        )
    project_count, completed_project_count, sprint_count = work_metrics

    return {
        "id": department.id,
        "department_code": department.department_code,
        "name": department.name,
        "description": department.description,
        "manager_id": department.manager_id,
        "manager_name": (
            getattr(manager, "full_name", None) if manager is not None else None
        ),
        "manager_avatar_url": (
            getattr(manager, "avatar_url", None) if manager is not None else None
        ),
        "employee_count": employee_count,
        "team_count": team_count,
        "project_count": project_count,
        "completed_project_count": completed_project_count,
        "sprint_count": sprint_count,
        "is_active": bool(department.is_active),
        "created_at": department.created_at,
    }


def get_all(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    current_user: Employee | None = None,
):
    stmt = (
        select(Department)
        .options(selectinload(Department.manager))
        .where(Department.is_active == True)  # noqa: E712
    )

    if current_user is not None and current_user.role_id != ROLE_ADMIN:
        if current_user.department_id is None:
            return []
        stmt = stmt.where(Department.id == current_user.department_id)

    if search:
        stmt = stmt.where(
            or_(
                Department.name.icontains(search),
                Department.department_code.icontains(search),
            )
        )

    stmt = stmt.order_by(Department.id.desc()).offset(skip).limit(limit)

    departments = db.scalars(stmt).all()

    if not departments:
        return []

    department_ids = [department.id for department in departments]
    employee_counts = dict(
        db.execute(
            select(Employee.department_id, func.count(Employee.id))
            .where(
                Employee.department_id.in_(department_ids),
                Employee.is_active == True,  # noqa: E712
                Employee.is_deleted == False,  # noqa: E712
            )
            .group_by(Employee.department_id)
        ).all()
    )
    team_counts = dict(
        db.execute(
            select(Team.department_id, func.count(Team.id))
            .where(
                Team.department_id.in_(department_ids),
                Team.is_active == True,  # noqa: E712
            )
            .group_by(Team.department_id)
        ).all()
    )
    work_metrics = _get_work_metrics(db, department_ids)

    return [
        _serialize_department(
            db,
            department,
            employee_count=employee_counts.get(department.id, 0),
            team_count=team_counts.get(department.id, 0),
            work_metrics=work_metrics.get(department.id, (0, 0, 0)),
        )
        for department in departments
    ]


def get_by_id(db: Session, department_id: int):
    stmt = (
        select(Department)
        .options(selectinload(Department.manager))
        .where(
            Department.id == department_id,
            Department.is_active == True,  # noqa: E712
        )
    )

    return db.scalar(stmt)


def get_detail(db: Session, department_id: int):
    department = get_by_id(db, department_id)

    if department is None:
        return None

    members = db.scalars(
        select(Employee)
        .where(
            Employee.department_id == department_id,
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
        .order_by(Employee.full_name.asc())
    ).all()

    teams = db.scalars(
        select(Team)
        .options(selectinload(Team.leader))
        .where(
            Team.department_id == department_id,
            Team.is_active == True,  # noqa: E712
        )
        .order_by(Team.name.asc())
    ).all()

    member_count_rows = db.execute(
        select(
            Employee.team_id,
            func.count(Employee.id),
        )
        .where(
            Employee.department_id == department_id,
            Employee.team_id.is_not(None),
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
        .group_by(Employee.team_id)
    ).all()

    # Đã fix lỗi Type Checker bằng Dictionary Comprehension
    member_counts = {row[0]: row[1] for row in member_count_rows}

    base = _serialize_department(db, department)

    serialized_members = [
        {
            "id": m.id,
            "employee_code": m.employee_code,
            "full_name": m.full_name,
            "email": m.email,
            "job_title": m.job_title,
            "avatar_url": m.avatar_url,
            "team_id": m.team_id,
            "role_id": m.role_id,
            "is_active": bool(m.is_active),
        }
        for m in members
    ]

    return {
        **base,
        "members": serialized_members,
        "teams": [
            {
                "id": team.id,
                "team_code": team.team_code,
                "name": team.name,
                "leader_id": team.leader_id,
                "leader_name": (team.leader.full_name if team.leader else None),
                "member_count": member_counts.get(team.id, 0),
            }
            for team in teams
        ],
    }


def create(db: Session, data: DepartmentCreate):
    _ensure_unique_code(db, data.department_code)
    _validate_manager(db, data.manager_id)
    obj = Department(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(
    db: Session,
    obj: Department,
    data: DepartmentUpdate,
):
    values = data.model_dump(exclude_unset=True)
    if "department_code" in values:
        _ensure_unique_code(
            db,
            values["department_code"],
            exclude_id=obj.id,
        )
    if "manager_id" in values:
        _validate_manager(
            db,
            values["manager_id"],
            department_id=obj.id,
        )

    for key, value in values.items():
        setattr(obj, key, value)

    db.commit()
    db.refresh(obj)
    return obj


def _ensure_unique_code(
    db: Session,
    department_code: str,
    *,
    exclude_id: int | None = None,
) -> None:
    stmt = select(Department.id).where(Department.department_code == department_code)
    if exclude_id is not None:
        stmt = stmt.where(Department.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department code already exists.",
        )


def _validate_manager(
    db: Session,
    manager_id: int | None,
    *,
    department_id: int | None = None,
) -> None:
    if manager_id is None:
        return

    manager = db.scalar(
        select(Employee).where(
            Employee.id == manager_id,
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department manager does not exist or is inactive.",
        )

    compatible_department_ids = {None}
    if department_id is not None:
        compatible_department_ids.add(department_id)
    if manager.department_id not in compatible_department_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department manager belongs to an incompatible Department.",
        )


def delete(db: Session, obj: Department):
    employee_count = _get_employee_count(db, obj.id)
    team_count = _get_team_count(db, obj.id)

    if employee_count > 0 or team_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể ngừng hoạt động phòng ban vì còn "
                f"{employee_count} nhân viên và {team_count} team."
            ),
        )

    obj.manager_id = None
    obj.is_active = False
    db.commit()
