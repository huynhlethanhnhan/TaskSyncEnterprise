# 📂 FILE: app/models/refresh_token.py
from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE")
    )
    token: Mapped[str] = mapped_column(
        String(500)
    )  # Sử dụng String với độ dài lớn thay cho hàm text
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    is_revoked: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    employee = relationship("Employee")
