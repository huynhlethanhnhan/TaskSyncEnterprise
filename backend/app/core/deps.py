# ⚙️ FILE: app/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.employee import Employee
from app.models.token_blacklist import TokenBlacklist # <-- Import model danh sách đen
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE, ROLE_MAP

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> Employee:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập hoặc Token đã hết hạn!",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # 🛡️ KIỂM TRA TẤM KHIÊN BLACKLIST (MỚI)
    # Nếu token của request nằm trong danh sách đen -> đá văng người dùng ra ngoài
    stmt_blacklist = select(TokenBlacklist).where(TokenBlacklist.token == token)
    is_blacklisted = db.execute(stmt_blacklist).scalar_one_or_none()
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã Token này đã bị vô hiệu hóa (Đã Đăng xuất)!"
        )
        
    stmt = select(Employee).where(Employee.id == int(user_id))
    user = db.execute(stmt).scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user


# Xưởng sản xuất chốt chặn giữ nguyên
def require_roles(allowed_roles: list[int | str]):
    def checker(current_user: Employee = Depends(get_current_user)):
        roles = allowed_roles
        print(f"Current User Role: {current_user.role_id} - Allowed Roles: {roles}")
        
        user_role_id = current_user.role_id
        user_role_name = ROLE_MAP.get(user_role_id, "").lower()
        
        allowed_normalized = []
        for r in allowed_roles:
            if isinstance(r, str):
                allowed_normalized.append(r.lower())
                try:
                    allowed_normalized.append(int(r))
                except ValueError:
                    pass
            else:
                allowed_normalized.append(r)
                allowed_normalized.append(str(r))
                
        if user_role_id not in allowed_normalized and user_role_name not in allowed_normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Quyền truy cập bị từ chối! Bạn không có thẩm quyền thực hiện thao tác này."
            )
        return current_user
    return checker

RequireAdmin = require_roles([ROLE_ADMIN])
RequireManager = require_roles([ROLE_ADMIN, ROLE_MANAGER])
RequireEmployee = require_roles([ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE])