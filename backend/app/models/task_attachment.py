# 📂 FILE: app/models/task_attachment.py
from datetime import datetime
from sqlalchemy import ForeignKey, String, Integer, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    topic_id: Mapped[int | None] = mapped_column(ForeignKey("discussion_topics.id"), nullable=True)
    reply_id: Mapped[int | None] = mapped_column(ForeignKey("discussion_replies.id"), nullable=True)
    feedback_id: Mapped[int | None] = mapped_column(ForeignKey("user_feedback.id"), nullable=True)

    file_name: Mapped[str] = mapped_column(
        String(255)
    )  # Tên file gốc (VD: bao_cao.pdf)
    file_path: Mapped[str] = mapped_column(
        String(500)
    )  # Đường dẫn vật lý trên server hoặc link MinIO
    file_size: Mapped[int] = mapped_column(Integer)  # Dung lượng file (Bytes)
    mime_type: Mapped[str] = mapped_column(
        String(100)
    )  # Kiểu file (application/pdf, image/png...)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("SYSUTCDATETIME()")
    )
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    # Thiết lập mối quan hệ
    task = relationship(
        "Task",
        back_populates="attachments" if hasattr(Base, "_decl_class_registry") else None,
    )
    topic = relationship("DiscussionTopic")
    reply = relationship("DiscussionReply")
    feedback = relationship("UserFeedback")
