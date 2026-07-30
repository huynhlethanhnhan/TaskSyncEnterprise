from datetime import datetime
from sqlalchemy import String, Unicode, UnicodeText, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str | None] = mapped_column(UnicodeText)
    description: Mapped[str | None] = mapped_column(Unicode(255))
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()"), onupdate=datetime.utcnow
    )
