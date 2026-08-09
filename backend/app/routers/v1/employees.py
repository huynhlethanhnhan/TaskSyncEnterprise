# 📂 FILE: app/routers/v1/employees.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import update

from app.config import settings
from app.database import get_db
from app.core.constants import ROLE_ADMIN
from app.core.deps import (
    RequireAdmin,
    RequireManager,
    RequireEmployee,
    get_current_user,
)
from app.services.storage_service import StorageService
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.crud import employee as crud_employee
from app.cache import cache_manager
from app.cache.cache_keys import (
    get_employee_key,
    get_employee_list_key,
    get_employee_search_key,
)

# 🟢 KHỞI TẠO ROUTER: Gỡ bỏ khóa tổng dependencies để giải cứu API /avatar cá nhân
router = APIRouter(prefix="/employees", tags=["Employees"])

# ==========================================
# 🔐 LUỒNG QUẢN TRỊ (BẮT BUỘC PHẢI LÀ ADMIN THÔNG QUA DEPENDENCIES RIÊNG)
# ==========================================


@router.get(
    "",
    response_model=list[EmployeeResponse],
    dependencies=[
        Depends(RequireManager)
    ],  # <-- Chỉ cho phép Admin và Manager xem danh sách nhân viên
)
def get_employees(
    skip: int = 0,
    limit: int = settings.DEFAULT_PAGE_SIZE,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    scope = (
        "admin"
        if current_user.role_id == ROLE_ADMIN
        else f"department_{current_user.department_id or 'none'}"
    )
    key = get_employee_list_key(skip, limit, scope)
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_employee.get_all(db, current_user, skip, limit),
        ttl=settings.CACHE_TTL_EMPLOYEE,
        response_model=list[EmployeeResponse],
    )


@router.get(
    "/search",
    response_model=list[EmployeeResponse],
    dependencies=[Depends(RequireEmployee)],  # <-- Cho phép Employee tìm kiếm nhân viên
)
def search_employee(keyword: str, db: Session = Depends(get_db)):
    key = get_employee_search_key(keyword)
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_employee.search(db, keyword),
        ttl=settings.CACHE_TTL_EMPLOYEE,
        response_model=list[EmployeeResponse],
    )


@router.get(
    "/{employee_id:int}",
    response_model=EmployeeResponse,
    dependencies=[
        Depends(RequireEmployee)
    ],  # <-- Cho phép Employee xem chi tiết thông tin đồng nghiệp
)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    key = get_employee_key(employee_id)
    obj = cache_manager.cache_model(
        key=key,
        creator_fn=lambda: crud_employee.get_by_id(db, employee_id),
        ttl=settings.CACHE_TTL_EMPLOYEE,
        response_model=EmployeeResponse,
    )

    if obj is None:
        raise HTTPException(404, "Employee not found")

    return obj


@router.get("/me", response_model=EmployeeResponse)
def get_my_profile(current_user: Employee = Depends(get_current_user)):
    return current_user


@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=201,
    dependencies=[
        Depends(RequireAdmin)
    ],  # <-- Admin mới được tạo tài khoản nhân viên mới
)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    res = crud_employee.create(db, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(res.id)
    if res.department_id is not None:
        CacheInvalidator.invalidate_department(res.department_id)
    if res.team_id is not None:
        CacheInvalidator.invalidate_team(res.team_id)
    return res


@router.put("/{employee_id:int}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = crud_employee.get_by_id(db, employee_id)

    if obj is None:
        raise HTTPException(404, "Employee not found")

    if current_user.role_id != ROLE_ADMIN and current_user.id != employee_id:
        raise HTTPException(
            status_code=403, detail="Bạn không có quyền cập nhật tài khoản này."
        )

    from app.cache import CacheInvalidator

    if current_user.role_id != ROLE_ADMIN:
        values = data.model_dump(exclude_unset=True)
        restricted = {
            k: v
            for k, v in values.items()
            if k
            in {"full_name", "email", "phone", "gender", "address", "date_of_birth"}
        }
        if not restricted:
            return obj
        for key, value in restricted.items():
            setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        CacheInvalidator.invalidate_employee(obj.id)
        return obj

    old_department_id = obj.department_id
    old_team_id = obj.team_id
    res = crud_employee.update(db, obj, data)
    CacheInvalidator.invalidate_employee(res.id)
    for department_id in {old_department_id, res.department_id} - {None}:
        CacheInvalidator.invalidate_department(department_id)
    for team_id in {old_team_id, res.team_id} - {None}:
        CacheInvalidator.invalidate_team(team_id)
    return res


@router.delete(
    "/{employee_id:int}",
    dependencies=[
        Depends(RequireAdmin)
    ],  # <-- Admin mới được quyền ra lệnh xóa mềm nhân viên
)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    obj = crud_employee.get_by_id(db, employee_id)

    if obj is None:
        raise HTTPException(404, "Employee not found")

    department_id = obj.department_id
    team_id = obj.team_id
    crud_employee.soft_delete(db, obj)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(employee_id)
    if department_id is not None:
        CacheInvalidator.invalidate_department(department_id)
    if team_id is not None:
        CacheInvalidator.invalidate_team(team_id)

    return {"message": "Deleted"}


# ==========================================
# 👤 LUỒNG CÁ NHÂN (DÀNH CHO TẤT CẢ MỌI NGƯỜI ĐÃ ĐĂNG NHẬP)
# ==========================================


@router.post("/avatar", summary="Cập nhật ảnh đại diện (Avatar) cá nhân")
def upload_my_avatar(
    file: UploadFile = File(
        ..., description="Chọn file ảnh (.jpg, .png, .webp) dưới 5MB"
    ),
    current_user: Employee = Depends(
        get_current_user
    ),  # Chỉ cần login hợp lệ là lấy được user hiện tại
    db: Session = Depends(get_db),
):
    # 1. Gọi Storage Service kiểm tra và lưu vật lý vào thư mục uploads/avatars/
    previous_avatar_url = current_user.avatar_url
    avatar_url = StorageService.save_avatar(file)

    # 2. Thực thi câu lệnh cập nhật trực tiếp đường dẫn ảnh vào cơ sở dữ liệu
    stmt = (
        update(Employee)
        .where(Employee.id == current_user.id)
        .values(avatar_url=avatar_url)
    )
    db.execute(stmt)
    db.commit()
    if previous_avatar_url and previous_avatar_url != avatar_url:
        StorageService.delete_uploaded_file(previous_avatar_url)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(current_user.id)
    CacheInvalidator.invalidate_task(employee_id=current_user.id)

    return {
        "success": True,
        "message": "Cập nhật ảnh đại diện thành công!",
        "avatar_url": avatar_url,
    }


@router.delete("/avatar", summary="Xóa ảnh đại diện cá nhân")
def delete_my_avatar(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    previous_avatar_url = current_user.avatar_url
    stmt = (
        update(Employee).where(Employee.id == current_user.id).values(avatar_url=None)
    )
    db.execute(stmt)
    db.commit()
    StorageService.delete_uploaded_file(previous_avatar_url)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(current_user.id)
    CacheInvalidator.invalidate_task(employee_id=current_user.id)

    return {
        "success": True,
        "message": "Đã xóa ảnh đại diện thành công!",
        "avatar_url": None,
    }
