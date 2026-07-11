from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse
from app.crud import team as crud_team
from app.core.deps import get_current_user, RequireAdmin

router = APIRouter(
    prefix="/teams",
    tags=["Teams"],
    dependencies=[Depends(get_current_user)]
)

@router.get("", response_model=list[TeamResponse])
def get_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Tìm kiếm theo tên hoặc mã nhóm"),
    department_id: int | None = Query(None, description="Lọc danh sách nhóm theo ID phòng ban"),
    db: Session = Depends(get_db)
):
    return crud_team.get_all(db, skip=skip, limit=limit, search=search, department_id=department_id)

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(team_id: int, db: Session = Depends(get_db)):
    obj = crud_team.get_by_id(db, team_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Team not found or inactive")
    return obj

@router.post("", response_model=TeamResponse, status_code=201, dependencies=[Depends(RequireAdmin)])
def create_team(data: TeamCreate, db: Session = Depends(get_db)):
    res = crud_team.create(db, data)
    from app.cache import CacheInvalidator
    CacheInvalidator.invalidate_employee()
    return res

@router.put("/{team_id}", response_model=TeamResponse, dependencies=[Depends(RequireAdmin)])
def update_team(team_id: int, data: TeamUpdate, db: Session = Depends(get_db)):
    obj = crud_team.get_by_id(db, team_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Team not found")
    res = crud_team.update(db, obj, data)
    from app.cache import CacheInvalidator
    CacheInvalidator.invalidate_employee()
    return res

@router.delete("/{team_id}", dependencies=[Depends(RequireAdmin)])
def delete_team(team_id: int, db: Session = Depends(get_db)):
    obj = crud_team.get_by_id(db, team_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Team not found")
    crud_team.delete(db, obj)
    from app.cache import CacheInvalidator
    CacheInvalidator.invalidate_employee()
    return {"message": "Soft deleted successfully"}