from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.employee import EmployeeResponse
from app.schemas.organization_membership import (
    MembershipChangeResponse,
    MembershipTargetResponse,
    TeamTransferRequest,
)
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse, TeamDetailResponse
from app.crud import team as crud_team
from app.core.deps import get_current_user, RequireAdmin, RequireManager
from app.core.constants import (
    ROLE_ADMIN,
    ROLE_MANAGER,
)
from app.services.team_service import can_view_team
from app.services import organization_membership

router = APIRouter(
    prefix="/teams", tags=["Teams"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=list[TeamResponse], dependencies=[Depends(RequireManager)])
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


@router.get(
    "/{team_id}/member-candidates",
    response_model=list[EmployeeResponse],
)
def get_team_member_candidates(
    team_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return organization_membership.get_team_candidates(
        db,
        team_id=team_id,
        current_user=current_user,
    )


@router.get(
    "/{team_id}/transfer-targets",
    response_model=list[MembershipTargetResponse],
)
def get_team_transfer_targets(
    team_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return organization_membership.get_team_transfer_targets(
        db,
        team_id=team_id,
        current_user=current_user,
    )


@router.post(
    "/{team_id}/members/{employee_id}",
    response_model=MembershipChangeResponse,
)
def add_team_member(
    team_id: int,
    employee_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = organization_membership.add_team_member(
        db,
        team_id=team_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    _invalidate_membership(employee.id, employee.department_id, None, team_id)
    return _membership_response("Employee added to Team.", employee)


@router.delete(
    "/{team_id}/members/{employee_id}",
    response_model=MembershipChangeResponse,
)
def remove_team_member(
    team_id: int,
    employee_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = organization_membership.remove_team_member(
        db,
        team_id=team_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    _invalidate_membership(employee.id, employee.department_id, team_id, None)
    return _membership_response("Employee removed from Team.", employee)


@router.post(
    "/{team_id}/members/{employee_id}/transfer",
    response_model=MembershipChangeResponse,
)
def transfer_team_member(
    team_id: int,
    employee_id: int,
    data: TeamTransferRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    employee = organization_membership.transfer_team_member(
        db,
        team_id=team_id,
        target_team_id=data.target_team_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    _invalidate_membership(
        employee.id,
        employee.department_id,
        team_id,
        data.target_team_id,
    )
    return _membership_response("Employee transferred to Team.", employee)


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


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(RequireManager),
):
    obj = crud_team.get_model_by_id(db, team_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Team not found")

    if current_user.role_id == ROLE_MANAGER:
        changed_fields = set(data.model_dump(exclude_unset=True))
        if obj.department_id != current_user.department_id:
            raise HTTPException(
                status_code=403,
                detail="Managers can only update Teams in their Department.",
            )
        if changed_fields - {"leader_id"}:
            raise HTTPException(
                status_code=403,
                detail="Managers can only change the Team Leader.",
            )
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


def _membership_response(message: str, employee) -> dict:
    return {
        "message": message,
        "employee_id": employee.id,
        "department_id": employee.department_id,
        "team_id": employee.team_id,
    }


def _invalidate_membership(
    employee_id: int,
    department_id: int | None,
    old_team_id: int | None,
    new_team_id: int | None,
) -> None:
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(employee_id)
    if department_id is not None:
        CacheInvalidator.invalidate_department(department_id)
    for team_id in {old_team_id, new_team_id} - {None}:
        CacheInvalidator.invalidate_team(team_id)
