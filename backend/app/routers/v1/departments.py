from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentDetailResponse,
)
from app.schemas.employee import EmployeeResponse
from app.schemas.organization_membership import (
    DepartmentTransferRequest,
    MembershipChangeResponse,
    MembershipTargetResponse,
)
from app.crud import department as crud_department
from app.core.deps import get_current_user, RequireAdmin, RequireManager
from app.core.constants import ROLE_ADMIN
from app.models.employee import Employee
from app.services import organization_membership

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[DepartmentResponse], dependencies=[Depends(RequireManager)])
def get_departments(
    skip: int = Query(0, ge=0, description="Số bản ghi bỏ qua (Offset)"),
    limit: int = Query(20, ge=1, le=100, description="Số bản ghi lấy tối đa (Limit)"),
    search: str | None = Query(None, description="Tìm kiếm theo tên hoặc mã phòng ban"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return crud_department.get_all(
        db,
        skip=skip,
        limit=limit,
        search=search,
        current_user=current_user,
    )


@router.get(
    "/{department_id}",
    response_model=DepartmentDetailResponse,
)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if (
        current_user.role_id != ROLE_ADMIN
        and current_user.department_id != department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this Department.",
        )
    obj = crud_department.get_detail(db, department_id)

    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    return obj


@router.get(
    "/{department_id}/member-candidates",
    response_model=list[EmployeeResponse],
)
def get_department_member_candidates(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return organization_membership.get_department_candidates(
        db,
        department_id=department_id,
        current_user=current_user,
    )


@router.get(
    "/{department_id}/transfer-targets",
    response_model=list[MembershipTargetResponse],
)
def get_department_transfer_targets(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return organization_membership.get_department_transfer_targets(
        db,
        department_id=department_id,
        current_user=current_user,
    )


@router.post(
    "/{department_id}/members/{employee_id}",
    response_model=MembershipChangeResponse,
)
def add_department_member(
    department_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    employee = organization_membership.add_department_member(
        db,
        department_id=department_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    _invalidate_membership(employee.id, None, department_id, None, None)
    return _membership_response("Employee added to Department.", employee)


@router.delete(
    "/{department_id}/members/{employee_id}",
    response_model=MembershipChangeResponse,
)
def remove_department_member(
    department_id: int,
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    related_team_ids = organization_membership.get_related_team_ids(
        db,
        department_id=department_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    employee = organization_membership.remove_department_member(
        db,
        department_id=department_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    _invalidate_membership(
        employee.id,
        department_id,
        None,
        None,
        None,
        related_team_ids,
    )
    return _membership_response("Employee removed from Department.", employee)


@router.post(
    "/{department_id}/members/{employee_id}/transfer",
    response_model=MembershipChangeResponse,
)
def transfer_department_member(
    department_id: int,
    employee_id: int,
    data: DepartmentTransferRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    related_team_ids = organization_membership.get_related_team_ids(
        db,
        department_id=department_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    employee = organization_membership.transfer_department_member(
        db,
        department_id=department_id,
        target_department_id=data.target_department_id,
        employee_id=employee_id,
        current_user=current_user,
    )
    _invalidate_membership(
        employee.id,
        department_id,
        data.target_department_id,
        None,
        None,
        related_team_ids,
    )
    return _membership_response("Employee transferred to Department.", employee)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=201,
    dependencies=[Depends(RequireAdmin)],
)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    res = crud_department.create(db, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_department(res.id)
    return _serialize_for_response(db, res)


@router.put(
    "/{department_id}",
    response_model=DepartmentResponse,
    dependencies=[Depends(RequireAdmin)],
)
def update_department(
    department_id: int, data: DepartmentUpdate, db: Session = Depends(get_db)
):
    obj = crud_department.get_by_id(db, department_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found")
    res = crud_department.update(db, obj, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_department(res.id)
    return crud_department._serialize_department(db, res)


@router.delete("/{department_id}", dependencies=[Depends(RequireAdmin)])
def delete_department(department_id: int, db: Session = Depends(get_db)):
    obj = crud_department.get_by_id(db, department_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found")
    crud_department.delete(db, obj)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_department(department_id)
    return {"message": "Soft deleted successfully"}


def _serialize_for_response(db: Session, obj):
    """Helper: re-load with manager relationship then serialize."""
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.department import Department

    reloaded = db.scalar(
        select(Department)
        .options(selectinload(Department.manager))
        .where(Department.id == obj.id)
    )
    return crud_department._serialize_department(db, reloaded or obj)


def _membership_response(message: str, employee: Employee) -> dict:
    return {
        "message": message,
        "employee_id": employee.id,
        "department_id": employee.department_id,
        "team_id": employee.team_id,
    }


def _invalidate_membership(
    employee_id: int,
    old_department_id: int | None,
    new_department_id: int | None,
    old_team_id: int | None,
    new_team_id: int | None,
    related_team_ids: set[int] | None = None,
) -> None:
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(employee_id)
    for department_id in {old_department_id, new_department_id} - {None}:
        CacheInvalidator.invalidate_department(department_id)
    team_ids = ({old_team_id, new_team_id} - {None}) | (related_team_ids or set())
    for team_id in team_ids:
        CacheInvalidator.invalidate_team(team_id)
