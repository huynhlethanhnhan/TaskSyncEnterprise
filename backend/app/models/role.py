from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)

    role_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True
    )

    description: Mapped[str | None] = mapped_column(
        String(255)
    )

    is_system: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("0")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()")
    )