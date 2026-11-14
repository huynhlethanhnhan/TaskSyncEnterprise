# 📂 FILE: app/routers/v1/employees.py
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.config import settings
from app.database import get_db
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.core.deps import (
    RequireAdmin,
    RequireManager,
    RequireEmployee,
    get_current_user,
)
from app.core.security import generate_temporary_password
from app.services.storage_service import StorageService
from app.services.notification.websocket_manager import websocket_manager
from app.services.password_reset_service import (
    apply_password_change,
    build_reset_link,
    list_pending_reset_requests,
    mark_reset_requests_resolved,
    try_send_password_reset_email,
)
from app.models.audit import AuditLog
from app.models.employee import Employee
from app.models.user_session import UserSession
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    validate_password_policy_value,
)
from app.crud import employee as crud_employee
from app.cache import cache_manager
from app.cache.cache_keys import (
    get_employee_key,
    get_employee_list_key,
    get_employee_search_key,
)

# 🟢 KHỞI TẠO ROUTER: Gỡ bỏ khóa tổng dependencies để giải cứu API /avatar cá nhân
router = APIRouter(prefix="/employees", tags=["Employees"])


def _get_online_employee_ids(
    db: Session,
    candidate_ids: list[int],
    current_user_id: int | None = None,
) -> set[int]:
    """Compute live online presence from WebSocket connections and non-stale active sessions."""
    if not candidate_ids:
        return set()

    candidate_set = set(candidate_ids)
    online_ids: set[int] = {
        uid
        for uid, conns in websocket_manager.active_connections.items()
        if uid in candidate_set and conns
    }
    if current_user_id is not None and current_user_id in candidate_set:
        online_ids.add(current_user_id)

    remaining_ids = candidate_set - online_ids
    if remaining_ids:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        session_rows = db.scalars(
            select(UserSession.employee_id)
            .where(
                UserSession.employee_id.in_(remaining_ids),
                UserSession.is_active == True,  # noqa: E712
                UserSession.created_at >= cutoff,
            )
            .distinct()
        ).all()
        online_ids.update(session_rows)

    return online_ids


def _is_logged_out_after_login(item: EmployeeResponse) -> bool:
    if item.last_logout is None:
        return False
    if item.last_login is None:
        return True
    return item.last_logout >= item.last_login


def _attach_online_presence(
    db: Session,
    items: list,
    current_user_id: int | None = None,
) -> list[EmployeeResponse]:
    responses = [EmployeeResponse.model_validate(item) for item in items]
    online_ids = _get_online_employee_ids(
        db,
        [item.id for item in responses if item.is_active],
        current_user_id=current_user_id,
    )
    enriched: list[EmployeeResponse] = []
    for item in responses:
        is_live = (
            bool(item.is_active)
            and (item.id in online_ids)
            and (
                item.id == current_user_id
                or bool(websocket_manager.active_connections.get(item.id))
                or not _is_logged_out_after_login(item)
            )
        )
        enriched.append(item.model_copy(update={"is_online": is_live}))
    return enriched


def _attach_single_online_presence(
    db: Session,
    item,
    current_user_id: int | None = None,
) -> EmployeeResponse:
    return _attach_online_presence(db, [item], current_user_id=current_user_id)[0]

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
    rows = cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_employee.get_all(db, current_user, skip, limit),
        ttl=settings.CACHE_TTL_EMPLOYEE,
        response_model=list[EmployeeResponse],
    )
    return _attach_online_presence(db, rows, current_user_id=current_user.id)


@router.get(
    "/search",
    response_model=list[EmployeeResponse],
    dependencies=[Depends(RequireEmployee)],  # <-- Cho phép Employee tìm kiếm nhân viên
)
def search_employee(
    keyword: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    key = get_employee_search_key(keyword)
    rows = cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_employee.search(db, keyword),
        ttl=settings.CACHE_TTL_EMPLOYEE,
        response_model=list[EmployeeResponse],
    )
    return _attach_online_presence(db, rows, current_user_id=current_user.id)


class PasswordResetRequestResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    email: str
    department_name: str | None = None
    avatar_url: str | None = None
    note: str | None = None
    requested_at: str | None = None
    notification_id: int


class AdminResetPasswordRequest(BaseModel):
    new_password: str | None = None
    force_change_on_login: bool = True
    notify_via_email: bool = False

    @field_validator("new_password")
    @classmethod
    def validate_optional_password(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return validate_password_policy_value(v.strip())


class AdminResetPasswordResponse(BaseModel):
    employee_id: int
    employee_code: str
    full_name: str
    email: str
    temporary_password: str
    reset_link: str
    force_change_on_login: bool
    email_sent: bool
    message: str


@router.get(
    "/password-reset-requests",
    response_model=list[PasswordResetRequestResponse],
    dependencies=[Depends(RequireAdmin)],
)
def get_pending_password_reset_requests(db: Session = Depends(get_db)):
    return list_pending_reset_requests(db)


@router.delete(
    "/password-reset-requests/{employee_id:int}",
    dependencies=[Depends(RequireAdmin)],
)
def dismiss_password_reset_request(employee_id: int, db: Session = Depends(get_db)):
    mark_reset_requests_resolved(db, employee_id)
    db.commit()
    websocket_manager.broadcast_threadsafe(
        {
            "event": "employee.changed",
            "action": "password_reset_dismissed",
            "employee_id": employee_id,
        }
    )
    return {"message": "Đã đánh dấu xử lý yêu cầu đặt lại mật khẩu."}


@router.get(
    "/{employee_id:int}",
    response_model=EmployeeResponse,
    dependencies=[
        Depends(RequireEmployee)
    ],  # <-- Cho phép Employee xem chi tiết thông tin đồng nghiệp
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    key = get_employee_key(employee_id)
    obj = cache_manager.cache_model(
        key=key,
        creator_fn=lambda: crud_employee.get_by_id(db, employee_id),
        ttl=settings.CACHE_TTL_EMPLOYEE,
        response_model=EmployeeResponse,
    )

    if obj is None:
        raise HTTPException(404, "Employee not found")

    return _attach_single_online_presence(db, obj, current_user_id=current_user.id)


@router.get("/me", response_model=EmployeeResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    return _attach_single_online_presence(
        db, current_user, current_user_id=current_user.id
    )


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

    is_admin = current_user.role_id == ROLE_ADMIN
    is_manager_same_dept = (
        current_user.role_id == ROLE_MANAGER
        and current_user.department_id is not None
        and obj.department_id == current_user.department_id
    )

    if not is_admin and current_user.id != employee_id and not is_manager_same_dept:
        raise HTTPException(
            status_code=403, detail="Bạn không có quyền cập nhật tài khoản này."
        )

    from app.cache import CacheInvalidator

    if not is_admin:
        allowed_fields = (
            {
                "full_name",
                "email",
                "phone",
                "gender",
                "address",
                "date_of_birth",
                "job_title",
            }
            if is_manager_same_dept
            else {"full_name", "email", "phone", "gender", "address", "date_of_birth"}
        )
        values = data.model_dump(exclude_unset=True)
        restricted = {
            k: v
            for k, v in values.items()
            if k in allowed_fields
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


class EmployeeStatusUpdate(BaseModel):
    status: str


@router.post(
    "/{employee_id:int}/reset-password",
    response_model=AdminResetPasswordResponse,
    dependencies=[Depends(RequireAdmin)],
)
def admin_reset_employee_password(
    employee_id: int,
    request: Request,
    data: AdminResetPasswordRequest = AdminResetPasswordRequest(),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = crud_employee.get_by_id(db, employee_id)
    if obj is None:
        raise HTTPException(404, "Employee not found")

    temp_password = data.new_password or generate_temporary_password()
    apply_password_change(
        db,
        obj,
        temp_password,
        force_first_login=data.force_change_on_login,
    )
    db.add(
        AuditLog(
            employee_id=current_user.id,
            employee_email=current_user.email,
            action=f"ADMIN_RESET_PASSWORD target={obj.id} ({obj.email})",
        )
    )
    db.commit()
    db.refresh(obj)

    reset_link = build_reset_link(request, obj)
    email_sent = (
        try_send_password_reset_email(
            obj.email,
            obj.full_name,
            reset_link=reset_link,
            temporary_password=temp_password,
        )
        if data.notify_via_email
        else False
    )

    websocket_manager.broadcast_threadsafe(
        {
            "event": "employee.changed",
            "action": "admin_reset_password",
            "employee_id": obj.id,
        }
    )

    return AdminResetPasswordResponse(
        employee_id=obj.id,
        employee_code=obj.employee_code,
        full_name=obj.full_name,
        email=obj.email,
        temporary_password=temp_password,
        reset_link=reset_link,
        force_change_on_login=data.force_change_on_login,
        email_sent=email_sent,
        message=f"Đã cấp lại mật khẩu mới cho {obj.full_name}.",
    )


@router.patch("/{employee_id:int}/status", response_model=EmployeeResponse)
def update_employee_status(
    employee_id: int,
    data: EmployeeStatusUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    obj = crud_employee.get_by_id(db, employee_id)
    if obj is None:
        raise HTTPException(404, "Employee not found")

    # Manager requests offboarding
    if current_user.role_id != ROLE_ADMIN:
        if data.status != "Pending_Offboard":
            raise HTTPException(403, "Bạn chỉ có thể yêu cầu Offboard nhân sự.")
    else:
        # Admin can approve to Terminated or back to Active
        pass

    obj.employment_status = data.status
    if data.status == "Terminated":
        obj.is_active = False
    elif data.status == "Active":
        obj.is_active = True

    db.commit()
    db.refresh(obj)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(obj.id)
    return obj


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
