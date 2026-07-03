# 📂 FILE: app/models/user_session.py
from datetime import datetime
from sqlalchemy import ForeignKey, Boolean, DateTime, String, text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    access_token: Mapped[str] = mapped_column(String(500))   # Sử dụng String(500)
    refresh_token: Mapped[str] = mapped_column(String(500))  # Sử dụng String(500)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("GETDATE()"))