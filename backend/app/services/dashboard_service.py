# 📂 FILE: app/services/dashboard_service.py
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, case, or_, false, true, literal
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.department import Department
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.vacation import Vacation
from app.models.notification import Notification
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
from app.config import settings
from app.cache import cache_manager
from app.cache.cache_keys import get_dashboard_summary_key, get_dashboard_analytics_key


class DashboardService:
    """Service layer containing query aggregations for dashboard metrics."""

    def get_overview(self, db: Session, current_user: Employee | None = None) -> dict:
        """
        Retrieves general widget overview metrics for current user.
        Uses CacheManager read-through caching.
        """
        if current_user is None:
            key = get_dashboard_summary_key()
        else:
            key = get_dashboard_summary_key(
                user_id=current_user.id, role_id=current_user.role_id
            )

        return cache_manager.get_or_set(
            key=key,
            creator_fn=lambda: self._get_overview_db(db, current_user),
            ttl=settings.CACHE_TTL_DASHBOARD,
        )

    def _get_overview_db(
        self, db: Session, current_user: Employee | None = None
    ) -> dict:
        """Retrieves general widget overview metrics directly from database based on RBAC."""
        if db.bind and db.bind.dialect.name == "mssql":
            now_val = func.sysutcdatetime()
        else:
            now_val = datetime.now(timezone.utc)

        role_id = current_user.role_id if current_user else ROLE_ADMIN
        user_id = current_user.id if current_user else 0
        dept_id = current_user.department_id if current_user else None

        if role_id == ROLE_ADMIN:
            # 1. ADMIN SCOPE: All records
            total_employees_q = (
                select(func.count(Employee.id))
                .where(Employee.is_deleted == False)  # noqa: E712
                .scalar_subquery()
            )
            active_employees_q = (
                select(func.count(Employee.id))
                .where(
                    Employee.is_deleted == False, Employee.is_active == True
                )  # noqa: E712
                .scalar_subquery()
            )
            inactive_employees_q = (
                select(func.count(Employee.id))
                .where(
                    Employee.is_deleted == False, Employee.is_active == False
                )  # noqa: E712
                .scalar_subquery()
            )
            total_departments_q = (
                select(func.count(Department.id))
                .where(Department.is_active == True)  # noqa: E712
                .scalar_subquery()
            )

            total_projects_q = (
                select(func.count(Project.id))
                .where(Project.is_deleted == False)  # noqa: E712
                .scalar_subquery()
            )
            active_projects_q = (
                select(func.count(Project.id))
                .where(
                    Project.is_deleted == False, Project.status == "Active"
                )  # noqa: E712
                .scalar_subquery()
            )

            total_tasks_q = (
                select(func.count(Task.id))
                .where(Task.is_deleted == False)  # noqa: E712
                .scalar_subquery()
            )
            completed_tasks_q = (
                select(func.count(Task.id))
                .where(Task.is_deleted == False, Task.status == "Done")  # noqa: E712
                .scalar_subquery()
            )
            pending_tasks_q = (
                select(func.count(Task.id))
                .where(Task.is_deleted == False, Task.status != "Done")  # noqa: E712
                .scalar_subquery()
            )
            overdue_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False,  # noqa: E712
                    Task.status != "Done",
                    Task.deadline < now_val,
                )
                .scalar_subquery()
            )

            total_vacations_q = select(func.count(Vacation.id)).scalar_subquery()
            pending_vacations_q = (
                select(func.count(Vacation.id))
                .where(Vacation.status == "Pending")
                .scalar_subquery()
            )

        elif role_id == ROLE_MANAGER:
            # 2. MANAGER SCOPE: Department & Team data
            total_employees_q = (
                select(func.count(Employee.id))
                .where(
                    Employee.is_deleted == False,  # noqa: E712
                    (Employee.department_id == dept_id) if dept_id else false(),
                )
                .scalar_subquery()
            )
            active_employees_q = (
                select(func.count(Employee.id))
                .where(
                    Employee.is_deleted == False,  # noqa: E712
                    Employee.is_active == True,  # noqa: E712
                    (Employee.department_id == dept_id) if dept_id else false(),
                )
                .scalar_subquery()
            )
            inactive_employees_q = (
                select(func.count(Employee.id))
                .where(
                    Employee.is_deleted == False,  # noqa: E712
                    Employee.is_active == False,  # noqa: E712
                    (Employee.department_id == dept_id) if dept_id else false(),
                )
                .scalar_subquery()
            )
            total_departments_q = (
                select(func.count(Department.id))
                .where(
                    Department.is_active == True,
                    (Department.id == dept_id) if dept_id else false(),
                )  # noqa: E712
                .scalar_subquery()
            )

            proj_clause = or_(
                (Project.department_id == dept_id) if dept_id else false(),
                Project.created_by == user_id,
            )
            total_projects_q = (
                select(func.count(Project.id))
                .where(Project.is_deleted == False, proj_clause)  # noqa: E712
                .scalar_subquery()
            )
            active_projects_q = (
                select(func.count(Project.id))
                .where(
                    Project.is_deleted == False, Project.status == "Active", proj_clause
                )  # noqa: E712
                .scalar_subquery()
            )

            dept_member_ids = (
                select(Employee.id).where(Employee.department_id == dept_id)
                if dept_id
                else select(Employee.id).where(Employee.id == user_id)
            )
            dept_proj_ids = select(Project.id).where(proj_clause)

            task_scope = or_(
                Task.project_id.in_(dept_proj_ids),
                Task.id.in_(
                    select(TaskAssignment.task_id).where(
                        TaskAssignment.employee_id.in_(dept_member_ids)
                    )
                ),
            )

            total_tasks_q = (
                select(func.count(Task.id))
                .where(Task.is_deleted == False, task_scope)  # noqa: E712
                .scalar_subquery()
            )
            completed_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False, Task.status == "Done", task_scope
                )  # noqa: E712
                .scalar_subquery()
            )
            pending_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False, Task.status != "Done", task_scope
                )  # noqa: E712
                .scalar_subquery()
            )
            overdue_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False,  # noqa: E712
                    Task.status != "Done",
                    Task.deadline < now_val,
                    task_scope,
                )
                .scalar_subquery()
            )

            total_vacations_q = (
                select(func.count(Vacation.id))
                .where(Vacation.requested_by.in_(dept_member_ids))
                .scalar_subquery()
            )
            pending_vacations_q = (
                select(func.count(Vacation.id))
                .where(
                    Vacation.status == "Pending",
                    Vacation.requested_by.in_(dept_member_ids),
                )
                .scalar_subquery()
            )

        else:
            # 3. EMPLOYEE SCOPE: Personal assigned tasks, member projects, own leaves
            total_employees_q = select(literal(0)).scalar_subquery()
            active_employees_q = select(literal(0)).scalar_subquery()
            inactive_employees_q = select(literal(0)).scalar_subquery()
            total_departments_q = select(literal(0)).scalar_subquery()

            my_project_ids = select(ProjectMember.project_id).where(
                ProjectMember.employee_id == user_id
            )
            total_projects_q = (
                select(func.count(Project.id))
                .where(
                    Project.is_deleted == False,  # noqa: E712
                    or_(Project.id.in_(my_project_ids), Project.created_by == user_id),
                )
                .scalar_subquery()
            )
            active_projects_q = (
                select(func.count(Project.id))
                .where(
                    Project.is_deleted == False,  # noqa: E712
                    Project.status == "Active",
                    or_(Project.id.in_(my_project_ids), Project.created_by == user_id),
                )
                .scalar_subquery()
            )

            my_task_scope = or_(
                Task.id.in_(
                    select(TaskAssignment.task_id).where(
                        TaskAssignment.employee_id == user_id
                    )
                ),
                Task.created_by == user_id,
            )

            total_tasks_q = (
                select(func.count(Task.id))
                .where(Task.is_deleted == False, my_task_scope)  # noqa: E712
                .scalar_subquery()
            )
            completed_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False, Task.status == "Done", my_task_scope
                )  # noqa: E712
                .scalar_subquery()
            )
            pending_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False, Task.status != "Done", my_task_scope
                )  # noqa: E712
                .scalar_subquery()
            )
            overdue_tasks_q = (
                select(func.count(Task.id))
                .where(
                    Task.is_deleted == False,  # noqa: E712
                    Task.status != "Done",
                    Task.deadline < now_val,
                    my_task_scope,
                )
                .scalar_subquery()
            )

            total_vacations_q = (
                select(func.count(Vacation.id))
                .where(Vacation.requested_by == user_id)
                .scalar_subquery()
            )
            pending_vacations_q = (
                select(func.count(Vacation.id))
                .where(Vacation.status == "Pending", Vacation.requested_by == user_id)
                .scalar_subquery()
            )

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

    def get_detailed_analytics(
        self, db: Session, current_user: Employee | None = None
    ) -> dict:
        """
        Retrieves full widget overview counts along with breakdowns scoped by current user.
        Uses CacheManager read-through caching.
        """
        if current_user is None:
            key = get_dashboard_analytics_key()
        else:
            key = get_dashboard_analytics_key(
                user_id=current_user.id, role_id=current_user.role_id
            )

        return cache_manager.get_or_set(
            key=key,
            creator_fn=lambda: self._get_detailed_analytics_db(db, current_user),
            ttl=settings.CACHE_TTL_DASHBOARD,
        )

    def _get_detailed_analytics_db(
        self, db: Session, current_user: Employee | None = None
    ) -> dict:
        """Retrieves breakdown metrics directly from database based on RBAC."""
        overview = self.get_overview(db, current_user)

        role_id = current_user.role_id if current_user else ROLE_ADMIN
        user_id = current_user.id if current_user else 0
        dept_id = current_user.department_id if current_user else None

        if db.bind and db.bind.dialect.name == "mssql":
            now_value = func.sysutcdatetime()
        else:
            now_value = datetime.now(timezone.utc)

        if role_id == ROLE_ADMIN:
            task_filter = Task.is_deleted == False  # noqa: E712
            proj_filter = Project.is_deleted == False  # noqa: E712
        elif role_id == ROLE_MANAGER:
            dept_member_ids = (
                select(Employee.id).where(Employee.department_id == dept_id)
                if dept_id
                else select(Employee.id).where(Employee.id == user_id)
            )
            proj_clause = or_(
                Project.department_id == dept_id if dept_id else False,
                Project.created_by == user_id,
            )
            dept_proj_ids = select(Project.id).where(proj_clause)
            task_filter = (Task.is_deleted == False) & (  # noqa: E712
                or_(
                    Task.project_id.in_(dept_proj_ids),
                    Task.id.in_(
                        select(TaskAssignment.task_id).where(
                            TaskAssignment.employee_id.in_(dept_member_ids)
                        )
                    ),
                )
            )
            proj_filter = (Project.is_deleted == False) & proj_clause  # noqa: E712
        else:
            my_project_ids = select(ProjectMember.project_id).where(
                ProjectMember.employee_id == user_id
            )
            my_task_scope = or_(
                Task.id.in_(
                    select(TaskAssignment.task_id).where(
                        TaskAssignment.employee_id == user_id
                    )
                ),
                Task.created_by == user_id,
            )
            task_filter = (Task.is_deleted == False) & my_task_scope  # noqa: E712
            proj_filter = (Project.is_deleted == False) & (  # noqa: E712
                or_(Project.id.in_(my_project_ids), Project.created_by == user_id)
            )

        # 1. Tasks by Status
        task_stmt = (
            select(Task.status, func.count(Task.id).label("count"))
            .where(task_filter)
            .group_by(Task.status)
        )
        task_rows = db.execute(task_stmt).all()
        tasks_by_status = [{"status": r.status, "count": r.count} for r in task_rows]

        # 2. Projects by Status
        proj_stmt = (
            select(Project.status, func.count(Project.id).label("count"))
            .where(proj_filter)
            .group_by(Project.status)
        )
        proj_rows = db.execute(proj_stmt).all()
        projects_by_status = [{"status": r.status, "count": r.count} for r in proj_rows]

        # 3. Employees by Department & Workload by Department
        if role_id == ROLE_EMPLOYEE:
            employees_by_department = []
            workload_by_department = []
        else:
            dept_filter = (Employee.is_deleted == False) & (
                Department.is_active == True
            )  # noqa: E712
            if role_id == ROLE_MANAGER and dept_id:
                dept_filter = dept_filter & (Department.id == dept_id)

            dept_stmt = (
                select(
                    Department.name.label("department_name"),
                    func.count(
                        case(
                            (
                                (Employee.is_deleted == False)
                                & (Employee.is_active == True),
                                Employee.id,
                            ),
                            else_=None,
                        )
                    ).label("employee_count"),
                )
                .outerjoin(
                    Employee,
                    (Department.id == Employee.department_id)
                    & (Employee.is_deleted == False),
                )
                .where(Department.is_active == True)
            )
            if role_id == ROLE_MANAGER and dept_id:
                dept_stmt = dept_stmt.where(Department.id == dept_id)

            dept_stmt = dept_stmt.group_by(Department.name).order_by(Department.name)
            dept_rows = db.execute(dept_stmt).all()
            employees_by_department = [
                {
                    "department_name": r.department_name,
                    "employee_count": r.employee_count,
                }
                for r in dept_rows
            ]

            workload_stmt = (
                select(
                    Department.name.label("department_name"),
                    func.count(func.distinct(Task.id)).label("total_tasks"),
                    func.sum(case((Task.status != "Done", 1), else_=0)).label(
                        "pending_tasks"
                    ),
                    func.sum(
                        case(
                            (
                                (Task.status != "Done")
                                & (Task.deadline.is_not(None))
                                & (Task.deadline < now_value),
                                1,
                            ),
                            else_=0,
                        )
                    ).label("overdue_tasks"),
                )
                .join(Employee, Department.id == Employee.department_id)
                .join(TaskAssignment, Employee.id == TaskAssignment.employee_id)
                .join(Task, TaskAssignment.task_id == Task.id)
                .where(
                    Employee.is_deleted == False,  # noqa: E712
                    Department.is_active == True,  # noqa: E712
                    Task.is_deleted == False,  # noqa: E712
                    (
                        (Department.id == dept_id)
                        if (role_id == ROLE_MANAGER and dept_id)
                        else true()
                    ),
                )
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

        # 4. Leave counts grouped by Status
        if role_id == ROLE_ADMIN:
            vac_stmt = select(
                Vacation.status, func.count(Vacation.id).label("count")
            ).group_by(Vacation.status)
        elif role_id == ROLE_MANAGER:
            dept_members = (
                select(Employee.id).where(Employee.department_id == dept_id)
                if dept_id
                else select(Employee.id).where(Employee.id == user_id)
            )
            vac_stmt = (
                select(Vacation.status, func.count(Vacation.id).label("count"))
                .where(Vacation.requested_by.in_(dept_members))
                .group_by(Vacation.status)
            )
        else:
            vac_stmt = (
                select(Vacation.status, func.count(Vacation.id).label("count"))
                .where(Vacation.requested_by == user_id)
                .group_by(Vacation.status)
            )

        vac_rows = db.execute(vac_stmt).all()
        leave_by_status = [{"status": r.status, "count": r.count} for r in vac_rows]

        # 5. Notification Volume
        if role_id == ROLE_ADMIN:
            notif_stmt = select(
                Notification.type, func.count(Notification.id).label("count")
            ).group_by(Notification.type)
        else:
            notif_stmt = (
                select(Notification.type, func.count(Notification.id).label("count"))
                .where(Notification.employee_id == user_id)
                .group_by(Notification.type)
            )

        notif_rows = db.execute(notif_stmt).all()
        notification_volume = [
            {"category": r.type or "System", "count": r.count} for r in notif_rows
        ]

        # 6. Upcoming Deadlines (top 5)
        deadline_cutoff = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
            days=14
        )
        deadline_stmt = (
            select(Task.id, Task.title, Task.deadline, Task.priority, Task.status)
            .where(
                task_filter,
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

        # 7. Upcoming Leaves
        today = datetime.now(timezone.utc).date()
        leave_up_stmt = (
            select(
                Vacation.id,
                Vacation.type,
                Vacation.start_date,
                Vacation.end_date,
                Vacation.status,
                Employee.full_name.label("employee_name"),
            )
            .join(Employee, Vacation.requested_by == Employee.id)
            .where(
                Vacation.start_date >= today,
            )
        )
        if role_id == ROLE_MANAGER and dept_id:
            leave_up_stmt = leave_up_stmt.where(
                Employee.department_id == dept_id,
                Vacation.status.in_(["HR Approved", "Approved", "Manager Approved"]),
            )
        elif role_id == ROLE_EMPLOYEE:
            leave_up_stmt = leave_up_stmt.where(
                Vacation.requested_by == user_id,
                Vacation.status.in_(
                    ["Pending", "Manager Approved", "HR Approved", "Approved"]
                ),
            )
        else:
            leave_up_stmt = leave_up_stmt.where(
                Vacation.status.in_(["HR Approved", "Approved", "Manager Approved"]),
            )

        leave_up_stmt = leave_up_stmt.order_by(Vacation.start_date.asc()).limit(5)
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

        # 8. Upcoming Birthdays (Sorted by nearest calendar date)
        bday_stmt = (
            select(
                Employee.id,
                Employee.full_name,
                Employee.date_of_birth,
                Employee.job_title,
                Department.name.label("department_name"),
            )
            .outerjoin(Department, Employee.department_id == Department.id)
            .where(
                Employee.is_deleted == False,
                Employee.is_active == True,
                Employee.date_of_birth.is_not(None),
            )
        )
        if role_id == ROLE_MANAGER and dept_id:
            bday_stmt = bday_stmt.where(Employee.department_id == dept_id)
        elif role_id == ROLE_EMPLOYEE and dept_id:
            bday_stmt = bday_stmt.where(Employee.department_id == dept_id)

        all_bday_rows = db.execute(bday_stmt).all()
        scored_bdays = []
        for r in all_bday_rows:
            if not r.date_of_birth:
                continue
            dob = r.date_of_birth
            try:
                this_year_bday = dob.replace(year=today.year)
            except ValueError:
                this_year_bday = dob.replace(year=today.year, day=28)

            if this_year_bday < today:
                try:
                    next_bday = dob.replace(year=today.year + 1)
                except ValueError:
                    next_bday = dob.replace(year=today.year + 1, day=28)
            else:
                next_bday = this_year_bday

            days_until = (next_bday - today).days
            scored_bdays.append((days_until, r, next_bday))

        scored_bdays.sort(key=lambda x: x[0])
        upcoming_birthdays = [
            {
                "id": r.id,
                "full_name": r.full_name,
                "date_of_birth": str(r.date_of_birth),
                "next_birthday": str(next_bday),
                "days_until": days_until,
                "job_title": r.job_title,
                "department_name": r.department_name,
            }
            for days_until, r, next_bday in scored_bdays[:5]
        ]

        # 9. Pending Approvals (only for Admin and Manager)
        if role_id == ROLE_EMPLOYEE:
            pending_approvals = []
        else:
            pending_stmt = (
                select(
                    Vacation.id,
                    Vacation.type,
                    Vacation.start_date,
                    Vacation.end_date,
                    Vacation.reason,
                    Employee.full_name.label("requested_by_name"),
                )
                .join(Employee, Vacation.requested_by == Employee.id)
                .where(Vacation.status == "Pending")
            )
            if role_id == ROLE_MANAGER and dept_id:
                pending_stmt = pending_stmt.where(Employee.department_id == dept_id)
            pending_stmt = pending_stmt.order_by(Vacation.created_at.desc()).limit(5)
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

        # 10. Monthly Activity
        six_months_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            days=183
        )
        created_rows = db.execute(
            select(Task.created_at).where(
                task_filter, Task.created_at >= six_months_ago
            )
        ).all()
        month_counts: dict[str, int] = {}
        for row in created_rows:
            if row.created_at:
                m_key = row.created_at.strftime("%Y-%m")
                month_counts[m_key] = month_counts.get(m_key, 0) + 1
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
