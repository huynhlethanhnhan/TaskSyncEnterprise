from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Unicode, UnicodeText, Integer, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.mixins import AuditMixin


class Sprint(AuditMixin, Base):
    __tablename__ = "sprints"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    name: Mapped[str] = mapped_column(Unicode(150))
    goal: Mapped[str | None] = mapped_column(UnicodeText, nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(
        Unicode(30), server_default=text("N'Planned'"), default="Planned"
    )
    capacity: Mapped[int] = mapped_column(Integer, server_default=text("0"), default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    project = relationship("Project")
    backlog_items = relationship(
        "BacklogItem", back_populates="sprint", cascade="all, delete-orphan"
    )
    tasks = relationship("Task", back_populates="sprint")
