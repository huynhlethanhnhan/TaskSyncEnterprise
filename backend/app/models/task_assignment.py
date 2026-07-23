from datetime import datetime

from sqlalchemy import ForeignKey, DateTime, text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    task = relationship("Task", back_populates="assignments")
