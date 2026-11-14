# 📂 FILE: app/core/security.py
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
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

    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM
    )
    return encoded_jwt


# 2. Sinh Refresh Token (Thời hạn dài: 7 ngày)
def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": str(
            uuid.uuid4()
        ),  # Unique token ID to guarantee distinct JWT signatures
        "exp": expire,
    }
    encoded_jwt = jwt.encode(
        payload, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def password_fingerprint(password_hash: str) -> str:
    """Return a short hash-bound fingerprint so reset tokens self-invalidate once used."""
    return hashlib.sha256((password_hash or "").encode("utf-8")).hexdigest()[:16]


def create_password_reset_token(
    employee_id: int,
    email: str,
    pwd_fingerprint: str,
    expires_minutes: int = 30,
) -> str:
    """Create a short-lived signed JWT scoped to password reset."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {
        "sub": str(employee_id),
        "email": email,
        "fp": pwd_fingerprint,
        "type": "password_reset",
        "jti": str(uuid.uuid4()),
        "exp": expire,
    }
    return jwt.encode(
        payload, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM
    )


def verify_password_reset_token(token: str) -> dict | None:
    """Decode and validate a signed password-reset JWT, returning None if invalid or expired."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != "password_reset" or not payload.get("sub"):
            return None
        return payload
    except JWTError:
        return None


def generate_temporary_password(length: int = 12) -> str:
    """Generate a cryptographically random temporary password satisfying complexity policy."""
    upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    lower = "abcdefghijkmnopqrstuvwxyz"
    digits = "23456789"
    special = "@#$%&*!"
    required = [
        secrets.choice(upper),
        secrets.choice(lower),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    pool = upper + lower + digits + special
    remaining = [secrets.choice(pool) for _ in range(max(length, 10) - len(required))]
    chars = required + remaining
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)
