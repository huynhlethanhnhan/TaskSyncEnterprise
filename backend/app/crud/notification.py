# 📂 FILE: app/crud/notification.py
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.notification import Notification


def get_by_employee(db: Session, employee_id: int):
    stmt = (
        select(Notification)
        .where(Notification.employee_id == employee_id)
        .order_by(Notification.created_at.desc())
    )
    return db.scalars(stmt).all()


def get_by_id(db: Session, notification_id: int):
    return db.get(Notification, notification_id)


def mark_as_read(db: Session, notification: Notification):
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def create(db: Session, title: str, message: str, employee_id: int):
    obj = Notification(title=title, message=message, employee_id=employee_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    # CRUD endpoints run in FastAPI worker threads. Schedule the push on the
    # main WebSocket event loop so every open browser session for this user is
    # refreshed immediately. The database record remains the source of truth
    # when the recipient is offline.
    from app.services.notification.websocket_manager import websocket_manager

    websocket_manager.send_private_notification_threadsafe(
        employee_id,
        {
            "id": obj.id,
            "title": title,
            "message": message,
            "channel": "WEBSOCKET",
        },
    )
    return obj


create_notification = create
