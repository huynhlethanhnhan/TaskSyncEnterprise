from datetime import date, datetime

from sqlalchemy import (
    String,
    Unicode,
    UnicodeText,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Boolean,
    text,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)

    project_code: Mapped[str] = mapped_column(String(30), unique=True)

    name: Mapped[str] = mapped_column(Unicode(200))

    description: Mapped[str | None] = mapped_column(UnicodeText)

    start_date: Mapped[date | None] = mapped_column(Date)

    end_date: Mapped[date | None] = mapped_column(Date)

    status: Mapped[str] = mapped_column(Unicode(30), server_default=text("N'Planning'"))

    priority: Mapped[str] = mapped_column(Unicode(20), server_default=text("N'Medium'"))

    budget: Mapped[float | None] = mapped_column(Numeric(18, 2))

    progress_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0")
    )

    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", name="fk_projects_department_id_departments"),
        nullable=True,
        index=True,
    )
    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id", name="fk_projects_team_id_teams"),
        nullable=True,
        index=True,
    )

    created_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))

    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    updated_at: Mapped[datetime | None]

    department = relationship("Department", foreign_keys=[department_id])
    team = relationship("Team", foreign_keys=[team_id])

    members = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def department_name(self) -> str | None:
        return self.department.name if self.department else None

    @property
    def team_name(self) -> str | None:
        return self.team.name if self.team else None
