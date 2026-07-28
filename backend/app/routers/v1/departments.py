from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentDetailResponse,
)
from app.crud import department as crud_department
from app.core.deps import get_current_user, RequireAdmin
from app.core.constants import ROLE_ADMIN
from app.models.employee import Employee

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[DepartmentResponse])
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
