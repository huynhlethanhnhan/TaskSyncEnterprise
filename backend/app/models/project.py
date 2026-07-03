from datetime import date, datetime

from sqlalchemy import (
    String,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    Boolean,
    Text,
    text
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)

    project_code: Mapped[str] = mapped_column(
        String(30),
        unique=True
    )

    name: Mapped[str] = mapped_column(
        String(200)
    )

    description: Mapped[str | None] = mapped_column(
        Text
    )

    start_date: Mapped[date | None] = mapped_column(Date)

    end_date: Mapped[date | None] = mapped_column(Date)

    status: Mapped[str] = mapped_column(
        String(30),
        server_default=text("'Planning'")
    )

    priority: Mapped[str] = mapped_column(
        String(20),
        server_default=text("'Medium'")
    )

    budget: Mapped[float | None] = mapped_column(
        Numeric(18, 2)
    )

    progress_percent: Mapped[float] = mapped_column(
        Numeric(5, 2),
        server_default=text("0")
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id")
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        server_default=text("0")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("GETDATE()")
    )

    updated_at: Mapped[datetime | None]

    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan"
    )