"""Store user-facing business text as SQL Server Unicode types.

Revision ID: 7b31f6e4c2a0
Revises: d524f5f3f22d
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7b31f6e4c2a0"
down_revision: Union[str, Sequence[str], None] = "d524f5f3f22d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


UNICODE_COLUMNS = (
    ("departments", "name", sa.String(100), sa.Unicode(100), False),
    ("departments", "description", sa.Text(), sa.UnicodeText(), True),
    ("teams", "name", sa.String(100), sa.Unicode(100), False),
    ("teams", "description", sa.Text(), sa.UnicodeText(), True),
    ("roles", "description", sa.String(255), sa.Unicode(255), True),
    ("employees", "full_name", sa.String(150), sa.Unicode(150), False),
    ("employees", "phone", sa.String(), sa.Unicode(50), True),
    ("employees", "gender", sa.String(), sa.Unicode(30), True),
    ("employees", "address", sa.String(), sa.UnicodeText(), True),
    ("employees", "job_title", sa.String(), sa.Unicode(150), True),
    ("projects", "name", sa.String(200), sa.Unicode(200), False),
    ("projects", "description", sa.Text(), sa.UnicodeText(), True),
    ("projects", "status", sa.String(30), sa.Unicode(30), False),
    ("projects", "priority", sa.String(20), sa.Unicode(20), False),
    ("tasks", "title", sa.String(200), sa.Unicode(200), False),
    ("tasks", "description", sa.Text(), sa.UnicodeText(), True),
    ("tasks", "priority", sa.String(20), sa.Unicode(20), False),
    ("tasks", "status", sa.String(30), sa.Unicode(30), False),
    ("task_checklists", "title", sa.String(), sa.UnicodeText(), False),
    ("task_comments", "content", sa.Text(), sa.UnicodeText(), False),
    ("vacations", "type", sa.String(100), sa.Unicode(100), False),
    ("vacations", "reason", sa.String(500), sa.Unicode(500), True),
    ("vacations", "status", sa.String(50), sa.Unicode(50), False),
)


def _drop_unique_constraint(table: str, column: str) -> None:
    """Drop the SQL Server-generated single-column unique constraint, if present."""
    op.execute(
        f"""
        DECLARE @constraint_name sysname;
        SELECT TOP (1) @constraint_name = kc.name
        FROM sys.key_constraints AS kc
        JOIN sys.index_columns AS ic
          ON ic.object_id = kc.parent_object_id
         AND ic.index_id = kc.unique_index_id
        JOIN sys.columns AS c
          ON c.object_id = ic.object_id
         AND c.column_id = ic.column_id
        WHERE kc.parent_object_id = OBJECT_ID(N'dbo.{table}')
          AND kc.[type] = 'UQ'
          AND c.name = N'{column}';

        IF @constraint_name IS NOT NULL
            EXEC(N'ALTER TABLE dbo.{table} DROP CONSTRAINT [' + @constraint_name + N']');
        """
    )


def _drop_default_constraint(table: str, column: str) -> None:
    op.execute(
        f"""
        DECLARE @constraint_name sysname;
        SELECT @constraint_name = dc.name
        FROM sys.default_constraints AS dc
        JOIN sys.columns AS c
          ON c.object_id = dc.parent_object_id
         AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.{table}')
          AND c.name = N'{column}';

        IF @constraint_name IS NOT NULL
            EXEC(N'ALTER TABLE dbo.{table} DROP CONSTRAINT [' + @constraint_name + N']');
        """
    )


def upgrade() -> None:
    _drop_unique_constraint("departments", "name")
    for table, column in (
        ("projects", "status"),
        ("projects", "priority"),
        ("tasks", "status"),
        ("tasks", "priority"),
        ("vacations", "status"),
    ):
        _drop_default_constraint(table, column)
    for table, column, old_type, unicode_type, nullable in UNICODE_COLUMNS:
        op.alter_column(
            table,
            column,
            existing_type=old_type,
            type_=unicode_type,
            existing_nullable=nullable,
            schema="dbo",
        )
    op.create_unique_constraint(
        "uq_departments_name", "departments", ["name"], schema="dbo"
    )
    op.execute("ALTER TABLE dbo.projects ADD CONSTRAINT df_projects_status DEFAULT N'Planning' FOR status")
    op.execute("ALTER TABLE dbo.projects ADD CONSTRAINT df_projects_priority DEFAULT N'Medium' FOR priority")
    op.execute("ALTER TABLE dbo.tasks ADD CONSTRAINT df_tasks_status DEFAULT N'To Do' FOR status")
    op.execute("ALTER TABLE dbo.tasks ADD CONSTRAINT df_tasks_priority DEFAULT N'Medium' FOR priority")
    op.execute("ALTER TABLE dbo.vacations ADD CONSTRAINT df_vacations_status DEFAULT N'Pending' FOR status")


def downgrade() -> None:
    # Downgrading can destroy characters outside the database code page. Keep it
    # explicit instead of silently converting user data back to VARCHAR.
    raise RuntimeError(
        "Unicode business columns cannot be safely downgraded to VARCHAR. "
        "Restore from a pre-migration backup if rollback is required."
    )
