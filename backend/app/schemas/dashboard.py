# 📂 FILE: app/schemas/dashboard.py
from pydantic import BaseModel, Field

class DashboardOverviewResponse(BaseModel):
    """Schema representing count summaries for dashboard widgets."""
    total_employees: int = Field(..., description="Total employees count")
    active_employees: int = Field(..., description="Active employees count")
    inactive_employees: int = Field(..., description="Inactive employees count")
    total_departments: int = Field(..., description="Total active departments count")
    total_projects: int = Field(..., description="Total projects count")
    active_projects: int = Field(..., description="Active projects count")
    total_tasks: int = Field(..., description="Total tasks count")
    completed_tasks: int = Field(..., description="Completed tasks count")
    pending_tasks: int = Field(..., description="Pending tasks count")
    overdue_tasks: int = Field(..., description="Overdue tasks count")
    vacation_requests: int = Field(..., description="Total vacation requests count")
    pending_vacation_requests: int = Field(..., description="Pending vacation requests count")


class StatusBreakdown(BaseModel):
    """Generic status distribution counts."""
    status: str = Field(..., description="Status name")
    count: int = Field(..., description="Count of occurrences")


class DepartmentBreakdown(BaseModel):
    """Employee headcount distribution by department."""
    department_name: str = Field(..., description="Department name")
    employee_count: int = Field(..., description="Total active employees headcount")


class DashboardAnalyticsResponse(BaseModel):
    """Aggregated response containing overview numbers and category distributions."""
    overview: DashboardOverviewResponse
    tasks_by_status: list[StatusBreakdown]
    projects_by_status: list[StatusBreakdown]
    employees_by_department: list[DepartmentBreakdown]