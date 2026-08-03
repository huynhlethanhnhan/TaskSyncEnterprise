import random
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from app.models.vacation import Vacation
from app.models.employee import Employee
from app.core.constants import ROLE_EMPLOYEE

VACATION_REASONS = [
    "Nghỉ phép hàng năm đi du lịch cùng gia đình.",
    "Bị sốt xuất huyết cần nghỉ điều dưỡng theo chỉ định bác sĩ.",
    "Giải quyết việc cá nhân gia đình tại quê.",
    "Tham gia khóa đào tạo chuyên môn kĩ thuật.",
    "Nghỉ bù ngày làm việc cuối tuần dự án.",
]


def seed_vacations(db: Session, employees: list[Employee]) -> int:
    random.seed(2026)
    now = datetime.now(UTC).replace(tzinfo=None)
    statuses = ["Pending", "Approved", "Rejected", "Withdrawn"]
    count = 0

    target_employees = [e for e in employees if e.role_id == ROLE_EMPLOYEE] or employees

    for _ in range(1, 23):
        emp = random.choice(target_employees)
        start = now + timedelta(days=random.randint(-15, 20))
        end = start + timedelta(days=random.randint(1, 4))
        status = random.choice(statuses)

        vac = Vacation(
            type=random.choice(["Annual Leave", "Sick Leave", "Personal Leave"]),
            start_date=start.date(),
            end_date=end.date(),
            reason=random.choice(VACATION_REASONS),
            status=status,
            requested_by=emp.id,
        )
        db.add(vac)
        count += 1
    db.commit()
    return count
