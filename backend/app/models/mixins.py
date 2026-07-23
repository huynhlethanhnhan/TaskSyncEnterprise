# 📂 FILE: app/models/mixins.py
from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional


class AuditMixin:
    """
    Mixin Enterprise cung cấp cơ chế Ghi vết (Audit Log) và Xóa mềm (Soft Delete).
    Các model như Employee, Project, Task sẽ kế thừa từ lớp này.
    """

    # Trạng thái xóa mềm
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, server_default=text("0"), default=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Vết người tạo / sửa / xóa liên kết tới bảng employees
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    updated_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    deleted_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
