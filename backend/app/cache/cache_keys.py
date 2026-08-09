# 📂 FILE: app/cache/cache_keys.py
"""
Centralized cache key generator functions to enforce consistent naming patterns.
"""


def get_department_key(department_id: int) -> str:
    """Generates the cache key for a specific department."""
    return f"department:{department_id}"


def get_department_list_key(
    skip: int = 0, limit: int = 20, search: str | None = None
) -> str:
    """Generates cache key for department list with pagination and search parameters."""
    search_part = f":s_{search}" if search else ""
    return f"department:list:{skip}:{limit}{search_part}"


def get_employee_key(employee_id: int) -> str:
    """Generates the cache key for a specific employee profile."""
    return f"employee:{employee_id}"


def get_employee_list_key(
    skip: int = 0, limit: int = 20, scope: str | None = None
) -> str:
    """Generates cache key for employee list with pagination parameters."""
    key = f"employee:list:{skip}:{limit}"
    return f"{key}:scope_{scope}" if scope else key


def get_employee_search_key(keyword: str) -> str:
    """Generates cache key for employee search query."""
    return f"employee:search:{keyword}"


def get_project_key(project_id: int) -> str:
    """Generates the cache key for a specific project."""
    return f"project:{project_id}"


def get_project_list_key(
    skip: int = 0,
    limit: int = 20,
    user_id: int | None = None,
    department_id: int | None = None,
    team_id: int | None = None,
    status: str | None = None,
) -> str:
    """Generates the cache key for the projects list with pagination parameters."""
    user_part = f":u_{user_id}" if user_id is not None else ""
    department_part = f":d_{department_id}" if department_id is not None else ""
    team_part = f":t_{team_id}" if team_id is not None else ""
    status_part = f":s_{status}" if status else ""
    return (
        f"project:list:{skip}:{limit}{user_part}"
        f"{department_part}{team_part}{status_part}"
    )


def get_role_key(role_id: int) -> str:
    """Generates the cache key for a specific role."""
    return f"role:{role_id}"


def get_role_list_key() -> str:
    """Generates static cache key for roles list."""
    return "role:list"


def get_dashboard_summary_key(
    user_id: int | None = None, role_id: int | None = None
) -> str:
    """Generates the role/user-scoped cache key for the dashboard summary."""
    if user_id is None or role_id is None:
        return "dashboard:summary"
    return f"dashboard:summary:u_{user_id}:r_{role_id}"


def get_dashboard_analytics_key(
    user_id: int | None = None, role_id: int | None = None
) -> str:
    """Generates the role/user-scoped cache key for dashboard analytics."""
    if user_id is None or role_id is None:
        return "dashboard:analytics"
    return f"dashboard:analytics:u_{user_id}:r_{role_id}"


def get_task_list_key(
    skip: int = 0,
    limit: int = 20,
    project_id: int | None = None,
    status: str | None = None,
    user_id: int | None = None,
) -> str:
    """Generates cache key for task list with pagination and filter options."""
    proj_part = f":p_{project_id}" if project_id else ""
    status_part = f":s_{status}" if status else ""
    user_part = f":u_{user_id}" if user_id is not None else ""
    return f"task:list:{skip}:{limit}{proj_part}{status_part}{user_part}"


def get_task_key(task_id: int) -> str:
    """Generates the cache key for a specific task."""
    return f"task:{task_id}"


# ── Team cache keys ───────────────────────────────────────────────────────────


def get_team_key(team_id: int) -> str:
    """Generates the cache key for a specific team detail."""
    return f"team:{team_id}"


def get_team_list_key(
    skip: int = 0,
    limit: int = 20,
    department_id: int | None = None,
    search: str | None = None,
) -> str:
    """Generates cache key for team list with pagination and filter parameters."""
    dept_part = f":d_{department_id}" if department_id else ""
    search_part = f":s_{search}" if search else ""
    return f"team:list:{skip}:{limit}{dept_part}{search_part}"


# ── Pattern helpers ───────────────────────────────────────────────────────────


def get_department_list_pattern() -> str:
    """Generates pattern for department list cache keys."""
    return "department:list:*"


def get_employee_list_pattern() -> str:
    """Generates pattern for employee list cache keys."""
    return "employee:list:*"


def get_employee_search_pattern() -> str:
    """Generates pattern for employee search cache keys."""
    return "employee:search:*"


def get_project_list_pattern() -> str:
    """Generates pattern for project list cache keys."""
    return "project:list:*"


def get_task_list_pattern() -> str:
    """Generates pattern for task list cache keys."""
    return "task:list:*"


def get_team_list_pattern() -> str:
    """Generates pattern for team list cache keys."""
    return "team:list:*"


def get_sprint_key(sprint_id: int) -> str:
    return f"sprint:{sprint_id}"


def get_sprint_list_pattern() -> str:
    return "sprint:list:*"


def get_sprint_planning_pattern(sprint_id: int | None = None) -> str:
    return (
        f"sprint:{sprint_id}:planning*"
        if sprint_id is not None
        else "sprint:*:planning*"
    )


def get_backlog_list_pattern(project_id: int | None = None) -> str:
    return (
        f"backlog:list:p_{project_id}:*" if project_id is not None else "backlog:list:*"
    )
