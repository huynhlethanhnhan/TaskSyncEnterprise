import random
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.employee import Employee


def seed_tasks(
    db: Session,
    projects: list[Project],
    sprints: list[Sprint],
    employees: list[Employee],
) -> list[Task]:
    random.seed(2026)
    now = datetime.now(UTC).replace(tzinfo=None)

    emp001 = next(
        (e for e in employees if e.employee_code == "employee001"), employees[0]
    )
    prj_test = next(
        (p for p in projects if p.project_code == "PRJ-SPRINT-TEST"), projects[0]
    )
    sprint_b = next(
        (s for s in sprints if s.name == "Sprint B (Planned Eligible)"), None
    )

    created_tasks = []

    # 1. Special Test Tasks for employee001
    emp001_tasks = [
        {
            "code": "EMP001-TASK-001",
            "title": "Nhiệm vụ 01: Nghiên cứu tài liệu kĩ thuật FastAPI & React",
            "description": "Nhiệm vụ kiểm thử cho employee001 ở trạng thái To Do",
            "status": "To Do",
            "priority": "High",
            "story_points": 3,
            "deadline": now + timedelta(days=7),
            "project_id": prj_test.id,
            "sprint_id": sprint_b.id if sprint_b else None,
        },
        {
            "code": "EMP001-TASK-002",
            "title": "Nhiệm vụ 02: Viết Unit test cho module Authentication",
            "description": "Nhiệm vụ kiểm thử đến hạn hôm nay cho employee001",
            "status": "In Progress",
            "priority": "Critical",
            "story_points": 5,
            "deadline": now,
            "project_id": prj_test.id,
            "sprint_id": sprint_b.id if sprint_b else None,
        },
        {
            "code": "EMP001-TASK-003",
            "title": "Nhiệm vụ 03: Khắc phục lỗi kết nối SQL Server Timeout",
            "description": "Nhiệm vụ bị tắc nghẽn (Blocked) và quá hạn cho employee001",
            "status": "Blocked",
            "priority": "High",
            "story_points": 8,
            "deadline": now - timedelta(days=2),
            "project_id": prj_test.id,
            "sprint_id": sprint_b.id if sprint_b else None,
        },
        {
            "code": "EMP001-TASK-004",
            "title": "Nhiệm vụ 04: Cập nhật giao diện Dark Mode cho Dashboard",
            "description": "Nhiệm vụ đã hoàn thành có deadline trong quá khứ",
            "status": "Done",
            "priority": "Medium",
            "story_points": 2,
            "deadline": now - timedelta(days=5),
            "project_id": prj_test.id,
            "sprint_id": None,
        },
        {
            "code": "EMP001-TASK-005",
            "title": "Nhiệm vụ 05: Đóng góp ý kiến cải tiến quy trình Agile",
            "description": "Nhiệm vụ không có Deadline và không có Story Point",
            "status": "To Do",
            "priority": "Low",
            "story_points": None,
            "deadline": None,
            "project_id": prj_test.id,
            "sprint_id": None,
        },
    ]

    for tspec in emp001_tasks:
        task = db.query(Task).filter_by(title=tspec["title"]).first()
        if not task:
            task = Task(
                title=tspec["title"],
                description=tspec["description"],
                status=tspec["status"],
                priority=tspec["priority"],
                story_points=tspec["story_points"],
                deadline=tspec["deadline"],
                project_id=tspec["project_id"],
                sprint_id=tspec["sprint_id"],
                created_by=emp001.id,
                is_deleted=False,
            )
            db.add(task)
            db.commit()
            db.refresh(task)

            # Assign to emp001
            ta = TaskAssignment(task_id=task.id, employee_id=emp001.id)
            db.add(ta)
            db.commit()
        created_tasks.append(task)

    # 2. Generate remaining tasks up to 105 total tasks
    statuses = (
        ["To Do"] * 23
        + ["In Progress"] * 23
        + ["Review"] * 15
        + ["Blocked"] * 9
        + ["Done"] * 24
    )
    priorities = ["Low", "Medium", "High", "Critical"]
    sp_options = [1, 2, 3, 5, 8, 13, None]

    for idx, status in enumerate(statuses, start=6):
        title = (
            f"Task #{idx:03d}: Cập nhật mô hình dữ liệu và kiểm thử hệ thống ({status})"
        )
        task = db.query(Task).filter_by(title=title).first()
        if not task:
            prj = random.choice(projects)
            prj_sprints = [s for s in sprints if s.project_id == prj.id]
            spr = (
                random.choice(prj_sprints)
                if prj_sprints and random.random() > 0.3
                else None
            )

            # Calculate deadline
            d_choice = random.random()
            if d_choice < 0.2:
                deadline = None
            elif d_choice < 0.35:
                deadline = now
            elif d_choice < 0.6:
                deadline = now + timedelta(days=random.randint(1, 14))
            else:
                deadline = now - timedelta(days=random.randint(1, 10))

            creator = random.choice(employees)
            assignee = random.choice(employees)

            task = Task(
                title=title,
                description=f"Chi tiết nội dung kiểm thử tự động cho công việc #{idx:03d} trong dự án {prj.name}.",
                status=status,
                priority=random.choice(priorities),
                story_points=random.choice(sp_options),
                deadline=deadline,
                project_id=prj.id,
                sprint_id=spr.id if spr else None,
                created_by=creator.id,
                is_deleted=False,
            )
            db.add(task)
            db.commit()
            db.refresh(task)

            # Assign task
            ta = TaskAssignment(task_id=task.id, employee_id=assignee.id)
            db.add(ta)
            db.commit()

        created_tasks.append(task)

    return created_tasks
