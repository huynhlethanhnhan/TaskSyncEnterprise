# 📂 FILE: app/routers/v1/employees.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import update

from app.database import get_db
from app.core.constants import ROLE_ADMIN
from app.core.deps import RequireAdmin, RequireEmployee, get_current_user
from app.services.storage_service import StorageService
from app.models.employee import Employee
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse
)
from app.crud import employee as crud_employee

# 🟢 KHỞI TẠO ROUTER: Gỡ bỏ khóa tổng dependencies để giải cứu API /avatar cá nhân
router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)

# ==========================================
# 🔐 LUỒNG QUẢN TRỊ (BẮT BUỘC PHẢI LÀ ADMIN THÔNG QUA DEPENDENCIES RIÊNG)
# ==========================================

@router.get(
    "",
    response_model=list[EmployeeResponse],
    dependencies=[Depends(RequireEmployee)] # <-- Cho phép cả Employee xem danh sách đồng nghiệp
)
def get_employees(
        skip: int = 0,
        limit: int = 20,
        db: Session = Depends(get_db)
):
    return crud_employee.get_all(
        db,
        skip,
        limit
    )


@router.get(
    "/search",
    response_model=list[EmployeeResponse],
    dependencies=[Depends(RequireEmployee)] # <-- Cho phép Employee tìm kiếm nhân viên
)
def search_employee(
        keyword: str,
        db: Session = Depends(get_db)
):
    return crud_employee.search(
        db,
        keyword
    )


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    dependencies=[Depends(RequireEmployee)] # <-- Cho phép Employee xem chi tiết thông tin đồng nghiệp
)
def get_employee(
        employee_id: int,
        db: Session = Depends(get_db)
):
    obj = crud_employee.get_by_id(
        db,
        employee_id
    )

    if obj is None:
        raise HTTPException(
            404,
            "Employee not found"
        )

    return obj


@router.get(
    "/me",
    response_model=EmployeeResponse
)
def get_my_profile(
        current_user: Employee = Depends(get_current_user)
):
    return current_user


@router.post(
    "",
    response_model=EmployeeResponse,
    dependencies=[Depends(RequireAdmin)] # <-- Admin mới được tạo tài khoản nhân viên mới
)
def create_employee(
        data: EmployeeCreate,
        db: Session = Depends(get_db)
):
    return crud_employee.create(
        db,
        data
    )


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
        employee_id: int,
        data: EmployeeUpdate,
        current_user: Employee = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    obj = crud_employee.get_by_id(
        db,
        employee_id
    )

    if obj is None:
        raise HTTPException(
            404,
            "Employee not found"
        )

    if current_user.role_id != ROLE_ADMIN and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật tài khoản này.")

    if current_user.role_id != ROLE_ADMIN:
        values = data.model_dump(exclude_unset=True)
        restricted = {k: v for k, v in values.items() if k in {"full_name", "email", "phone", "gender", "address", "date_of_birth"}}
        if not restricted:
            return obj
        for key, value in restricted.items():
            setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    return crud_employee.update(
        db,
        obj,
        data
    )


@router.delete(
    "/{employee_id}",
    dependencies=[Depends(RequireAdmin)] # <-- Admin mới được quyền ra lệnh xóa mềm nhân viên
)
def delete_employee(
        employee_id: int,
        db: Session = Depends(get_db)
):
    obj = crud_employee.get_by_id(
        db,
        employee_id
    )

    if obj is None:
        raise HTTPException(
            404,
            "Employee not found"
        )

    crud_employee.soft_delete(
        db,
        obj
    )

    return {
        "message": "Deleted"
    }


# ==========================================
# 👤 LUỒNG CÁ NHÂN (DÀNH CHO TẤT CẢ MỌI NGƯỜI ĐÃ ĐĂNG NHẬP)
# ==========================================

@router.post("/avatar", summary="Cập nhật ảnh đại diện (Avatar) cá nhân")
def upload_my_avatar(
    file: UploadFile = File(..., description="Chọn file ảnh (.jpg, .png, .webp) dưới 5MB"),
    current_user: Employee = Depends(get_current_user), # Chỉ cần login hợp lệ là lấy được user hiện tại
    db: Session = Depends(get_db)
):
    # 1. Gọi Storage Service kiểm tra và lưu vật lý vào thư mục uploads/avatars/
    avatar_url = StorageService.save_avatar(file)
    
    # 2. Thực thi câu lệnh cập nhật trực tiếp đường dẫn ảnh vào cơ sở dữ liệu
    stmt = update(Employee).where(Employee.id == current_user.id).values(
        avatar_url=avatar_url
    )
    db.execute(stmt)
    db.commit()
    
    return {
        "success": True,
        "message": "Cập nhật ảnh đại diện thành công!",
        "avatar_url": avatar_url
    }