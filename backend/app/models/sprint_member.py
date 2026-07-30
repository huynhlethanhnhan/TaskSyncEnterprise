from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Integer, DateTime, text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SprintMember(Base):
    __tablename__ = "sprint_members"
    __table_args__ = (
        UniqueConstraint("sprint_id", "employee_id", name="uq_sprint_employee_member"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sprint_id: Mapped[int] = mapped_column(ForeignKey("sprints.id"), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, server_default=text("0"), default=0)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("SYSUTCDATETIME()"),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # Relationships
    sprint = relationship("Sprint", back_populates="members")
    employee = relationship("Employee")
