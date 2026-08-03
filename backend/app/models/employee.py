from datetime import date, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.notification_preference import NotificationPreference

from sqlalchemy import (
    String,
    Unicode,
    UnicodeText,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    text,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_code: Mapped[str] = mapped_column(String(30), unique=True)

    full_name: Mapped[str] = mapped_column(Unicode(150))

    email: Mapped[str] = mapped_column(String(255), unique=True)

    phone: Mapped[str | None] = mapped_column(Unicode(50))

    gender: Mapped[str | None] = mapped_column(Unicode(30))

    address: Mapped[str | None] = mapped_column(UnicodeText)

    date_of_birth: Mapped[date | None] = mapped_column(Date)

    start_date: Mapped[date | None] = mapped_column(Date)

    password_hash: Mapped[str]

    avatar_url: Mapped[str | None]
    is_first_login: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("1")
    )
    login_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    last_login: Mapped[datetime | None]
    last_logout: Mapped[datetime | None]

    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))

    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"))

    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))

    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))

    job_title: Mapped[str | None] = mapped_column(Unicode(150))

    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("1"))

    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    updated_at: Mapped[datetime | None]

    manager = relationship("Employee", remote_side=[id])
    department = relationship("Department", foreign_keys=[department_id])
    team = relationship("Team", foreign_keys=[team_id])

    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="employee", cascade="all, delete-orphan"
    )

    notification_preferences: Mapped[list["NotificationPreference"]] = relationship(
        "NotificationPreference",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    @property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None

    @property
    def team_name(self) -> str | None:
        return self.team.name if self.team else None

    @property
    def position(self) -> str | None:
        return self.job_title

