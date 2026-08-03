import random
from sqlalchemy.orm import Session
from app.models.discussion_topic import DiscussionTopic
from app.models.project import Project
from app.models.employee import Employee


def seed_topics(
    db: Session, projects: list[Project], employees: list[Employee]
) -> list[DiscussionTopic]:
    random.seed(2026)
    created_topics = []

    if not projects or not employees:
        return []

    # Get admin001 or the first available employee as creator
    admin = next((e for e in employees if e.employee_code == "admin001"), employees[0])

    topic_specs = [
        {
            "title": "Epic: Authentication & Authorization",
            "content": "Thiết kế và triển khai luồng đăng nhập, RBAC và JWT.",
        },
        {
            "title": "Epic: Task Management Core",
            "content": "Tạo, cập nhật, xóa và di chuyển task giữa các trạng thái.",
        },
        {
            "title": "Epic: Sprints & Backlog",
            "content": "Quản lý backlog, tạo sprint, kích hoạt và kết thúc sprint.",
        },
        {
            "title": "Epic: User & Team Organization",
            "content": "Phân quyền, quản lý nhân viên, phòng ban và nhóm.",
        },
    ]

    for project in projects:
        # Create 2 topics per project
        selected_specs = random.sample(topic_specs, 2)

        for spec in selected_specs:
            # Check if topic already exists for this project
            topic = (
                db.query(DiscussionTopic)
                .filter_by(project_id=project.id, title=spec["title"])
                .first()
            )

            if not topic:
                topic = DiscussionTopic(
                    project_id=project.id,
                    title=spec["title"],
                    content=spec["content"],
                    status="Open",
                    created_by_id=admin.id,
                )
                db.add(topic)
                db.commit()
                db.refresh(topic)
            created_topics.append(topic)

    return created_topics
