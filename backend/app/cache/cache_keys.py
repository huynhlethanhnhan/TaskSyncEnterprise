# 📂 FILE: app/cache/cache_keys.py
"""
Centralized cache key generator functions to enforce consistent naming patterns.
"""

def get_department_key(department_id: int) -> str:
    """Generates the cache key for a specific department."""
    return f"department:{department_id}"


def get_department_list_key(skip: int = 0, limit: int = 20, search: str | None = None) -> str:
    """Generates cache key for department list with pagination and search parameters."""
    search_part = f":s_{search}" if search else ""
    return f"department:list:{skip}:{limit}{search_part}"


def get_employee_key(employee_id: int) -> str:
    """Generates the cache key for a specific employee profile."""
    return f"employee:{employee_id}"


def get_employee_list_key(skip: int = 0, limit: int = 20) -> str:
    """Generates cache key for employee list with pagination parameters."""
    return f"employee:list:{skip}:{limit}"


def get_employee_search_key(keyword: str) -> str:
    """Generates cache key for employee search query."""
    return f"employee:search:{keyword}"


def get_project_key(project_id: int) -> str:
    """Generates the cache key for a specific project."""
    return f"project:{project_id}"


def get_project_list_key(skip: int = 0, limit: int = 20) -> str:
    """Generates the cache key for the projects list with pagination parameters."""
    return f"project:list:{skip}:{limit}"


def get_role_key(role_id: int) -> str:
    """Generates the cache key for a specific role."""
    return f"role:{role_id}"


def get_role_list_key() -> str:
    """Generates static cache key for roles list."""
    return "role:list"


def get_dashboard_summary_key() -> str:
    """Generates the static cache key for the dashboard summary."""
    return "dashboard:summary"


def get_dashboard_analytics_key() -> str:
    """Generates the static cache key for dashboard analytics."""
    return "dashboard:analytics"


def get_task_list_key(skip: int = 0, limit: int = 20, project_id: int | None = None, status: str | None = None) -> str:
    """Generates cache key for task list with pagination and filter options."""
    proj_part = f":p_{project_id}" if project_id else ""
    status_part = f":s_{status}" if status else ""
    return f"task:list:{skip}:{limit}{proj_part}{status_part}"
