from datetime import datetime

from sqlalchemy import ForeignKey, UnicodeText, DateTime, text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(primary_key=True)

    task_id = mapped_column(ForeignKey("tasks.id"))

    employee_id = mapped_column(ForeignKey("employees.id"))

    content: Mapped[str] = mapped_column(UnicodeText)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    task = relationship("Task", back_populates="comments")
