# 📂 FILE: app/routers/v1/auth.py
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from pydantic import BaseModel, ConfigDict, EmailStr

from app.database import get_db
from app.models.employee import Employee
from app.models.refresh_token import RefreshToken
from app.models.token_blacklist import TokenBlacklist
from app.models.user_session import UserSession
from app.models.audit import AuditLog
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    get_password_hash,
)
from app.core.deps import get_current_user, oauth2_scheme
from app.core.constants import ROLE_MAP
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- SCHEMAS ---
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    name: str
    role_id: int
    role: str
    avatar_url: str | None = None
    login_count: int = 0
    last_login: datetime | None = None
    last_logout: datetime | None = None
    is_first_login: bool = False

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(TokenResponse):
    user: UserInfo
    is_first_login: bool


class RefreshRequest(BaseModel):
    refresh_token: str


class SessionResponse(BaseModel):
    id: int
    ip_address: str | None
    user_agent: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str | None = None


@router.post("/login", response_model=LoginResponse)
def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    c_id = form_data.client_id.strip() if form_data.client_id else ""
    c_secret = form_data.client_secret.strip() if form_data.client_secret else ""
    if c_id and c_id != "string":
        if (
            c_id != settings.MSSQL_CLIENT_ID
            or c_secret != settings.MSSQL_CLIENT_SECRET.get_secret_value()
        ):
            raise HTTPException(status_code=401, detail="Ứng dụng khách không hợp lệ!")

    stmt = select(Employee).where(Employee.email == form_data.username)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=401, detail="Email hoặc mật khẩu không chính xác!"
        )

    user.last_login = datetime.now(timezone.utc)
    user.login_count = (user.login_count or 0) + 1
    if user.is_first_login is None:
        user.is_first_login = True

    new_log = AuditLog(employee_id=user.id, employee_email=user.email, action="LOGIN")
    db.add(new_log)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role_id}
    )
    refresh_token = create_refresh_token(user_id=user.id)

    ip_address = request.client.host if request.client else "Unknown"
    user_agent = request.headers.get("user-agent", "Unknown")
    expire_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )

    db.add(RefreshToken(employee_id=user.id, token=refresh_token, expires_at=expire_at))
    db.add(
        UserSession(
            employee_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            is_active=True,
        )
    )

    db.commit()
    db.refresh(user)

    role_name = ROLE_MAP.get(user.role_id, "employee")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "name": user.full_name,
            "role_id": user.role_id,
            "role": role_name,
            "avatar_url": user.avatar_url,
            "login_count": user.login_count,
            "last_login": user.last_login,
            "last_logout": user.last_logout,
            "is_first_login": bool(user.is_first_login),
        },
        "is_first_login": bool(user.is_first_login),
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(req_data: RefreshRequest, db: Session = Depends(get_db)):
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(
            req_data.refresh_token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
        )
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ!")

    db_token = db.scalars(
        select(RefreshToken).where(RefreshToken.token == req_data.refresh_token)
    ).first()
    if not db_token or db_token.is_revoked:
        raise HTTPException(status_code=401, detail="Token đã bị vô hiệu hóa!")

    user = db.scalars(
        select(Employee).where(Employee.id == int(user_id))
    ).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc bị khóa!")

    db_token.is_revoked = True

    new_access = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role_id}
    )
    new_refresh = create_refresh_token(user_id=user.id)

    db.add(
        RefreshToken(
            employee_id=user.id,
            token=new_refresh,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.execute(
        update(UserSession)
        .where(UserSession.refresh_token == req_data.refresh_token)
        .values(access_token=new_access, refresh_token=new_refresh)
    )

    db.commit()
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout_user(
    current_user: Employee = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    db.add(
        TokenBlacklist(
            token=token, token_type="access", expired_at=datetime.now(timezone.utc)
        )
    )
    session_obj = db.execute(
        select(UserSession).where(UserSession.access_token == token)
    ).scalar_one_or_none()
    if session_obj:
        session_obj.is_active = False
        employee = db.get(Employee, session_obj.employee_id)
        if employee:
            employee.last_logout = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Đăng xuất thành công"}


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác!")
    if data.confirm_password is not None and data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400, detail="Mật khẩu mới và xác nhận không khớp!"
        )

    current_user.password_hash = get_password_hash(data.new_password)
    current_user.is_first_login = False
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Mật khẩu đã được cập nhật thành công."}


@router.get("/sessions", response_model=list[SessionResponse])
def get_user_sessions(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(UserSession)
        .where(UserSession.employee_id == current_user.id, UserSession.is_active == True)
        .order_by(UserSession.created_at.desc())
    )
    return db.scalars(stmt).all()


@router.post("/sessions/logout-others")
def logout_other_sessions(
    current_user: Employee = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    stmt = (
        update(UserSession)
        .where(
            UserSession.employee_id == current_user.id,
            UserSession.access_token != token,
            UserSession.is_active == True,
        )
        .values(is_active=False)
    )
    db.execute(stmt)
    db.commit()
    return {"message": "Đã đăng xuất khỏi tất cả các thiết bị khác thành công."}


@router.get("/me")
def get_me(current_user: Employee = Depends(get_current_user)):
    role_name = ROLE_MAP.get(current_user.role_id, "employee")
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "name": current_user.full_name,
        "role_id": current_user.role_id,
        "role": role_name,
        "avatar_url": current_user.avatar_url,
        "login_count": current_user.login_count,
        "last_login": current_user.last_login,
        "last_logout": current_user.last_logout,
        "is_first_login": bool(current_user.is_first_login),
    }
