from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.crud import department as crud_department
from app.core.deps import get_current_user, RequireAdmin
from app.cache import cache_manager
from app.cache.cache_keys import get_department_key, get_department_list_key

router = APIRouter(
    prefix="/departments",
    tags=["Departments"],
    dependencies=[Depends(get_current_user)]
)

@router.get("", response_model=list[DepartmentResponse])
def get_departments(
    skip: int = Query(0, ge=0, description="Số bản ghi bỏ qua (Offset)"),
    limit: int = Query(20, ge=1, le=100, description="Số bản ghi lấy tối đa (Limit)"),
    search: str | None = Query(None, description="Tìm kiếm theo tên hoặc mã phòng ban"),
    db: Session = Depends(get_db)
):
    key = get_department_list_key(skip, limit, search)
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_department.get_all(db, skip=skip, limit=limit, search=search),
        ttl=settings.CACHE_TTL_DEPARTMENT,
        response_model=list[DepartmentResponse]
    )

@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(department_id: int, db: Session = Depends(get_db)):
    key = get_department_key(department_id)
    obj = cache_manager.cache_model(
        key=key,
        creator_fn=lambda: crud_department.get_by_id(db, department_id),
        ttl=settings.CACHE_TTL_DEPARTMENT,
        response_model=DepartmentResponse
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found or inactive")
    return obj

@router.post("", response_model=DepartmentResponse, status_code=201, dependencies=[Depends(RequireAdmin)])
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    res = crud_department.create(db, data)
    from app.cache import CacheInvalidator
    CacheInvalidator.invalidate_department(res.id)
    return res

@router.put("/{department_id}", response_model=DepartmentResponse, dependencies=[Depends(RequireAdmin)])
def update_department(department_id: int, data: DepartmentUpdate, db: Session = Depends(get_db)):
    obj = crud_department.get_by_id(db, department_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found")
    res = crud_department.update(db, obj, data)
    from app.cache import CacheInvalidator
    CacheInvalidator.invalidate_department(res.id)
    return res

@router.delete("/{department_id}", dependencies=[Depends(RequireAdmin)])
def delete_department(department_id: int, db: Session = Depends(get_db)):
    obj = crud_department.get_by_id(db, department_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Department not found")
    crud_department.delete(db, obj)
    from app.cache import CacheInvalidator
    CacheInvalidator.invalidate_department(department_id)
    return {"message": "Soft deleted successfully"}