from datetime import datetime, timezone
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.task import Task
from app.models.employee import Employee
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.project_access import project_scope_predicate
from app.services.task_service import validate_task_relationships

from app.core.constants import ROLE_ADMIN, ROLE_MANAGER


def get_all(
    db: Session,
    skip: int = 0,
    limit: int = 1000,
    project_id: int | None = None,
    status: str | None = None,
    current_user: Employee | None = None,
):
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignments),
            joinedload(Task.sprint),
            joinedload(Task.topic),
        )
        .where(Task.is_deleted == False)  # noqa: E712
    )
    if current_user is not None:
        if current_user.role_id == ROLE_ADMIN:
            pass
        elif current_user.role_id == ROLE_MANAGER:
            scope = project_scope_predicate(current_user)
            if scope is not None:
                stmt = stmt.join(Project, Project.id == Task.project_id).where(
                    Project.is_deleted == False,  # noqa: E712
                    scope,
                )
        else:
            from app.models.task_assignment import TaskAssignment

            scope = project_scope_predicate(current_user)
            stmt = stmt.join(Project, Project.id == Task.project_id).where(
                Project.is_deleted == False,  # noqa: E712
                or_(
                    Task.id.in_(
                        select(TaskAssignment.task_id).where(
                            TaskAssignment.employee_id == current_user.id
                        )
                    ),
                    Task.created_by == current_user.id,
                    scope if scope is not None else True,
                ),
            )

    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    if status is not None:
        stmt = stmt.where(Task.status == status)

    stmt = stmt.order_by(Task.id.desc())
    if skip > 0:
        stmt = stmt.offset(skip)
    if limit is not None and limit > 0:
        stmt = stmt.limit(limit)

    return list(db.scalars(stmt).unique().all())


def search_tasks(
    db: Session,
    current_user: Employee,
    *,
    keyword: str | None = None,
    project_id: int | None = None,
    department_id: int | None = None,
    team_id: int | None = None,
    sprint_id: int | None = None,
    topic_id: int | None = None,
    assigned_to: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    overdue_only: bool = False,
    skip: int = 0,
    limit: int = 100,
) -> list[Task]:
    """Multi-table query searching Tasks joined across Project, Sprint, DiscussionTopic, and TaskAssignment."""
    from app.models.discussion_topic import DiscussionTopic
    from app.models.sprint import Sprint
    from app.models.task_assignment import TaskAssignment

    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignments),
            joinedload(Task.sprint),
            joinedload(Task.topic),
        )
        .join(Project, Project.id == Task.project_id)
        .outerjoin(Sprint, Sprint.id == Task.sprint_id)
        .outerjoin(DiscussionTopic, DiscussionTopic.id == Task.topic_id)
        .where(
            Task.is_deleted == False,  # noqa: E712
            Project.is_deleted == False,  # noqa: E712
        )
    )

    # RBAC scoping matching Manager department scope + Team Leader delegation
    if current_user.role_id == ROLE_ADMIN:
        pass
    elif current_user.role_id == ROLE_MANAGER:
        scope = project_scope_predicate(current_user)
        if scope is not None:
            stmt = stmt.where(scope)
    else:
        scope = project_scope_predicate(current_user)
        stmt = stmt.where(
            or_(
                Task.id.in_(
                    select(TaskAssignment.task_id).where(
                        TaskAssignment.employee_id == current_user.id
                    )
                ),
                Task.created_by == current_user.id,
                scope if scope is not None else True,
            )
        )

    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    if department_id is not None:
        stmt = stmt.where(Project.department_id == department_id)
    if team_id is not None:
        stmt = stmt.where(Project.team_id == team_id)
    if sprint_id is not None:
        stmt = stmt.where(Task.sprint_id == sprint_id)
    if topic_id is not None:
        stmt = stmt.where(Task.topic_id == topic_id)
    if status:
        stmt = stmt.where(Task.status == status)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if assigned_to is not None:
        stmt = stmt.where(
            Task.id.in_(
                select(TaskAssignment.task_id).where(
                    TaskAssignment.employee_id == assigned_to
                )
            )
        )
    if overdue_only:
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        stmt = stmt.where(
            Task.deadline.is_not(None),
            Task.deadline < now_utc,
            Task.status != "Done",
        )
    if keyword and keyword.strip():
        pattern = f"%{keyword.strip()}%"
        stmt = stmt.where(
            or_(
                Task.title.ilike(pattern),
                Task.description.ilike(pattern),
                Project.name.ilike(pattern),
                Sprint.name.ilike(pattern),
                DiscussionTopic.title.ilike(pattern),
            )
        )

    stmt = stmt.order_by(Task.id.desc())
    if skip > 0:
        stmt = stmt.offset(skip)
    if limit > 0:
        stmt = stmt.limit(limit)

    return list(db.scalars(stmt).unique().all())


def get_by_id(db: Session, task_id: int) -> Task | None:
    stmt = (
        select(Task)
        .options(
            selectinload(Task.assignments),
            joinedload(Task.sprint),
            joinedload(Task.topic),
        )
        .where(Task.id == task_id, Task.is_deleted == False)  # noqa: E712
    )
    return db.scalars(stmt).first()


def create(db: Session, data: TaskCreate):
    task_data = data.model_dump()
    if not task_data.get("title") and task_data.get("name"):
        task_data["title"] = task_data["name"]
    task_data.pop("name", None)

    assigned_to = task_data.pop("assigned_to", None)
    validate_task_relationships(
        db,
        project_id=task_data["project_id"],
        sprint_id=task_data.get("sprint_id"),
        assigned_to=assigned_to,
        topic_id=task_data.get("topic_id"),
    )

    obj = Task(**task_data)
    db.add(obj)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        from app.core.logger import error_logger

        db_orig = getattr(exc, "orig", exc)
        error_logger.error(
            f"Task create DB commit failed [{type(exc).__name__}]: {db_orig!r} | Statement: {getattr(exc, 'statement', None)} | Params: {getattr(exc, 'params', None)}",
            exc_info=True,
            extra={
                "db_error": str(db_orig),
                "db_error_repr": repr(db_orig),
                "statement": str(getattr(exc, "statement", None)),
                "params": str(getattr(exc, "params", None)),
            },
        )
        raise
    db.refresh(obj)

    if assigned_to is not None:
        from app.models.task_assignment import TaskAssignment

        assignment = TaskAssignment(task_id=obj.id, employee_id=assigned_to)
        db.add(assignment)
        try:
            db.commit()
        except Exception as e:
            from app.core.logger import app_logger

            app_logger.error(f"Error committing assignment: {e}")

        # KÍCH HOẠT TRIGGER NOTIFICATION (Fail-silent)
        from app.crud import notification as notification_crud

        try:
            notification_crud.create_notification(
                db, title="Bạn có task mới", message=obj.title, employee_id=assigned_to
            )
        except Exception as e:
            from app.core.logger import app_logger

            app_logger.error(f"Error creating notification: {e}")

    db.refresh(obj)
    from app.services.progress_service import (
        recalculate_project_progress,
        sync_sprint_daily_progress,
    )

    recalculate_project_progress(db, obj.project_id)
    if obj.sprint_id:
        sync_sprint_daily_progress(db, obj.sprint_id)

    return obj


def update(db: Session, obj: Task, data: TaskUpdate):
    task_data = data.model_dump(exclude_unset=True)

    project_was_set = "project_id" in data.model_fields_set
    sprint_was_set = "sprint_id" in data.model_fields_set
    assignee_was_set = "assigned_to" in data.model_fields_set
    topic_was_set = "topic_id" in data.model_fields_set

    assigned_to = task_data.pop("assigned_to", None)

    target_project_id = task_data["project_id"] if project_was_set else obj.project_id

    # When changing Project:
    # 1. Clear old Sprint unless a new sprint was set
    # 2. Clear old Assignee unless a new valid ProjectMember assignee was set
    if project_was_set and target_project_id != obj.project_id:
        if not sprint_was_set:
            task_data["sprint_id"] = None
            sprint_was_set = True

        if not assignee_was_set:
            assigned_to = None
            assignee_was_set = True

    target_sprint_id = task_data.get("sprint_id") if sprint_was_set else obj.sprint_id

    target_topic_id = task_data.get("topic_id") if topic_was_set else obj.topic_id

    target_assignee = assigned_to if assignee_was_set else None
    sprint_changed = (sprint_was_set and target_sprint_id != obj.sprint_id) or (
        project_was_set and target_project_id != obj.project_id
    )

    validate_task_relationships(
        db,
        project_id=target_project_id,
        sprint_id=target_sprint_id,
        assigned_to=target_assignee,
        topic_id=target_topic_id,
        check_sprint_status=sprint_changed,
    )

    old_assigned_to = obj.assigned_to
    old_status = obj.status

    if task_data.get("status") == "Done":
        task_data["progress_percent"] = 100

    for k, v in task_data.items():
        setattr(obj, k, v)

    db.commit()

    if assignee_was_set:
        from app.models.task_assignment import TaskAssignment
        from sqlalchemy import delete

        db.execute(delete(TaskAssignment).where(TaskAssignment.task_id == obj.id))

        if assigned_to is not None:
            new_assignment = TaskAssignment(task_id=obj.id, employee_id=assigned_to)
            db.add(new_assignment)

        db.commit()
        db.expire(obj, ["assignments"])

        if assigned_to is not None and old_assigned_to != assigned_to:
            from app.crud import notification as notification_crud

            try:
                notification_crud.create_notification(
                    db,
                    title="Bạn có task mới",
                    message=obj.title,
                    employee_id=assigned_to,
                )
            except Exception as e:
                from app.core.logger import app_logger

                app_logger.error(f"Error creating notification: {e}")
        else:
            db.commit()

        db.expire(obj, ["assignments"])

    new_status = obj.status
    target_emp_for_notif = assigned_to if assignee_was_set else old_assigned_to
    if old_status != new_status and target_emp_for_notif is not None:
        from app.crud import notification as notification_crud

        try:
            notification_crud.create_notification(
                db,
                title="Thay đổi trạng thái Task",
                message=f"Task '{obj.title}' đã chuyển sang trạng thái '{new_status}'",
                employee_id=target_emp_for_notif,
            )
        except Exception as e:
            from app.core.logger import app_logger

            app_logger.error(f"Error creating status notification: {e}")

    db.refresh(obj)
    from app.services.progress_service import (
        recalculate_project_progress,
        sync_sprint_daily_progress,
    )

    recalculate_project_progress(db, obj.project_id)
    if project_was_set and target_project_id != obj.project_id:
        recalculate_project_progress(db, target_project_id)
    if obj.sprint_id:
        sync_sprint_daily_progress(db, obj.sprint_id)

    return obj


def delete(db: Session, obj: Task):
    obj.is_deleted = True
    db.commit()

    from app.services.progress_service import (
        recalculate_project_progress,
        sync_sprint_daily_progress,
    )

    recalculate_project_progress(db, obj.project_id)
    if obj.sprint_id:
        sync_sprint_daily_progress(db, obj.sprint_id)


def get_by_project(db: Session, project_id: int):
    stmt = (
        select(Task)
        .where(Task.project_id == project_id)  # 🟢 Chỉ lấy task thuộc dự án này
        .where(Task.is_deleted == False)
        .order_by(Task.id.desc())
    )
    return db.scalars(stmt).all()


def get_my_tasks(db: Session, employee_id: int):
    from app.models.task_assignment import TaskAssignment

    stmt = (
        select(Task)
        .join(TaskAssignment, Task.id == TaskAssignment.task_id)
        .where(TaskAssignment.employee_id == employee_id)
        .where(Task.is_deleted == False)
        .order_by(Task.id.desc())
    )
    return db.scalars(stmt).all()
