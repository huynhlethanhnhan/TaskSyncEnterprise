from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse, TeamDetailResponse
from app.crud import team as crud_team
from app.core.deps import get_current_user, RequireAdmin
from app.core.constants import (
    ROLE_ADMIN,
)
from app.services.team_service import can_view_team

router = APIRouter(
    prefix="/teams", tags=["Teams"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[TeamResponse])
def get_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    department_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return crud_team.get_all(
        db,
        current_user=current_user,
        skip=skip,
        limit=limit,
        search=search,
        department_id=department_id,
    )


@router.get("/{team_id}", response_model=TeamDetailResponse)
def get_team(
    team_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = crud_team.get_detail(db, team_id)

    if not obj:
        raise HTTPException(
            status_code=404,
            detail="Team not found or inactive",
        )

    if can_view_team(current_user, obj):
        return obj

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to view this team.",
    )


@router.post(
    "",
    response_model=TeamResponse,
    status_code=201,
    dependencies=[Depends(RequireAdmin)],
)
def create_team(data: TeamCreate, db: Session = Depends(get_db)):
    res = crud_team.create(db, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_team(res.id)
    CacheInvalidator.invalidate_department(res.department_id)
    return crud_team._serialize_team(db, res)


@router.put(
    "/{team_id}", response_model=TeamResponse, dependencies=[Depends(RequireAdmin)]
)
def update_team(team_id: int, data: TeamUpdate, db: Session = Depends(get_db)):
    obj = crud_team.get_model_by_id(db, team_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Team not found")
    old_department_id = obj.department_id
    res = crud_team.update(db, obj, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_team(res.id)
    CacheInvalidator.invalidate_department(old_department_id)
    if res.department_id != old_department_id:
        CacheInvalidator.invalidate_department(res.department_id)
    return crud_team._serialize_team(db, res)


@router.delete("/{team_id}", dependencies=[Depends(RequireAdmin)])
def delete_team(team_id: int, db: Session = Depends(get_db)):
    obj = crud_team.get_model_by_id(db, team_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Team not found")
    department_id = obj.department_id
    crud_team.delete(db, obj)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_team(team_id)
    CacheInvalidator.invalidate_department(department_id)
    return {"message": "Soft deleted successfully"}
