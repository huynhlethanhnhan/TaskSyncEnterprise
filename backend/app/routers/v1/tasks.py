# 📂 FILE: app/routers/v1/tasks.py
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator

from app.database import get_db
from app.models.employee import Employee
from app.core.deps import (
    RequireManager,
    RequireEmployee,
    get_current_user,
)  # Thêm get_current_user để lấy vết audit

from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.crud import task as crud_task

# --- Bổ sung hạ tầng lưu trữ cho Batch 9 ---
from app.services.storage_service import StorageService
from app.models.task_attachment import TaskAttachment
from app.models.task import Task

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# --- Định nghĩa Schema nhanh cho Employee cập nhật tiến độ ---
class TaskEmployeeUpdate(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "In Progress"})
    progress_percent: float = Field(..., json_schema_extra={"example": 50.0})

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ["To Do", "In Progress", "Done"]:
            raise ValueError("Status must be 'To Do', 'In Progress', or 'Done'")
        return v


# ==========================================
# 👑 NHÓM ENDPOINT CHO ADMIN & MANAGER (CRUD)
# ==========================================


@router.get(
    "",
    response_model=list[TaskResponse],
    dependencies=[
        Depends(RequireEmployee)
    ],  # <-- Cho phép Employee xem danh sách công việc
)
def get_tasks(
    skip: int = 0,
    limit: int = 20,
    project_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    from app.cache import cache_manager
    from app.cache.cache_keys import get_task_list_key
    from app.config import settings

    key = get_task_list_key(
        skip=skip, limit=limit, project_id=project_id, status=status
    )
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_task.get_all(
            db, skip=skip, limit=limit, project_id=project_id, status=status
        ),
        ttl=settings.CACHE_TTL_TASK,
        response_model=list[TaskResponse],
    )


@router.get(
    "/{task_id:int}",
    response_model=TaskResponse,
    dependencies=[
        Depends(RequireEmployee)
    ],  # <-- Cho phép Employee xem chi tiết công việc bất kỳ
)
def get_task(task_id: int, db: Session = Depends(get_db)):
    from app.cache import cache_manager
    from app.cache.cache_keys import get_task_key
    from app.config import settings

    key = get_task_key(task_id)
    obj = cache_manager.cache_model(
        key=key,
        creator_fn=lambda: crud_task.get_by_id(db, task_id),
        ttl=settings.CACHE_TTL_TASK,
        response_model=TaskResponse,
    )
    if obj is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return obj


@router.post(
    "",
    response_model=TaskResponse,
    dependencies=[Depends(RequireManager)],  # <-- Chỉ Admin và Manager được tạo Task
)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = crud_task.create(db, data)
    db.refresh(task)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_task(
        task.id, project_id=task.project_id, employee_id=task.employee_id
    )

    return task


@router.put(
    "/{task_id:int}",
    response_model=TaskResponse,
    dependencies=[
        Depends(RequireManager)
    ],  # <-- Chỉ Admin và Manager được sửa toàn bộ Task
)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    obj = crud_task.get_by_id(db, task_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Task not found")

    old_project_id = obj.project_id
    old_employee_id = obj.employee_id

    task = crud_task.update(db, obj, data)
    db.refresh(task)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_task(
        task.id, project_id=task.project_id, employee_id=task.employee_id
    )
    if old_project_id != task.project_id:
        CacheInvalidator.invalidate_project(old_project_id)
    if old_employee_id != task.employee_id:
        CacheInvalidator.invalidate_employee(old_employee_id)

    return task


@router.patch("/{task_id:int}", response_model=TaskResponse)
def patch_task(
    task_id: int,
    data: TaskUpdate,
    current_user: Employee = Depends(RequireEmployee),
    db: Session = Depends(get_db),
):
    obj = crud_task.get_by_id(db, task_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Task not found")

    from app.core.constants import ROLE_ADMIN, ROLE_MANAGER

    is_manager_or_admin = current_user.role_id in {ROLE_ADMIN, ROLE_MANAGER}
    if not is_manager_or_admin:
        from app.models.task_assignment import TaskAssignment
        from sqlalchemy import select

        is_assigned = db.scalar(
            select(TaskAssignment).where(
                TaskAssignment.task_id == task_id,
                TaskAssignment.employee_id == current_user.id,
            )
        )
        if not is_assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this task",
            )

    old_project_id = obj.project_id
    old_employee_id = obj.employee_id

    task = crud_task.update(db, obj, data)
    db.refresh(task)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_task(
        task.id, project_id=task.project_id, employee_id=task.employee_id
    )
    if old_project_id != task.project_id:
        CacheInvalidator.invalidate_project(old_project_id)
    if old_employee_id != task.employee_id:
        CacheInvalidator.invalidate_employee(old_employee_id)

    return task


@router.delete(
    "/{task_id:int}",
    dependencies=[Depends(RequireManager)],  # <-- Chỉ Admin và Manager được xóa Task
)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    obj = crud_task.get_by_id(db, task_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Task not found")

    project_id = obj.project_id
    employee_id = obj.employee_id

    crud_task.delete(db, obj)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_task(
        task_id, project_id=project_id, employee_id=employee_id
    )

    return {"message": "Deleted"}


# ==========================================
# 🎯 NHÓM ENDPOINT DÀNH RIÊNG CHO EMPLOYEE
# ==========================================


@router.get("/my-tasks", response_model=list[TaskResponse])
def get_my_tasks(
    current_user: Employee = Depends(
        RequireEmployee
    ),  # Cho cả 3 gọi, nhưng lôi ra User hiện tại để lọc DB
    db: Session = Depends(get_db),
):
    return crud_task.get_my_tasks(db, employee_id=current_user.id)


@router.put("/my-task/{task_id}", response_model=TaskResponse)
def update_my_task(
    task_id: int,
    data: TaskEmployeeUpdate,
    current_user: Employee = Depends(RequireEmployee),
    db: Session = Depends(get_db),
):
    # 1. Tìm task gốc trong DB ra trước
    task = crud_task.get_by_id(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # 2. CHỐT CHẶN: Xuống DB kiểm tra xem Task này có phải do Nhân viên này đảm nhận không
    from app.models.task_assignment import TaskAssignment
    from sqlalchemy import select

    is_assigned = db.scalar(
        select(TaskAssignment).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.employee_id == current_user.id,
        )
    )
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this task",
        )

    # 3. Tiến hành cập nhật giới hạn (Chỉ đổi status và progress)
    old_status = task.status
    task.status = data.status
    task.progress_percent = data.progress_percent

    db.commit()
    db.refresh(task)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_task(
        task.id, project_id=task.project_id, employee_id=current_user.id
    )

    if old_status != data.status:
        from app.crud import notification as notification_crud

        try:
            notification_crud.create_notification(
                db,
                title="Thay đổi trạng thái Task",
                message=f"Task '{task.title}' đã chuyển sang trạng thái '{data.status}'",
                employee_id=current_user.id,
            )
        except Exception as e:
            from app.core.logger import app_logger

            app_logger.error(f"Error creating status notification: {e}")

    return task


# ==========================================
# 📂 📁 BỔ SUNG: API ĐÍNH KÈM FILE TÀI LIỆU VÀO TASK (BATCH 9)
# ==========================================


@router.post(
    "/{task_id}/attachments", summary="Đính kèm tài liệu, báo cáo vào Task công việc"
)
def upload_task_attachment(
    task_id: int,
    file: UploadFile = File(
        ..., description="Chọn file đính kèm báo cáo, tài liệu dưới 20MB"
    ),
    current_user: Employee = Depends(
        get_current_user
    ),  # Xác thực token để lấy thông tin người upload
    db: Session = Depends(get_db),
):
    # 1. Kiểm tra xem Task tồn tại vật lý trong hệ thống không
    task = crud_task.get_by_id(db, task_id)
    if task is None:
        raise HTTPException(
            status_code=404, detail="Không tìm thấy Task để đính kèm file!"
        )

    # 1.5 CHỐT CHẶN BẢO MẬT (IDOR): Admin/Manager hoặc Người được phân công Task mới có quyền upload file
    from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
    from app.models.task_assignment import TaskAssignment
    from sqlalchemy import select

    is_manager_or_admin = current_user.role_id in {ROLE_ADMIN, ROLE_MANAGER}
    if not is_manager_or_admin:
        is_assigned = db.scalar(
            select(TaskAssignment).where(
                TaskAssignment.task_id == task_id,
                TaskAssignment.employee_id == current_user.id,
            )
        )
        if not is_assigned:
            raise HTTPException(
                status_code=403,
                detail="Bạn không được phân công thực hiện nhiệm vụ này để tải lên tài liệu!",
            )

    # 2. Gọi Storage Service xử lý ghi file vật lý vào thư mục uploads/attachments/
    file_metadata = StorageService.save_attachment(file)

    # 3. Tạo bản ghi chi tiết lưu vào bảng task_attachments trong SQL Server để quản lý dấu vết
    db_attachment = TaskAttachment(
        task_id=task_id,
        file_name=file_metadata["file_name"],
        file_path=file_metadata["file_path"],
        file_size=file_metadata["file_size"],
        mime_type=file_metadata["mime_type"],
        uploaded_by_id=current_user.id,
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_task(
        task_id, project_id=task.project_id, employee_id=task.employee_id
    )

    return {
        "success": True,
        "message": "Đính kèm tài liệu vào công việc thành công!",
        "data": {
            "id": db_attachment.id,
            "file_name": db_attachment.file_name,
            "file_path": db_attachment.file_path,
            "file_size": db_attachment.file_size,
            "mime_type": db_attachment.mime_type,
            "uploaded_by_id": db_attachment.uploaded_by_id,
        },
    }


@router.delete(
    "/{task_id}/attachments/{attachment_id}", summary="Xóa tài liệu đính kèm khỏi Task"
)
def delete_task_attachment(
    task_id: int,
    attachment_id: int,
    current_user: Employee = Depends(RequireEmployee),  # Cho phép cả Employee
    db: Session = Depends(get_db),
):
    attachment = db.get(TaskAttachment, attachment_id)
    if attachment is None or attachment.task_id != task_id:
        raise HTTPException(
            status_code=404, detail="Không tìm thấy tài liệu đính kèm này cho Task!"
        )

    # Phân quyền xóa tài liệu đính kèm: Người upload OR Người được gán task OR Admin/Manager
    from app.core.constants import ROLE_ADMIN, ROLE_MANAGER

    is_uploader = attachment.uploaded_by_id == current_user.id

    from app.models.task_assignment import TaskAssignment
    from sqlalchemy import select

    is_assigned = (
        db.scalar(
            select(TaskAssignment).where(
                TaskAssignment.task_id == task_id,
                TaskAssignment.employee_id == current_user.id,
            )
        )
        is not None
    )

    is_manager_or_admin = current_user.role_id in {ROLE_ADMIN, ROLE_MANAGER}

    if not (is_uploader or is_assigned or is_manager_or_admin):
        raise HTTPException(
            status_code=403, detail="Bạn không có quyền xóa tài liệu đính kèm này."
        )

    if attachment.file_path:
        local_path = attachment.file_path.lstrip("/")
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception as e:
                from app.core.logger import app_logger

                app_logger.error(f"Lỗi xóa file vật lý: {e}")

    db.delete(attachment)
    db.commit()

    task = db.get(Task, task_id)
    from app.cache import CacheInvalidator

    if task:
        CacheInvalidator.invalidate_task(
            task_id, project_id=task.project_id, employee_id=task.employee_id
        )
    else:
        CacheInvalidator.invalidate_task(task_id)

    return {"success": True, "message": "Xóa tài liệu đính kèm thành công!"}
