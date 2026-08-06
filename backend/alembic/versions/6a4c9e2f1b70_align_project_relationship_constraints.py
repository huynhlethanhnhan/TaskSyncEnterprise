"""align project relationship constraints

Revision ID: 6a4c9e2f1b70
Revises: 05252bd1d012
Create Date: 2026-08-06 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "6a4c9e2f1b70"
down_revision: str | Sequence[str] | None = "05252bd1d012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "dbo"


def _foreign_key_exists(table: str, columns: tuple[str, ...]) -> bool:
    inspector = inspect(op.get_bind())
    return any(
        tuple(fk.get("constrained_columns") or ()) == columns
        for fk in inspector.get_foreign_keys(table, schema=SCHEMA)
    )


def _index_exists(table: str, name: str) -> bool:
    inspector = inspect(op.get_bind())
    return any(
        index.get("name") == name
        for index in inspector.get_indexes(table, schema=SCHEMA)
    )


def _unique_constraint_exists(name: str) -> bool:
    return bool(
        op.get_bind().scalar(
            sa.text("""
                SELECT COUNT(*) FROM sys.key_constraints
                WHERE [type] = 'UQ' AND [name] = :name
                """),
            {"name": name},
        )
    )


def _drop_foreign_key(table: str, columns: tuple[str, ...]) -> None:
    inspector = inspect(op.get_bind())
    for foreign_key in inspector.get_foreign_keys(table, schema=SCHEMA):
        if tuple(foreign_key.get("constrained_columns") or ()) == columns:
            op.drop_constraint(
                foreign_key["name"], table, schema=SCHEMA, type_="foreignkey"
            )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("system_settings", schema=SCHEMA):
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(100), primary_key=True),
            sa.Column("value", sa.UnicodeText(), nullable=True),
            sa.Column("description", sa.Unicode(255), nullable=True),
            sa.Column("updated_by", sa.Integer(), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("SYSUTCDATETIME()"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["updated_by"], ["dbo.employees.id"]),
            schema=SCHEMA,
        )
    if not inspector.has_table("user_preferences", schema=SCHEMA):
        op.create_table(
            "user_preferences",
            sa.Column("employee_id", sa.Integer(), primary_key=True),
            sa.Column(
                "theme",
                sa.String(20),
                server_default=sa.text("'system'"),
                nullable=False,
            ),
            sa.Column(
                "language",
                sa.String(10),
                server_default=sa.text("'vi'"),
                nullable=False,
            ),
            sa.Column(
                "timezone",
                sa.String(50),
                server_default=sa.text("'Asia/Ho_Chi_Minh'"),
                nullable=False,
            ),
            sa.Column(
                "date_format",
                sa.String(20),
                server_default=sa.text("'DD/MM/YYYY'"),
                nullable=False,
            ),
            sa.Column(
                "page_size", sa.Integer(), server_default=sa.text("20"), nullable=False
            ),
            sa.Column(
                "compact_mode",
                sa.Boolean(),
                server_default=sa.text("0"),
                nullable=False,
            ),
            sa.Column(
                "in_app_notifications",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            ),
            sa.Column(
                "email_notifications",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            ),
            sa.Column(
                "task_assigned_notify",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            ),
            sa.Column(
                "task_deadline_notify",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            ),
            sa.Column(
                "sprint_status_notify",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            ),
            sa.Column(
                "project_update_notify",
                sa.Boolean(),
                server_default=sa.text("1"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("SYSUTCDATETIME()"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(
                ["employee_id"], ["dbo.employees.id"], ondelete="CASCADE"
            ),
            schema=SCHEMA,
        )

    # Team ownership is authoritative when backfilling previously nullable data.
    op.execute("""
        UPDATE p
        SET p.department_id = tm.department_id
        FROM dbo.projects p
        JOIN dbo.teams tm ON tm.id = p.team_id
        WHERE p.team_id IS NOT NULL AND p.department_id IS NULL
        """)
    mismatch_count = bind.scalar(sa.text("""
            SELECT COUNT(*) FROM dbo.projects p
            JOIN dbo.teams tm ON tm.id = p.team_id
            WHERE p.department_id <> tm.department_id
            """))
    if mismatch_count:
        raise RuntimeError(
            "Cannot add Project relationship constraints: Team/Department mismatches exist."
        )

    duplicate_count = bind.scalar(sa.text("""
            SELECT COUNT(*) FROM (
                SELECT project_id, employee_id
                FROM dbo.project_members
                GROUP BY project_id, employee_id
                HAVING COUNT(*) > 1
            ) duplicate_groups
            """))
    if duplicate_count:
        raise RuntimeError(
            "Cannot add ProjectMember uniqueness: duplicate memberships exist."
        )

    if not _foreign_key_exists("projects", ("department_id",)):
        op.create_foreign_key(
            "fk_projects_department_id_departments",
            "projects",
            "departments",
            ["department_id"],
            ["id"],
            source_schema=SCHEMA,
            referent_schema=SCHEMA,
        )
    if not _foreign_key_exists("projects", ("team_id",)):
        op.create_foreign_key(
            "fk_projects_team_id_teams",
            "projects",
            "teams",
            ["team_id"],
            ["id"],
            source_schema=SCHEMA,
            referent_schema=SCHEMA,
        )

    # Match Notification.employee_id ondelete semantics declared by the model.
    _drop_foreign_key("notifications", ("employee_id",))
    op.create_foreign_key(
        "fk_notifications_employee_id_employees",
        "notifications",
        "employees",
        ["employee_id"],
        ["id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
        ondelete="CASCADE",
    )

    if not _index_exists("projects", "ix_dbo_projects_department_id"):
        op.create_index(
            "ix_dbo_projects_department_id",
            "projects",
            ["department_id"],
            schema=SCHEMA,
        )
    if not _index_exists("projects", "ix_dbo_projects_team_id"):
        op.create_index(
            "ix_dbo_projects_team_id", "projects", ["team_id"], schema=SCHEMA
        )
    if not _unique_constraint_exists("uq_project_members_project_employee"):
        op.create_unique_constraint(
            "uq_project_members_project_employee",
            "project_members",
            ["project_id", "employee_id"],
            schema=SCHEMA,
        )


def downgrade() -> None:
    if _unique_constraint_exists("uq_project_members_project_employee"):
        op.drop_constraint(
            "uq_project_members_project_employee",
            "project_members",
            schema=SCHEMA,
            type_="unique",
        )
    if _index_exists("projects", "ix_dbo_projects_team_id"):
        op.drop_index("ix_dbo_projects_team_id", table_name="projects", schema=SCHEMA)
    if _index_exists("projects", "ix_dbo_projects_department_id"):
        op.drop_index(
            "ix_dbo_projects_department_id", table_name="projects", schema=SCHEMA
        )
    _drop_foreign_key("projects", ("team_id",))
    _drop_foreign_key("projects", ("department_id",))
    _drop_foreign_key("notifications", ("employee_id",))
    op.create_foreign_key(
        "fk_notifications_employee_id_employees",
        "notifications",
        "employees",
        ["employee_id"],
        ["id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
    )
    inspector = inspect(op.get_bind())
    if inspector.has_table("user_preferences", schema=SCHEMA):
        op.drop_table("user_preferences", schema=SCHEMA)
    if inspector.has_table("system_settings", schema=SCHEMA):
        op.drop_table("system_settings", schema=SCHEMA)
