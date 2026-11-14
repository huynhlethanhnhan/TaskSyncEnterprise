import json
from datetime import datetime, timezone
from urllib.parse import urlparse
from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.core.constants import ROLE_ADMIN
from app.core.logger import app_logger
from app.core.security import (
    create_password_reset_token,
    get_password_hash,
    password_fingerprint,
)
from app.models.department import Department
from app.models.employee import Employee
from app.models.notification import Notification
from app.models.user_session import UserSession
from app.services.email.dto import EmailMessage
from app.services.email.service import EmailService

PASSWORD_RESET_NOTIFICATION_TYPE = "PASSWORD_RESET_REQUEST"


def resolve_frontend_origin(request: Request | None) -> str:
    """Determine the frontend origin from request headers or default local dev URL."""
    if request is not None:
        origin = (request.headers.get("origin") or "").strip().rstrip("/")
        if origin.startswith("http://") or origin.startswith("https://"):
            return origin
        referer = (request.headers.get("referer") or "").strip()
        if referer:
            parsed = urlparse(referer)
            if parsed.scheme in {"http", "https"} and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
    return "http://localhost:5173"


def build_reset_link(request: Request | None, employee: Employee) -> str:
    """Build a short-lived signed reset URL for an employee."""
    token = create_password_reset_token(
        employee_id=employee.id,
        email=employee.email,
        pwd_fingerprint=password_fingerprint(employee.password_hash),
    )
    origin = resolve_frontend_origin(request)
    return f"{origin}/reset-password?token={token}"


def _parse_context(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def mark_reset_requests_resolved(db: Session, employee_id: int) -> None:
    """Mark all open password reset notifications for the employee as resolved and read."""
    event_key = f"pwd-reset-{employee_id}"
    rows = db.scalars(
        select(Notification).where(
            Notification.type == PASSWORD_RESET_NOTIFICATION_TYPE,
            Notification.event_id == event_key,
        )
    ).all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for row in rows:
        ctx = _parse_context(row.context_json)
        if not ctx.get("resolved"):
            ctx["resolved"] = True
            ctx["resolved_at"] = now.isoformat()
            row.context_json = json.dumps(ctx, ensure_ascii=False)
        if not row.is_read:
            row.is_read = True
            row.status = "READ"
            row.read_at = now
        row.updated_at = now


def list_pending_reset_requests(db: Session) -> list[dict]:
    """Return deduplicated unresolved employee password-reset requests ordered newest first."""
    notif_rows = db.scalars(
        select(Notification)
        .where(Notification.type == PASSWORD_RESET_NOTIFICATION_TYPE)
        .order_by(Notification.created_at.desc())
    ).all()

    latest_by_requester: dict[int, tuple[Notification, dict]] = {}
    for row in notif_rows:
        ctx = _parse_context(row.context_json)
        if ctx.get("resolved"):
            continue
        requester_id = ctx.get("requester_id")
        if not isinstance(requester_id, int):
            continue
        if requester_id not in latest_by_requester:
            latest_by_requester[requester_id] = (row, ctx)

    if not latest_by_requester:
        return []

    emp_ids = list(latest_by_requester.keys())
    employees = db.scalars(
        select(Employee).where(
            Employee.id.in_(emp_ids),
            Employee.is_deleted == False,  # noqa: E712
        )
    ).all()
    emp_map = {emp.id: emp for emp in employees}

    dept_ids = {emp.department_id for emp in employees if emp.department_id is not None}
    dept_map: dict[int, str] = {}
    if dept_ids:
        depts = db.scalars(select(Department).where(Department.id.in_(dept_ids))).all()
        dept_map = {dept.id: dept.name for dept in depts}

    results: list[dict] = []
    for requester_id, (row, ctx) in latest_by_requester.items():
        emp = emp_map.get(requester_id)
        if emp is None:
            continue
        results.append(
            {
                "employee_id": emp.id,
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
                "email": emp.email,
                "department_name": (
                    dept_map.get(emp.department_id) if emp.department_id else None
                ),
                "avatar_url": emp.avatar_url,
                "note": ctx.get("note"),
                "requested_at": (
                    row.created_at.isoformat()
                    if row.created_at
                    else ctx.get("requested_at")
                ),
                "notification_id": row.id,
            }
        )
    return results


def notify_admins_password_reset_request(
    db: Session,
    employee: Employee,
    note: str | None = None,
) -> tuple[list[int], dict]:
    """Create or refresh in-app password reset request notifications for every active Admin."""
    admins = db.scalars(
        select(Employee).where(
            Employee.role_id == ROLE_ADMIN,
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
    ).all()

    dept_name = None
    if employee.department_id is not None:
        dept = db.get(Department, employee.department_id)
        if dept is not None:
            dept_name = dept.name

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    clean_note = note.strip() if note and note.strip() else None
    event_key = f"pwd-reset-{employee.id}"
    dept_suffix = f" ({dept_name})" if dept_name else ""
    note_suffix = f" · Ghi chú: {clean_note}" if clean_note else ""
    message = (
        f"Nhân viên {employee.full_name} [{employee.employee_code}] ({employee.email}){dept_suffix} "
        f"vừa gửi yêu cầu đặt lại mật khẩu.{note_suffix}"
    )
    payload_ctx = {
        "requester_id": employee.id,
        "requester_code": employee.employee_code,
        "requester_name": employee.full_name,
        "requester_email": employee.email,
        "department_name": dept_name,
        "note": clean_note,
        "requested_at": now.isoformat(),
        "resolved": False,
    }
    ctx_str = json.dumps(payload_ctx, ensure_ascii=False)

    notified_admin_ids: list[int] = []
    for admin in admins:
        if admin.id == employee.id:
            continue
        existing = db.scalars(
            select(Notification).where(
                Notification.employee_id == admin.id,
                Notification.type == PASSWORD_RESET_NOTIFICATION_TYPE,
                Notification.event_id == event_key,
            )
        ).first()
        if existing is not None:
            existing.title = "Yêu cầu đặt lại mật khẩu"
            existing.message = message[:1000]
            existing.priority = "HIGH"
            existing.status = "SENT"
            existing.is_read = False
            existing.read_at = None
            existing.context_json = ctx_str
            existing.created_at = now
            existing.updated_at = now
        else:
            db.add(
                Notification(
                    employee_id=admin.id,
                    type=PASSWORD_RESET_NOTIFICATION_TYPE,
                    title="Yêu cầu đặt lại mật khẩu",
                    message=message[:1000],
                    priority="HIGH",
                    status="SENT",
                    channel="IN_APP",
                    event_id=event_key,
                    context_json=ctx_str,
                    is_read=False,
                    created_at=now,
                    updated_at=now,
                )
            )
        notified_admin_ids.append(admin.id)

    return notified_admin_ids, payload_ctx


def apply_password_change(
    db: Session,
    employee: Employee,
    new_password: str,
    *,
    force_first_login: bool,
) -> None:
    """Update password hash, revoke active sessions, clear open reset requests, and invalidate caches."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    employee.password_hash = get_password_hash(new_password)
    employee.is_first_login = force_first_login
    employee.updated_at = now

    db.execute(
        update(UserSession)
        .where(
            UserSession.employee_id == employee.id,
            UserSession.is_active == True,  # noqa: E712
        )
        .values(is_active=False)
    )
    mark_reset_requests_resolved(db, employee.id)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_employee(employee.id)


def try_send_password_reset_email(
    recipient_email: str,
    recipient_name: str,
    *,
    reset_link: str | None = None,
    temporary_password: str | None = None,
) -> bool:
    """Best-effort dispatch of password reset email when SMTP credentials are configured."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        return False

    try:
        service = EmailService()
        if temporary_password:
            subject = "[TaskSync Enterprise] Mật khẩu đăng nhập tạm thời mới"
            body_html = (
                f"<p>Xin chào <strong>{recipient_name}</strong>,</p>"
                "<p>Quản trị viên hệ thống đã đặt lại mật khẩu tài khoản TaskSync Enterprise cho bạn.</p>"
                f"<p><strong>Mật khẩu tạm thời:</strong> <code>{temporary_password}</code></p>"
                + (
                    f'<p>Hoặc tự đặt mật khẩu mới tại: <a href="{reset_link}">{reset_link}</a></p>'
                    if reset_link
                    else ""
                )
            )
        else:
            subject = "[TaskSync Enterprise] Đặt lại mật khẩu tài khoản"
            body_html = (
                f"<p>Xin chào <strong>{recipient_name}</strong>,</p>"
                "<p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>"
                f'<p>Nhấn vào liên kết sau (hiệu lực 30 phút): <a href="{reset_link}">{reset_link}</a></p>'
            )

        msg = EmailMessage(
            recipient_email=recipient_email,
            subject=subject,
            html_body=body_html,
            text_body=subject,
        )
        result = service.send_email_with_retry(msg, max_retries=1)
        return bool(getattr(result, "success", False))
    except Exception as exc:
        app_logger.warning("Password reset email dispatch skipped/failed: %s", exc)
        return False
