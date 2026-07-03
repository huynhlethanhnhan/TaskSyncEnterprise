from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.models.team import Team
from app.schemas.team import TeamCreate, TeamUpdate

def get_all(db: Session, skip: int = 0, limit: int = 100, search: str | None = None, department_id: int | None = None):
    stmt = select(Team).where(Team.is_active == True)
    
    # Lọc theo phòng ban nếu được truyền vào
    if department_id:
        stmt = stmt.where(Team.department_id == department_id)
        
    # Tính năng Search theo Name hoặc Team Code
    if search:
        stmt = stmt.where(
            or_(
                Team.name.icontains(search),
                Team.team_code.icontains(search)
            )
        )
        
    stmt = stmt.order_by(Team.id.desc()).offset(skip).limit(limit)
    return db.scalars(stmt).all()

def get_by_id(db: Session, team_id: int):
    stmt = select(Team).where(Team.id == team_id, Team.is_active == True)
    return db.scalar(stmt)

def create(db: Session, data: TeamCreate):
    obj = Team(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def update(db: Session, obj: Team, data: TeamUpdate):
    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

def delete(db: Session, obj: Team):
    # Triển khai chuẩn Soft Delete cho Team
    obj.is_active = False
    db.commit()