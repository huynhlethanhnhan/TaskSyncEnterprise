from datetime import datetime

from sqlalchemy import (
    Unicode,
    Integer,
    DateTime,
    ForeignKey,
    UnicodeText,
    Numeric,
    Boolean,
    text,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))

    title: Mapped[str] = mapped_column(Unicode(200))

    description: Mapped[str | None] = mapped_column(UnicodeText)

    priority: Mapped[str] = mapped_column(Unicode(20), server_default=text("N'Medium'"))

    status: Mapped[str] = mapped_column(Unicode(30), server_default=text("N'To Do'"))

    story_points: Mapped[int] = mapped_column(Integer, server_default=text("0"))

    progress_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0")
    )

    deadline: Mapped[datetime | None]

    created_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))

    is_deleted: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    assignments = relationship(
        "TaskAssignment", back_populates="task", cascade="all, delete-orphan"
    )

    comments = relationship(
        "TaskComment", back_populates="task", cascade="all, delete-orphan"
    )

    checklists = relationship(
        "TaskChecklist", back_populates="task", cascade="all, delete-orphan"
    )

    attachments = relationship(
        "TaskAttachment",
        back_populates="task",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def assigned_to(self) -> int | None:
        if self.assignments:
            return self.assignments[0].employee_id
        return None

    @property
    def employee_id(self) -> int | None:
        return self.assigned_to
