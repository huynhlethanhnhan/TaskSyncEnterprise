from datetime import datetime
from sqlalchemy import (
    String,
    Unicode,
    UnicodeText,
    Boolean,
    DateTime,
    Integer,
    ForeignKey,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)

    department_code: Mapped[str] = mapped_column(String(30), unique=True)

    name: Mapped[str] = mapped_column(Unicode(100), unique=True)

    description: Mapped[str | None] = mapped_column(UnicodeText)

    manager_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "employees.id",
            name="fk_departments_manager_id_employees",
            use_alter=True,
        ),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("1"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    manager = relationship("Employee", foreign_keys=[manager_id])
