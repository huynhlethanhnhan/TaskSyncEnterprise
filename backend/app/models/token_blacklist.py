# 📂 FILE: app/models/token_blacklist.py
from datetime import datetime
from sqlalchemy import DateTime, String, text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(500))  # Sử dụng String(500)
    token_type: Mapped[str] = mapped_column(String(50))  # "access" hoặc "refresh"
    expired_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )
