from sqlalchemy import ForeignKey, UnicodeText, Boolean, text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TaskChecklist(Base):
    __tablename__ = "task_checklists"

    id: Mapped[int] = mapped_column(primary_key=True)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"))

    title: Mapped[str] = mapped_column(UnicodeText)

    is_completed: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))

    task = relationship("Task", back_populates="checklists")
