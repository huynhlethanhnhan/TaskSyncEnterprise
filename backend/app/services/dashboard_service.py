# 📂 FILE: app/services/dashboard_service.py
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.department import Department
from app.models.project import Project
from app.models.task import Task
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
            ttl=settings.CACHE_TTL_DASHBOARD
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
        total_employees_q = select(func.count(Employee.id)).where(Employee.is_deleted == False).scalar_subquery()
        active_employees_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.is_active == True).scalar_subquery()
        inactive_employees_q = select(func.count(Employee.id)).where(Employee.is_deleted == False, Employee.is_active == False).scalar_subquery()

        total_departments_q = select(func.count(Department.id)).where(Department.is_active == True).scalar_subquery()

        total_projects_q = select(func.count(Project.id)).where(Project.is_deleted == False).scalar_subquery()
        active_projects_q = select(func.count(Project.id)).where(Project.is_deleted == False, Project.status == "Active").scalar_subquery()

        total_tasks_q = select(func.count(Task.id)).where(Task.is_deleted == False).scalar_subquery()
        completed_tasks_q = select(func.count(Task.id)).where(Task.is_deleted == False, Task.status == "Done").scalar_subquery()
        pending_tasks_q = select(func.count(Task.id)).where(Task.is_deleted == False, Task.status != "Done").scalar_subquery()
        overdue_tasks_q = select(func.count(Task.id)).where(Task.is_deleted == False, Task.status != "Done", Task.deadline < now_val).scalar_subquery()

        total_vacations_q = select(func.count(Vacation.id)).scalar_subquery()
        pending_vacations_q = select(func.count(Vacation.id)).where(Vacation.status == "Pending").scalar_subquery()

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
            pending_vacations_q.label("pending_vacation_requests")
        )

        row = db.execute(stmt).first()
        if not row:
            return {
                "total_employees": 0, "active_employees": 0, "inactive_employees": 0,
                "total_departments": 0, "total_projects": 0, "active_projects": 0,
                "total_tasks": 0, "completed_tasks": 0, "pending_tasks": 0, "overdue_tasks": 0,
                "vacation_requests": 0, "pending_vacation_requests": 0
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
            ttl=settings.CACHE_TTL_DASHBOARD
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
            select(Department.name.label("department_name"), func.count(Employee.id).label("employee_count"))
            .join(Employee, Department.id == Employee.department_id)
            .where(Employee.is_deleted == False, Department.is_active == True)
            .group_by(Department.name)
        )
        dept_rows = db.execute(dept_stmt).all()
        employees_by_department = [
            {"department_name": r.department_name, "employee_count": r.employee_count}
            for r in dept_rows
        ]

        return {
            "overview": overview,
            "tasks_by_status": tasks_by_status,
            "projects_by_status": projects_by_status,
            "employees_by_department": employees_by_department
        }


dashboard_service = DashboardService()