import random
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.employee import Employee

NOTIF_TYPES = [
    ("TASKS", "Bạn được gán công việc mới", "Quản lý đã phân công cho bạn task #{id}."),
    (
        "TASKS",
        "Cảnh báo hạn chót công việc",
        "Task #{id} sắp đến hạn hoàn thành trong 24h tới.",
    ),
    (
        "TASKS",
        "Task đã quá hạn",
        "Công việc #{id} của bạn đã vượt quá hạn chót quy định.",
    ),
    (
        "PROJECTS",
        "Sprint mới đã được kích hoạt",
        "Sprint chu kỳ phát triển mới đã bắt đầu.",
    ),
    ("PROJECTS", "Cập nhật dự án", "Thông tin dự án của bạn đã được điều chỉnh."),
]


def seed_notifications(db: Session, employees: list[Employee]) -> int:
    random.seed(2026)
    now = datetime.now(UTC).replace(tzinfo=None)
    count = 0

    for emp in employees[:20]:
        num_notifs = random.randint(2, 4)
        for _ in range(num_notifs):
            ntype, title, template = random.choice(NOTIF_TYPES)
            is_read = random.choice([True, False])
            created = now - timedelta(hours=random.randint(1, 72))

            notif = Notification(
                employee_id=emp.id,
                type=ntype,
                title=title,
                message=template.format(id=random.randint(100, 999)),
                status="READ" if is_read else "PENDING",
                channel="IN_APP",
                created_at=created,
            )
            db.add(notif)
            count += 1
    db.commit()
    return count
