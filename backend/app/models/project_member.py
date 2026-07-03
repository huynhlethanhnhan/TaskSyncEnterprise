from datetime import datetime

from sqlalchemy import (
    ForeignKey,
    DateTime,
    text
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from app.database import Base


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(primary_key=True)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id")
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id")
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("GETDATE()")
    )

    project = relationship(
        "Project",
        back_populates="members"
    )