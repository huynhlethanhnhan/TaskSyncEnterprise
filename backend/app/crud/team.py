from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, or_, func
from fastapi import HTTPException, status

from app.models.team import Team
from app.models.employee import Employee
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.team import TeamCreate, TeamUpdate
from app.services.team_service import validate_team_organization


def _serialize_team(
    db: Session,
    team: Team,
    member_count: int | None = None,
) -> dict:
    if member_count is None:
        member_count = (
            db.scalar(
                select(func.count(Employee.id)).where(
                    Employee.team_id == team.id,
                    Employee.is_active == True,  # noqa: E712
                    Employee.is_deleted == False,  # noqa: E712
                )
            )
            or 0
        )

    return {
        "id": team.id,
        "department_id": team.department_id,
        "department_name": (
            team.department.name if getattr(team, "department", None) else None
        ),
        "team_code": team.team_code,
        "name": team.name,
        "description": team.description,
        "leader_id": team.leader_id,
        "leader_name": team.leader.full_name if team.leader else None,
        "leader_avatar_url": team.leader.avatar_url if team.leader else None,
        "member_count": member_count,
        "is_active": team.is_active,
        "created_at": team.created_at,
    }


def get_all(
    db: Session,
    current_user: Employee,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    department_id: int | None = None,
):
    stmt = (
        select(Team)
        .options(selectinload(Team.leader), selectinload(Team.department))
        .where(Team.is_active == True)  # noqa: E712
    )

    if current_user.role_id == ROLE_MANAGER:
        if current_user.department_id is None:
            return []
        stmt = stmt.where(Team.department_id == current_user.department_id)
    elif current_user.role_id != ROLE_ADMIN:
        if current_user.team_id is None:
            stmt = stmt.where(Team.leader_id == current_user.id)
        else:
            stmt = stmt.where(
                or_(
                    Team.id == current_user.team_id,
                    Team.leader_id == current_user.id,
                )
            )
    if department_id is not None:
        stmt = stmt.where(Team.department_id == department_id)

    if search:
        stmt = stmt.where(
            or_(
                Team.name.icontains(search),
                Team.team_code.icontains(search),
            )
        )

    stmt = stmt.order_by(Team.id.desc()).offset(skip).limit(limit)
    teams = db.scalars(stmt).all()
    if not teams:
        return []

    member_counts = dict(
        db.execute(
            select(Employee.team_id, func.count(Employee.id))
            .where(
                Employee.team_id.in_([team.id for team in teams]),
                Employee.is_active == True,  # noqa: E712
                Employee.is_deleted == False,  # noqa: E712
            )
            .group_by(Employee.team_id)
        ).all()
    )

    return [_serialize_team(db, team, member_counts.get(team.id, 0)) for team in teams]


def get_by_id(db: Session, team_id: int):
    stmt = (
        select(Team)
        .options(selectinload(Team.leader))
        .where(
            Team.id == team_id,
            Team.is_active == True,  # noqa: E712
        )
    )

    team = db.scalar(stmt)

    if team is None:
        return None

    return _serialize_team(db, team)


def create(db: Session, data: TeamCreate):
    _ensure_unique_code(db, data.team_code)
    validate_team_organization(
        db,
        department_id=data.department_id,
        leader_id=data.leader_id,
    )
    obj = Team(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Team, data: TeamUpdate):
    values = data.model_dump(exclude_unset=True)
    if "team_code" in values:
        _ensure_unique_code(db, values["team_code"], exclude_id=obj.id)

    validate_team_organization(
        db,
        department_id=values.get("department_id", obj.department_id),
        leader_id=values.get("leader_id", obj.leader_id),
    )
    for k, v in values.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


def _ensure_unique_code(
    db: Session,
    team_code: str,
    *,
    exclude_id: int | None = None,
) -> None:
    stmt = select(Team.id).where(Team.team_code == team_code)
    if exclude_id is not None:
        stmt = stmt.where(Team.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team code already exists.",
        )


def delete(db: Session, obj: Team):
    member_count = (
        db.scalar(
            select(func.count(Employee.id)).where(
                Employee.team_id == obj.id,
                Employee.is_active == True,  # noqa: E712
                Employee.is_deleted == False,  # noqa: E712
            )
        )
        or 0
    )

    if member_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Không thể ngừng hoạt động team vì vẫn còn {member_count} thành viên."
            ),
        )

    obj.leader_id = None
    obj.is_active = False
    db.commit()


def get_model_by_id(db: Session, team_id: int):
    stmt = (
        select(Team)
        .options(selectinload(Team.leader), selectinload(Team.department))
        .where(
            Team.id == team_id,
            Team.is_active == True,  # noqa: E712
        )
    )

    return db.scalar(stmt)


def get_members(db: Session, team_id: int):
    stmt = (
        select(Employee)
        .where(
            Employee.team_id == team_id,
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
        .order_by(Employee.full_name.asc())
    )

    return db.scalars(stmt).all()


def get_detail(db: Session, team_id: int):
    team = get_model_by_id(db, team_id)

    if team is None:
        return None

    members = get_members(db, team_id)

    return {
        "id": team.id,
        "department_id": team.department_id,
        "team_code": team.team_code,
        "name": team.name,
        "description": team.description,
        "leader_id": team.leader_id,
        "leader_name": team.leader.full_name if team.leader else None,
        "leader_avatar_url": team.leader.avatar_url if team.leader else None,
        "member_count": len(members),
        "members": members,
        "is_active": team.is_active,
        "created_at": team.created_at,
        "department_name": (
            team.department.name if getattr(team, "department", None) else None
        ),
    }
