from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from app.models.sprint import Sprint
from app.models.project import Project

SPRINT_PLANNED = "Planned"
SPRINT_ACTIVE = "Active"
SPRINT_COMPLETED = "Completed"


def seed_sprints(db: Session, projects: list[Project]) -> list[Sprint]:
    now = datetime.now(UTC).replace(tzinfo=None)
    created_sprints = []

    prj_test = next((p for p in projects if p.project_code == "PRJ-SPRINT-TEST"), None)
    if prj_test:
        test_sprints = [
            {
                "name": "Sprint A (Past Completed)",
                "goal": "Hoàn tất giai đoạn khảo sát hạ tầng",
                "status": SPRINT_COMPLETED,
                "start_date": now - timedelta(days=30),
                "end_date": now - timedelta(days=16),
                "capacity": 30,
            },
            {
                "name": "Sprint B (Planned Eligible)",
                "goal": "Sprint Planned sẵn sàng kích hoạt thử nghiệm",
                "status": SPRINT_PLANNED,
                "start_date": now + timedelta(days=1),
                "end_date": now + timedelta(days=15),
                "capacity": 35,
            },
            {
                "name": "Sprint C (Planned Conflict Test)",
                "goal": "Sprint Planned dùng để thử nghiệm lỗi 409 Conflict khi đã có Active Sprint",
                "status": SPRINT_PLANNED,
                "start_date": now + timedelta(days=16),
                "end_date": now + timedelta(days=30),
                "capacity": 25,
            },
        ]
        for sdata in test_sprints:
            sprint = (
                db.query(Sprint)
                .filter_by(project_id=prj_test.id, name=sdata["name"])
                .first()
            )
            if not sprint:
                sprint = Sprint(
                    project_id=prj_test.id,
                    name=sdata["name"],
                    goal=sdata["goal"],
                    status=sdata["status"],
                    start_date=sdata["start_date"],
                    end_date=sdata["end_date"],
                    capacity=sdata["capacity"],
                    is_deleted=False,
                )
                db.add(sprint)
                db.commit()
                db.refresh(sprint)
            created_sprints.append(sprint)

    # For other active projects, add 1 Completed, 1 Active, 1 Planned
    for prj in projects:
        if prj.project_code == "PRJ-SPRINT-TEST":
            continue

        if prj.status == "Active":
            sprint_specs = [
                {
                    "name": f"{prj.project_code} - Sprint 1 (Completed)",
                    "goal": "Khởi chạy phiên bản MVP",
                    "status": SPRINT_COMPLETED,
                    "start_date": now - timedelta(days=28),
                    "end_date": now - timedelta(days=14),
                    "capacity": 30,
                },
                {
                    "name": f"{prj.project_code} - Sprint 2 (Active)",
                    "goal": "Hoàn thiện các tính năng cốt lõi",
                    "status": SPRINT_ACTIVE,
                    "start_date": now - timedelta(days=3),
                    "end_date": now + timedelta(days=11),
                    "capacity": 40,
                },
                {
                    "name": f"{prj.project_code} - Sprint 3 (Planned)",
                    "goal": "Tối ưu hóa hiệu năng và bảo mật",
                    "status": SPRINT_PLANNED,
                    "start_date": now + timedelta(days=12),
                    "end_date": now + timedelta(days=26),
                    "capacity": 35,
                },
            ]
        elif prj.status == "Planned":
            sprint_specs = [
                {
                    "name": f"{prj.project_code} - Sprint 1 (Planned)",
                    "goal": "Lập kế hoạch và thiết kế kiến trúc",
                    "status": SPRINT_PLANNED,
                    "start_date": now + timedelta(days=5),
                    "end_date": now + timedelta(days=19),
                    "capacity": 25,
                }
            ]
        else:
            sprint_specs = [
                {
                    "name": f"{prj.project_code} - Sprint Archive",
                    "goal": "Tổng kết dự án",
                    "status": SPRINT_COMPLETED,
                    "start_date": now - timedelta(days=60),
                    "end_date": now - timedelta(days=46),
                    "capacity": 20,
                }
            ]

        for sdata in sprint_specs:
            sprint = (
                db.query(Sprint)
                .filter_by(project_id=prj.id, name=sdata["name"])
                .first()
            )
            if not sprint:
                sprint = Sprint(
                    project_id=prj.id,
                    name=sdata["name"],
                    goal=sdata["goal"],
                    status=sdata["status"],
                    start_date=sdata["start_date"],
                    end_date=sdata["end_date"],
                    capacity=sdata["capacity"],
                    is_deleted=False,
                )
                db.add(sprint)
                db.commit()
                db.refresh(sprint)
            created_sprints.append(sprint)

    return created_sprints
