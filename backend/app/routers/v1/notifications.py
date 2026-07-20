# 📂 FILE: app/routers/v1/notifications.py
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.employee import Employee
from app.models.notification import Notification
from app.core.response_builder import ResponseBuilder
from app.schemas.response import SuccessResponse, PagedResponse
from app.schemas.pagination import PaginationParams, BaseFilterParams, SortParams
from app.schemas.notification import (
    NotificationResponse,
    UnreadCountResponse,
    PreferenceResponse,
    UpdatePreferencesRequest,
)
from app.services.notification_service import notification_service
from app.repositories.notification_repository import notification_repo
from app.core.constants import ROLE_ADMIN

# Central notifications router
router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Central notification preferences router
preferences_router = APIRouter(
    prefix="/notification-preferences", tags=["Notification Preferences"]
)


@router.get(
    "",
    response_model=PagedResponse[NotificationResponse],
    summary="List employee notifications",
    description="Retrieves a paginated list of notifications for the user, with searching, sorting, and specific filters.",
)
def get_my_notifications(
    unread_only: Optional[bool] = None,
    priority: Optional[str] = None,
    type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    employee_id: Optional[int] = None,
    pagination_params: PaginationParams = Depends(),
    filter_params: BaseFilterParams = Depends(),
    sort_params: SortParams = Depends(),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # RBAC IDOR check: Non-admins cannot query notifications for other users
    target_employee_id = current_user.id
    if employee_id is not None:
        if current_user.role_id == ROLE_ADMIN:
            target_employee_id = employee_id
        elif employee_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own notifications.",
            )

    items, total = notification_service.get_user_notifications(
        db=db,
        employee_id=target_employee_id,
        pagination_params=pagination_params,
        filter_params=filter_params,
        sort_params=sort_params,
        unread_only=unread_only,
        priority=priority,
        type=type,
        start_date=start_date,
        end_date=end_date,
    )
    return ResponseBuilder.pagination(
        items=items,
        page=pagination_params.page,
        size=pagination_params.size,
        total=total,
        message="Notifications retrieved successfully.",
    )


@router.get(
    "/unread-count",
    response_model=SuccessResponse[UnreadCountResponse],
    summary="Get unread notifications count",
)
def get_my_unread_count(
    db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)
):
    count = notification_service.get_unread_count(db, current_user.id)
    return ResponseBuilder.success(
        data={"unread_count": count},
        message="Unread notification count retrieved successfully.",
    )


@router.get(
    "/{notification_id:int}",
    response_model=SuccessResponse[NotificationResponse],
    summary="Get notification detail",
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    notification = db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found."
        )

    # RBAC IDOR check: Non-admins can only view their own notifications
    if (
        current_user.role_id != ROLE_ADMIN
        and notification.employee_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own notifications.",
        )

    return ResponseBuilder.success(
        data=notification, message="Notification retrieved successfully."
    )


@router.patch(
    "/{notification_id:int}/read",
    response_model=SuccessResponse[NotificationResponse],
    summary="Mark notification as read",
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    # Retrieve first to perform ownership validation
    notification = db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found."
        )

    if (
        current_user.role_id != ROLE_ADMIN
        and notification.employee_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only modify your own notifications.",
        )

    updated_notif = notification_service.mark_as_read(
        db, notification_id, notification.employee_id
    )
    return ResponseBuilder.success(
        data=updated_notif, message="Notification marked as read successfully."
    )


@router.patch(
    "/read-all",
    response_model=SuccessResponse[dict],
    summary="Mark all notifications as read",
)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)
):
    count = notification_service.mark_all_as_read(db, current_user.id)
    return ResponseBuilder.success(
        data={"marked_read_count": count},
        message="All notifications marked as read successfully.",
    )


@router.delete(
    "/{notification_id:int}",
    response_model=SuccessResponse[dict],
    summary="Delete notification",
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    notification = db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found."
        )

    # RBAC IDOR check: Non-admins can only delete their own notifications
    if (
        current_user.role_id != ROLE_ADMIN
        and notification.employee_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete your own notifications.",
        )

    notification_repo.delete(db, notification)
    return ResponseBuilder.success(
        data={}, message="Notification deleted successfully."
    )


# =========================================================================
# Preferences Endpoints
# =========================================================================


@preferences_router.get(
    "",
    response_model=SuccessResponse[List[PreferenceResponse]],
    summary="Get notification preferences",
)
def get_my_preferences(
    db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)
):
    prefs = notification_repo.get_user_preferences(db, current_user.id)
    return ResponseBuilder.success(
        data=prefs, message="Notification preferences retrieved successfully."
    )


@preferences_router.put(
    "",
    response_model=SuccessResponse[PreferenceResponse],
    summary="Update notification preferences",
)
def update_my_preference(
    data: UpdatePreferencesRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    pref = notification_repo.update_user_preference(
        db=db,
        employee_id=current_user.id,
        notification_type=data.notification_type,
        channel=data.channel,
        enabled=data.enabled,
    )
    return ResponseBuilder.success(
        data=pref, message="Notification preference updated successfully."
    )


# =========================================================================
# WebSocket Notifications Route
# =========================================================================
from fastapi import WebSocket, WebSocketDisconnect
from app.services.notification.websocket_manager import (
    websocket_manager,
    get_websocket_user,
)

ws_router = APIRouter(tags=["WebSocket Notification"])


@ws_router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket, token: Optional[str] = None, db: Session = Depends(get_db)
):
    """
    Authenticated WebSocket server push gateway endpoint.
    Expects JWT token in the query params: /ws/notifications?token=<jwt_token>
    """
    if not token:
        await websocket.accept()
        await websocket.close(code=4008)  # Policy Violation / Unauthorized
        return

    user = get_websocket_user(token, db)
    if not user:
        await websocket.accept()
        await websocket.close(code=4008)  # Policy Violation
        return

    # Connection accepted and registered inside recipient's private pool
    await websocket_manager.connect(websocket, user.id)

    try:
        while True:
            # Heartbeat ping/pong and receive processing
            data = await websocket.receive_text()
            if data in ("ping", "heartbeat"):
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        # Cleanup upon disconnect
        websocket_manager.disconnect(websocket, user.id)
