import json
from datetime import datetime

from fastapi.responses import JSONResponse
from sqlalchemy.dialects import mssql

from app.models.employee import Employee
from app.models.task import Task
from app.schemas.notification import NotificationResponse

VIETNAMESE_SAMPLES = [
    "Tái cấu trúc UI Dashboard Figma",
    "Xác minh lược đồ cơ sở dữ liệu SQL Server",
    "Huỳnh Lê Thành Nhân",
    "Tất cả phòng ban",
    "Theo dõi trạng thái công việc",
]


def test_vietnamese_survives_json_serialization() -> None:
    encoded = json.dumps(VIETNAMESE_SAMPLES, ensure_ascii=False).encode("utf-8")
    assert json.loads(encoded.decode("utf-8")) == VIETNAMESE_SAMPLES


def test_json_response_declares_utf8_compatible_media_type() -> None:
    response = JSONResponse({"values": VIETNAMESE_SAMPLES})
    assert response.media_type == "application/json"
    assert response.body.decode("utf-8")


def test_sql_server_business_columns_compile_to_nvarchar() -> None:
    dialect = mssql.dialect()
    employee_name = Employee.__table__.c.full_name.type.compile(dialect=dialect)
    task_title = Task.__table__.c.title.type.compile(dialect=dialect)
    task_description = Task.__table__.c.description.type.compile(dialect=dialect)
    assert employee_name == "NVARCHAR(150)"
    assert task_title == "NVARCHAR(200)"
    assert task_description == "NTEXT"


def test_notification_naive_database_datetime_serializes_as_utc() -> None:
    notification = NotificationResponse(
        id=1,
        employee_id=1,
        type="SYSTEM",
        title="Thông báo mới",
        message="Thời gian phải đúng trên trình duyệt.",
        priority="NORMAL",
        status="SENT",
        channel="IN_APP",
        is_read=False,
        created_at=datetime(2026, 7, 22, 8, 30, 0),
    )

    assert notification.model_dump(mode="json")["created_at"] == "2026-07-22T08:30:00Z"
