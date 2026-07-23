"""Preview or repair the canonical development seed strings after NVARCHAR migration.

This command is intentionally dry-run by default. It only targets stable seed
identifiers or exact known-corrupt seed values and never performs fuzzy replacement.
Run Alembic upgrade first, then pass ``--apply`` for a development database.
"""

from __future__ import annotations

import argparse

from sqlalchemy import select

from app.database import SessionLocal
from app.models.employee import Employee
from app.models.task import Task

EXPECTED_EMPLOYEE = ("demo1@gmail.com", "Huỳnh Lê Thành Nhân")
TASK_REPAIRS = {
    "Tích h?p lu?ng xác th?c JWT": "Tích hợp luồng xác thực JWT",  # utf8-check: intentional-corrupt-fixture
    "Tái c?u trúc UI Dashboard Figma": "Tái cấu trúc UI Dashboard Figma",  # utf8-check: intentional-corrupt-fixture
    "Xác minh lu?c d? co s? d? li?u SQL Server": "Xác minh lược đồ cơ sở dữ liệu SQL Server",  # utf8-check: intentional-corrupt-fixture
}


def repair(*, apply: bool) -> int:
    changes: list[tuple[str, str, str]] = []
    with SessionLocal() as session:
        employee = session.scalar(
            select(Employee).where(Employee.email == EXPECTED_EMPLOYEE[0])
        )
        if employee and employee.full_name != EXPECTED_EMPLOYEE[1]:
            changes.append(
                ("employees.full_name", employee.full_name, EXPECTED_EMPLOYEE[1])
            )
            if apply:
                employee.full_name = EXPECTED_EMPLOYEE[1]

        tasks = session.scalars(select(Task).where(Task.title.in_(TASK_REPAIRS))).all()
        for task in tasks:
            corrected = TASK_REPAIRS[task.title]
            changes.append((f"tasks[{task.id}].title", task.title, corrected))
            if apply:
                task.title = corrected

        if apply:
            session.commit()

    mode = "APPLY" if apply else "DRY-RUN"
    for field, before, after in changes:
        print(f"[{mode}] {field}: {before!r} -> {after!r}")
    print(f"[{mode}] {len(changes)} canonical seed value(s) require repair")
    return len(changes)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the exact canonical seed repairs (default: preview only).",
    )
    args = parser.parse_args()
    repair(apply=args.apply)
