"""Read-only diagnostics for project, organization, sprint, and task relations."""

from __future__ import annotations

import sys
from collections.abc import Iterable
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.database import engine

CHECKS: tuple[tuple[str, str], ...] = (
    (
        "projects_with_team_without_department",
        """
        SELECT COUNT(*) FROM dbo.projects
        WHERE team_id IS NOT NULL AND department_id IS NULL AND is_deleted = 0
        """,
    ),
    (
        "projects_with_team_department_mismatch",
        """
        SELECT COUNT(*) FROM dbo.projects p
        JOIN dbo.teams tm ON tm.id = p.team_id
        WHERE p.department_id IS NOT NULL
          AND tm.department_id <> p.department_id
          AND p.is_deleted = 0
        """,
    ),
    (
        "employees_with_team_department_mismatch",
        """
        SELECT COUNT(*) FROM dbo.employees e
        JOIN dbo.teams tm ON tm.id = e.team_id
        WHERE (e.department_id IS NULL OR e.department_id <> tm.department_id)
          AND e.is_deleted = 0
        """,
    ),
    (
        "project_members_outside_project_organization",
        """
        SELECT COUNT(*) FROM dbo.project_members pm
        JOIN dbo.projects p ON p.id = pm.project_id
        JOIN dbo.employees e ON e.id = pm.employee_id
        WHERE (p.team_id IS NOT NULL AND (e.team_id IS NULL OR e.team_id <> p.team_id))
           OR (p.team_id IS NULL AND p.department_id IS NOT NULL
               AND (e.department_id IS NULL OR e.department_id <> p.department_id))
           OR (p.team_id IS NULL AND p.department_id IS NULL)
        """,
    ),
    (
        "task_assignees_not_eligible",
        """
        SELECT COUNT(*) FROM dbo.task_assignments ta
        JOIN dbo.tasks t ON t.id = ta.task_id
        JOIN dbo.projects p ON p.id = t.project_id
        JOIN dbo.employees e ON e.id = ta.employee_id
        WHERE NOT (
            p.team_id IS NOT NULL
            AND (
                e.team_id = p.team_id
                OR EXISTS (
                    SELECT 1 FROM dbo.project_members pm
                    WHERE pm.project_id = p.id AND pm.employee_id = e.id
                )
            )
            OR p.team_id IS NULL
               AND p.department_id IS NOT NULL
               AND (
                   e.department_id = p.department_id
                   OR EXISTS (
                       SELECT 1 FROM dbo.project_members pm
                       WHERE pm.project_id = p.id AND pm.employee_id = e.id
                   )
               )
        )
        """,
    ),
    (
        "tasks_with_sprint_project_mismatch",
        """
        SELECT COUNT(*) FROM dbo.tasks t
        JOIN dbo.sprints s ON s.id = t.sprint_id
        WHERE t.project_id <> s.project_id
        """,
    ),
    (
        "duplicate_project_memberships",
        """
        SELECT COUNT(*) FROM (
            SELECT project_id, employee_id
            FROM dbo.project_members
            GROUP BY project_id, employee_id
            HAVING COUNT(*) > 1
        ) duplicate_groups
        """,
    ),
    (
        "orphaned_association_records",
        """
        SELECT
            (SELECT COUNT(*) FROM dbo.project_members pm
             LEFT JOIN dbo.projects p ON p.id = pm.project_id
             LEFT JOIN dbo.employees e ON e.id = pm.employee_id
             WHERE p.id IS NULL OR e.id IS NULL)
          + (SELECT COUNT(*) FROM dbo.task_assignments ta
             LEFT JOIN dbo.tasks t ON t.id = ta.task_id
             LEFT JOIN dbo.employees e ON e.id = ta.employee_id
             WHERE t.id IS NULL OR e.id IS NULL)
        """,
    ),
    (
        "inactive_employees_assigned_to_tasks",
        """
        SELECT COUNT(*) FROM dbo.task_assignments ta
        JOIN dbo.employees e ON e.id = ta.employee_id
        WHERE e.is_active = 0 OR e.is_deleted = 1
        """,
    ),
    (
        "inactive_organization_units_referenced",
        """
        SELECT
            (SELECT COUNT(*) FROM dbo.projects p
             JOIN dbo.departments d ON d.id = p.department_id
             WHERE d.is_active = 0 AND p.is_deleted = 0)
          + (SELECT COUNT(*) FROM dbo.projects p
             JOIN dbo.teams tm ON tm.id = p.team_id
             WHERE tm.is_active = 0 AND p.is_deleted = 0)
          + (SELECT COUNT(*) FROM dbo.employees e
             JOIN dbo.departments d ON d.id = e.department_id
             WHERE d.is_active = 0 AND e.is_deleted = 0)
          + (SELECT COUNT(*) FROM dbo.employees e
             JOIN dbo.teams tm ON tm.id = e.team_id
             WHERE tm.is_active = 0 AND e.is_deleted = 0)
        """,
    ),
)


def _run_checks() -> Iterable[tuple[str, int]]:
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            for name, statement in CHECKS:
                count = int(connection.scalar(text(statement)) or 0)
                yield name, count
        finally:
            transaction.rollback()


def main() -> int:
    print("Project relationship diagnostic (read-only)")
    print(f"database={engine.url.database or '[not configured]'}")
    print(f"driver={engine.url.drivername}")
    print("credentials=[masked]")

    try:
        results = list(_run_checks())
    except SQLAlchemyError as error:
        print(f"diagnostic_error={type(error).__name__}", file=sys.stderr)
        return 3

    total = 0
    for name, count in results:
        total += count
        severity = "CRITICAL" if count else "OK"
        print(f"{severity:8} {name}={count}")

    print(f"total_inconsistencies={total}")
    return 2 if total else 0


if __name__ == "__main__":
    raise SystemExit(main())
