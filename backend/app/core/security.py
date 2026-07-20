# 📂 FILE: app/core/security.py
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt
from app.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


# 1. Sinh Access Token (Thời hạn ngắn: 15-30 phút)
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM
    )
    return encoded_jwt


# 2. Sinh Refresh Token (Thời hạn dài: 7 ngày) - MỚI BỔ SUNG
def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )  # Sống theo cấu hình settings
    payload = {
        "sub": str(user_id),
        "type": "refresh",  # Đánh dấu đây là mã gia hạn, không phải mã truy cập
        "exp": expire,
    }
    encoded_jwt = jwt.encode(
        payload, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM
    )
    return encoded_jwt
