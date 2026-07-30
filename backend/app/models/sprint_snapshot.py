from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey, Date, Integer, DateTime, text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SprintDailySnapshot(Base):
    __tablename__ = "sprint_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    sprint_id: Mapped[int] = mapped_column(ForeignKey("sprints.id", ondelete="CASCADE"))
    snapshot_date: Mapped[date] = mapped_column(Date)
    remaining_story_points: Mapped[int] = mapped_column(Integer, default=0)
    completed_story_points: Mapped[int] = mapped_column(Integer, default=0)
    remaining_tasks: Mapped[int] = mapped_column(Integer, default=0)
    completed_tasks: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    sprint = relationship("Sprint")

    __table_args__ = (
        UniqueConstraint("sprint_id", "snapshot_date", name="uq_sprint_snapshot_date"),
    )
