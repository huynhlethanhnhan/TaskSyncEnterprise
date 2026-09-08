from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cache.cache_invalidator import CacheInvalidator
from app.models.project import Project
from app.models.task import Task
from app.models.sprint import Sprint


def recalculate_project_progress(db: Session, project_id: int) -> Project | None:
    """Tự động tính toán và cập nhật tiến độ thực tế (progress_percent) cùng trạng thái (status) của Dự án

    dựa trên toàn bộ danh sách công việc (bao gồm cả công việc trong Sprint lẫn công việc riêng lẻ).
    """
    project = db.get(Project, project_id)
    if not project or project.is_deleted:
        return None

    tasks = db.scalars(
        select(Task).where(
            Task.project_id == project_id,
            Task.is_deleted == False,  # noqa: E712
        )
    ).all()

    total_tasks: int = len(tasks)
    if total_tasks == 0:
        project.progress_percent = 0.0
        if project.status == "Completed":
            project.status = "Planning"
    else:
        completed_tasks: int = sum(1 for t in tasks if t.status == "Done")
        new_progress: float = round((completed_tasks / total_tasks) * 100.0, 2)
        project.progress_percent = new_progress

        if completed_tasks == total_tasks:
            # Tất cả công việc đã Done -> Dự án hoàn thành
            project.status = "Completed"
        elif project.status == "Completed" and completed_tasks < total_tasks:
            # Nếu còn công việc dở dang nhưng trạng thái là Completed -> Hoàn trả lại Active
            project.status = "Active"

    db.commit()
    db.refresh(project)

    # Invalidate cache cho Project, Dashboard và Department/Team
    CacheInvalidator.invalidate_project(project.id)
    if project.department_id:
        CacheInvalidator.invalidate_department(project.department_id)
    if project.team_id:
        CacheInvalidator.invalidate_team(project.team_id)

    return project


def sync_sprint_daily_progress(db: Session, sprint_id: int) -> None:
    """Đồng bộ hóa snapshot tiến độ ngày hôm nay của Sprint khi có thay đổi trạng thái công việc."""
    from app.routers.v1.sprints import calculate_and_save_snapshot

    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        return

    today = datetime.now(UTC).date()
    calculate_and_save_snapshot(db, sprint_id, today)
    CacheInvalidator.invalidate_sprint(sprint.id, project_id=sprint.project_id)
