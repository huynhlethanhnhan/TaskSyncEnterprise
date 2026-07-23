# 📂 FILE: app/services/dashboard_service.py
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.department import Department
from app.models.project import Project
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.vacation import Vacation
from app.config import settings
from app.cache import cache_manager
from app.cache.cache_keys import get_dashboard_summary_key, get_dashboard_analytics_key


class DashboardService:
    """Service layer containing query aggregations for dashboard metrics."""

    def get_overview(self, db: Session) -> dict:
        """
        Retrieves general widget overview metrics.
        Uses CacheManager read-through caching.
        """
        key = get_dashboard_summary_key()
        return cache_manager.get_or_set(
            key=key,
            creator_fn=lambda: self._get_overview_db(db),
            ttl=settings.CACHE_TTL_DASHBOARD,
        )

    def _get_overview_db(self, db: Session) -> dict:
        """Retrieves general widget overview metrics directly from the database."""
        # Determine database dialect for timezone-safe current time check
        if db.bind and db.bind.dialect.name == "mssql":
            now_val = func.sysutcdatetime()
        else:
            from datetime import datetime, timezone

            now_val = datetime.now(timezone.utc)

        # 1. Define individual count queries as scalar subqueries
        total_employees_q = (
            select(func.count(Employee.id))
            .where(Employee.is_deleted == False)
            .scalar_subquery()
        )
        active_employees_q = (
            select(func.count(Employee.id))
            .where(Employee.is_deleted == False, Employee.is_active == True)
            .scalar_subquery()
        )
        inactive_employees_q = (
            select(func.count(Employee.id))
            .where(Employee.is_deleted == False, Employee.is_active == False)
            .scalar_subquery()
        )

        total_departments_q = (
            select(func.count(Department.id))
            .where(Department.is_active == True)
            .scalar_subquery()
        )

        total_projects_q = (
            select(func.count(Project.id))
            .where(Project.is_deleted == False)
            .scalar_subquery()
        )
        active_projects_q = (
            select(func.count(Project.id))
            .where(Project.is_deleted == False, Project.status == "Active")
            .scalar_subquery()
        )

        total_tasks_q = (
            select(func.count(Task.id))
            .where(Task.is_deleted == False)
            .scalar_subquery()
        )
        completed_tasks_q = (
            select(func.count(Task.id))
            .where(Task.is_deleted == False, Task.status == "Done")
            .scalar_subquery()
        )
        pending_tasks_q = (
            select(func.count(Task.id))
            .where(Task.is_deleted == False, Task.status != "Done")
            .scalar_subquery()
        )
        overdue_tasks_q = (
            select(func.count(Task.id))
            .where(
                Task.is_deleted == False, Task.status != "Done", Task.deadline < now_val
            )
            .scalar_subquery()
        )

        total_vacations_q = select(func.count(Vacation.id)).scalar_subquery()
        pending_vacations_q = (
            select(func.count(Vacation.id))
            .where(Vacation.status == "Pending")
            .scalar_subquery()
        )

        # 2. Combine subqueries in a single SELECT
        stmt = select(
            total_employees_q.label("total_employees"),
            active_employees_q.label("active_employees"),
            inactive_employees_q.label("inactive_employees"),
            total_departments_q.label("total_departments"),
            total_projects_q.label("total_projects"),
            active_projects_q.label("active_projects"),
            total_tasks_q.label("total_tasks"),
            completed_tasks_q.label("completed_tasks"),
            pending_tasks_q.label("pending_tasks"),
            overdue_tasks_q.label("overdue_tasks"),
            total_vacations_q.label("vacation_requests"),
            pending_vacations_q.label("pending_vacation_requests"),
        )

        row = db.execute(stmt).first()
        if not row:
            return {
                "total_employees": 0,
                "active_employees": 0,
                "inactive_employees": 0,
                "total_departments": 0,
                "total_projects": 0,
                "active_projects": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "pending_tasks": 0,
                "overdue_tasks": 0,
                "vacation_requests": 0,
                "pending_vacation_requests": 0,
            }

        return dict(row._mapping)

    def get_detailed_analytics(self, db: Session) -> dict:
        """
        Retrieves full widget overview counts along with breakdowns.
        Uses CacheManager read-through caching.
        """
        key = get_dashboard_analytics_key()
        return cache_manager.get_or_set(
            key=key,
            creator_fn=lambda: self._get_detailed_analytics_db(db),
            ttl=settings.CACHE_TTL_DASHBOARD,
        )

    def _get_detailed_analytics_db(self, db: Session) -> dict:
        """Retrieves breakdown metrics directly from the database."""
        overview = self.get_overview(db)

        # 1. Fetch Task counts grouped by Status
        task_stmt = (
            select(Task.status, func.count(Task.id).label("count"))
            .where(Task.is_deleted == False)
            .group_by(Task.status)
        )
        task_rows = db.execute(task_stmt).all()
        tasks_by_status = [{"status": r.status, "count": r.count} for r in task_rows]

        # 2. Fetch Project counts grouped by Status
        proj_stmt = (
            select(Project.status, func.count(Project.id).label("count"))
            .where(Project.is_deleted == False)
            .group_by(Project.status)
        )
        proj_rows = db.execute(proj_stmt).all()
        projects_by_status = [{"status": r.status, "count": r.count} for r in proj_rows]

        # 3. Fetch Employees count grouped by Department
        dept_stmt = (
            select(
                Department.name.label("department_name"),
                func.count(Employee.id).label("employee_count"),
            )
            .join(Employee, Department.id == Employee.department_id)
            .where(Employee.is_deleted == False, Department.is_active == True)
            .group_by(Department.name)
        )
        dept_rows = db.execute(dept_stmt).all()
        employees_by_department = [
            {"department_name": r.department_name, "employee_count": r.employee_count}
            for r in dept_rows
        ]

        if db.bind and db.bind.dialect.name == "mssql":
            now_value = func.sysutcdatetime()
        else:
            now_value = datetime.now(timezone.utc)

        workload_stmt = (
            select(
                Department.name.label("department_name"),
                func.count(func.distinct(Task.id)).label("total_tasks"),
                func.sum(case((Task.status != "Done", 1), else_=0)).label("pending_tasks"),
                func.sum(
                    case(
                        ((Task.status != "Done") & (Task.deadline.is_not(None)) & (Task.deadline < now_value), 1),
                        else_=0,
                    )
                ).label("overdue_tasks"),
            )
            .join(Employee, Department.id == Employee.department_id)
            .join(TaskAssignment, Employee.id == TaskAssignment.employee_id)
            .join(Task, TaskAssignment.task_id == Task.id)
            .where(Employee.is_deleted == False, Department.is_active == True, Task.is_deleted == False)
            .group_by(Department.name)
            .order_by(Department.name)
        )
        workload_by_department = [
            {
                "department_name": row.department_name,
                "total_tasks": row.total_tasks or 0,
                "pending_tasks": row.pending_tasks or 0,
                "overdue_tasks": row.overdue_tasks or 0,
            }
            for row in db.execute(workload_stmt).all()
        ]

        from app.models.notification import Notification

        # 4. Fetch Leave counts grouped by Status
        vac_stmt = select(Vacation.status, func.count(Vacation.id).label("count")).group_by(Vacation.status)
        vac_rows = db.execute(vac_stmt).all()
        leave_by_status = [{"status": r.status, "count": r.count} for r in vac_rows]

        # 5. Fetch Notification counts grouped by Category/Type
        notif_stmt = select(Notification.type, func.count(Notification.id).label("count")).group_by(Notification.type)
        notif_rows = db.execute(notif_stmt).all()
        notification_volume = [{"category": r.type or "System", "count": r.count} for r in notif_rows]

        # 6. Upcoming Deadlines (tasks due in future or recently due, top 5)
        deadline_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=14)
        deadline_stmt = (
            select(Task.id, Task.title, Task.deadline, Task.priority, Task.status)
            .where(
                Task.is_deleted == False,
                Task.status != "Done",
                Task.deadline.is_not(None),
                Task.deadline >= now_value,
                Task.deadline <= deadline_cutoff,
            )
            .order_by(Task.deadline.asc())
            .limit(5)
        )
        deadline_rows = db.execute(deadline_stmt).all()
        upcoming_deadlines = [
            {
                "id": r.id,
                "title": r.title,
                "deadline": r.deadline.isoformat() if r.deadline else None,
                "priority": r.priority,
                "status": r.status,
            }
            for r in deadline_rows
        ]

        # 7. Upcoming Leaves (Vacations starting soon)
        today = datetime.now(timezone.utc).date()
        leave_up_stmt = (
            select(Vacation.id, Vacation.type, Vacation.start_date, Vacation.end_date, Vacation.status, Employee.full_name.label("employee_name"))
            .join(Employee, Vacation.requested_by == Employee.id)
            .where(Vacation.start_date >= today, Vacation.status.in_(["HR Approved", "Approved"]))
            .order_by(Vacation.start_date.asc())
            .limit(5)
        )
        leave_up_rows = db.execute(leave_up_stmt).all()
        upcoming_leaves = [
            {
                "id": r.id,
                "type": r.type,
                "employee_name": r.employee_name,
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "status": r.status,
            }
            for r in leave_up_rows
        ]

        # 8. Upcoming Birthdays
        bday_stmt = (
            select(Employee.id, Employee.full_name, Employee.date_of_birth, Employee.job_title, Department.name.label("department_name"))
            .outerjoin(Department, Employee.department_id == Department.id)
            .where(Employee.is_deleted == False, Employee.date_of_birth.is_not(None))
            .limit(5)
        )
        bday_rows = db.execute(bday_stmt).all()
        upcoming_birthdays = [
            {
                "id": r.id,
                "full_name": r.full_name,
                "date_of_birth": str(r.date_of_birth),
                "job_title": r.job_title,
                "department_name": r.department_name,
            }
            for r in bday_rows
        ]

        # 9. Pending Approvals (Leaves requiring manager/HR approval)
        pending_stmt = (
            select(Vacation.id, Vacation.type, Vacation.start_date, Vacation.end_date, Vacation.reason, Employee.full_name.label("requested_by_name"))
            .join(Employee, Vacation.requested_by == Employee.id)
            .where(Vacation.status == "Pending")
            .order_by(Vacation.created_at.desc())
            .limit(5)
        )
        pending_rows = db.execute(pending_stmt).all()
        pending_approvals = [
            {
                "id": r.id,
                "type": r.type,
                "requested_by_name": r.requested_by_name,
                "start_date": str(r.start_date),
                "end_date": str(r.end_date),
                "reason": r.reason,
            }
            for r in pending_rows
        ]

        # Task has no completed_at column, so report real creations only
        # instead of inventing a completion trend.
        six_months_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=183)
        created_rows = db.execute(
            select(Task.created_at).where(Task.is_deleted == False, Task.created_at >= six_months_ago)
        ).all()
        month_counts: dict[str, int] = {}
        for row in created_rows:
            if row.created_at:
                key = row.created_at.strftime("%Y-%m")
                month_counts[key] = month_counts.get(key, 0) + 1
        monthly_activity = [
            {"month": month, "created": count}
            for month, count in sorted(month_counts.items())
        ]

        return {
            "overview": overview,
            "tasks_by_status": tasks_by_status,
            "projects_by_status": projects_by_status,
            "employees_by_department": employees_by_department,
            "workload_by_department": workload_by_department,
            "leave_by_status": leave_by_status,
            "monthly_activity": monthly_activity,
            "notification_volume": notification_volume,
            "upcoming_deadlines": upcoming_deadlines,
            "upcoming_leaves": upcoming_leaves,
            "upcoming_birthdays": upcoming_birthdays,
            "pending_approvals": pending_approvals,
        }


dashboard_service = DashboardService()
