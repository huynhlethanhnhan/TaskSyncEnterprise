# 📂 FILE: app/routers/v1/notifications.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.employee import Employee
from app.core.response_builder import ResponseBuilder
from app.schemas.response import SuccessResponse, PagedResponse
from app.schemas.pagination import PaginationParams, BaseFilterParams, SortParams
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services.notification_service import notification_service

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "",
    response_model=PagedResponse[NotificationResponse]
)
def get_my_notifications(
    pagination_params: PaginationParams = Depends(),
    filter_params: BaseFilterParams = Depends(),
    sort_params: SortParams = Depends(),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Retrieves a paginated list of notifications for the authenticated employee.
    Integrates searching, sorting, and pagination.
    """
    items, total = notification_service.get_user_notifications(
        db=db,
        employee_id=current_user.id,
        pagination_params=pagination_params,
        filter_params=filter_params,
        sort_params=sort_params
    )
    return ResponseBuilder.pagination(
        items=items,
        page=pagination_params.page,
        size=pagination_params.size,
        total=total,
        message="Notifications retrieved successfully."
    )


@router.get(
    "/unread-count",
    response_model=SuccessResponse[UnreadCountResponse]
)
def get_my_unread_count(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Retrieves the count of unread notifications for the authenticated employee.
    """
    count = notification_service.get_unread_count(db, current_user.id)
    return ResponseBuilder.success(
        data={"unread_count": count},
        message="Unread notification count retrieved successfully."
    )


@router.patch(
    "/{notification_id:int}/read",
    response_model=SuccessResponse[NotificationResponse]
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Marks a specific notification as read, validating ownership.
    """
    notification = notification_service.mark_as_read(db, notification_id, current_user.id)
    return ResponseBuilder.success(
        data=notification,
        message="Notification marked as read successfully."
    )


@router.patch(
    "/read-all",
    response_model=SuccessResponse[dict]
)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    """
    Marks all notifications for the authenticated employee as read.
    """
    count = notification_service.mark_all_as_read(db, current_user.id)
    return ResponseBuilder.success(
        data={"marked_read_count": count},
        message="All notifications marked as read successfully."
    )