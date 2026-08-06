from datetime import datetime

from sqlalchemy import ForeignKey, DateTime, UniqueConstraint, text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "employee_id",
            name="uq_project_members_project_employee",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))

    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    joined_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )

    project = relationship("Project", back_populates="members")
