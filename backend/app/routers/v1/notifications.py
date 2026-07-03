# 📂 FILE: app/routers/v1/notifications.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.employee import Employee
from app.schemas.notification import NotificationResponse
from app.crud import notification as notification_crud

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách thông báo của nhân viên hiện tại
    """
    return notification_crud.get_by_employee(db, employee_id=current_user.id)

@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Đánh dấu thông báo là đã đọc
    """
    notification = notification_crud.get_by_id(db, notification_id=id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thông báo không tồn tại"
        )
    if notification.employee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền đọc thông báo này"
        )
    return notification_crud.mark_as_read(db, notification=notification)
