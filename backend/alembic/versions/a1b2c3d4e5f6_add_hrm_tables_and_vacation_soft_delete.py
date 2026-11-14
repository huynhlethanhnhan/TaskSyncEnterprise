"""Add HRM tables and vacation soft delete

Revision ID: a1b2c3d4e5f6
Revises: 91d53e9f6c91
Create Date: 2026-11-14 14:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "91d53e9f6c91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return (
        inspector.has_table(table_name)
        or inspector.has_table(table_name, schema="dbo")
    )


def _column_exists(inspector: sa.Inspector, table_name: str, col_name: str) -> bool:
    for schema in (None, "dbo"):
        if inspector.has_table(table_name, schema=schema):
            cols = {c["name"] for c in inspector.get_columns(table_name, schema=schema)}
            if col_name in cols:
                return True
    return False


def upgrade() -> None:
    """Upgrade schema cleanly with Backend-First HRM extensions."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Soft-delete columns for vacations
    if not _column_exists(inspector, "vacations", "is_deleted"):
        op.add_column(
            "vacations",
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )
    if not _column_exists(inspector, "vacations", "deleted_at"):
        op.add_column(
            "vacations",
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
        )
    if not _column_exists(inspector, "vacations", "deleted_by_id"):
        op.add_column(
            "vacations",
            sa.Column(
                "deleted_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id", name="fk_vacations_deleted_by_id"),
                nullable=True,
            ),
        )

    # 2. leave_balances
    if not _table_exists(inspector, "leave_balances"):
        op.create_table(
            "leave_balances",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "employee_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=False,
            ),
            sa.Column("leave_year", sa.Integer(), nullable=False),
            sa.Column(
                "annual_entitlement",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("12.00"),
            ),
            sa.Column(
                "carried_over_days",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "used_days",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "pending_days",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint(
                "employee_id", "leave_year", name="uq_leave_balances_emp_year"
            ),
            sa.CheckConstraint(
                "leave_year BETWEEN 2020 AND 2100", name="ck_leave_balances_year"
            ),
            sa.CheckConstraint(
                "annual_entitlement >= 0 AND carried_over_days >= 0 "
                "AND used_days >= 0 AND pending_days >= 0",
                name="ck_leave_balances_non_negative",
            ),
        )
        op.create_index(
            "ix_dbo_leave_balances_id", "leave_balances", ["id"]
        )
        op.create_index(
            "ix_dbo_leave_balances_employee_id", "leave_balances", ["employee_id"]
        )
        op.create_index(
            "ix_dbo_leave_balances_leave_year", "leave_balances", ["leave_year"]
        )

    # 3. employment_contracts
    if not _table_exists(inspector, "employment_contracts"):
        op.create_table(
            "employment_contracts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "employee_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=False,
            ),
            sa.Column("contract_code", sa.Unicode(50), unique=True, nullable=False),
            sa.Column(
                "contract_type",
                sa.Unicode(50),
                nullable=False,
                server_default=sa.text("N'Indefinite'"),
            ),
            sa.Column("base_salary", sa.Numeric(18, 2), nullable=False),
            sa.Column(
                "allowance",
                sa.Numeric(18, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "currency",
                sa.Unicode(10),
                nullable=False,
                server_default=sa.text("N'VND'"),
            ),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column(
                "status",
                sa.Unicode(30),
                nullable=False,
                server_default=sa.text("N'Active'"),
            ),
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column(
                "updated_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column(
                "deleted_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.CheckConstraint(
                "base_salary >= 0 AND allowance >= 0", name="ck_contracts_salary"
            ),
            sa.CheckConstraint(
                "end_date IS NULL OR end_date >= start_date", name="ck_contracts_dates"
            ),
        )
        op.create_index(
            "ix_dbo_employment_contracts_id",
            "employment_contracts",
            ["id"],
        )
        op.create_index(
            "ix_dbo_employment_contracts_employee_id",
            "employment_contracts",
            ["employee_id"],
        )

    # 4. attendance_logs
    if not _table_exists(inspector, "attendance_logs"):
        op.create_table(
            "attendance_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "employee_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=False,
            ),
            sa.Column("work_date", sa.Date(), nullable=False),
            sa.Column("check_in", sa.Time(), nullable=True),
            sa.Column("check_out", sa.Time(), nullable=True),
            sa.Column(
                "work_hours",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "overtime_hours",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "status",
                sa.Unicode(30),
                nullable=False,
                server_default=sa.text("N'Present'"),
            ),
            sa.Column("note", sa.Unicode(255), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.UniqueConstraint(
                "employee_id", "work_date", name="uq_attendance_logs_emp_date"
            ),
            sa.CheckConstraint(
                "work_hours >= 0 AND work_hours <= 24 AND overtime_hours >= 0 AND overtime_hours <= 24",
                name="ck_attendance_logs_hours",
            ),
        )
        op.create_index(
            "ix_dbo_attendance_logs_id", "attendance_logs", ["id"]
        )
        op.create_index(
            "ix_dbo_attendance_logs_employee_id", "attendance_logs", ["employee_id"]
        )
        op.create_index(
            "ix_dbo_attendance_logs_work_date", "attendance_logs", ["work_date"]
        )

    # 5. overtime_requests
    if not _table_exists(inspector, "overtime_requests"):
        op.create_table(
            "overtime_requests",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "employee_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=False,
            ),
            sa.Column(
                "project_id",
                sa.Integer(),
                sa.ForeignKey("projects.id"),
                nullable=True,
            ),
            sa.Column("work_date", sa.Date(), nullable=False),
            sa.Column("hours", sa.Numeric(4, 2), nullable=False),
            sa.Column("reason", sa.Unicode(500), nullable=True),
            sa.Column(
                "status",
                sa.Unicode(30),
                nullable=False,
                server_default=sa.text("N'Pending'"),
            ),
            sa.Column("team_leader_note", sa.Unicode(300), nullable=True),
            sa.Column(
                "approved_by",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column(
                "updated_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column(
                "deleted_by_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.CheckConstraint(
                "hours > 0 AND hours <= 16", name="ck_overtime_requests_hours"
            ),
        )
        op.create_index(
            "ix_dbo_overtime_requests_id", "overtime_requests", ["id"]
        )
        op.create_index(
            "ix_dbo_overtime_requests_employee_id", "overtime_requests", ["employee_id"]
        )
        op.create_index(
            "ix_dbo_overtime_requests_project_id", "overtime_requests", ["project_id"]
        )
        op.create_index(
            "ix_dbo_overtime_requests_work_date", "overtime_requests", ["work_date"]
        )

    # 6. backup_history_logs
    if not _table_exists(inspector, "backup_history_logs"):
        op.create_table(
            "backup_history_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("backup_type", sa.Unicode(30), nullable=False),
            sa.Column("database_name", sa.Unicode(128), nullable=False),
            sa.Column("backup_path", sa.Unicode(500), nullable=True),
            sa.Column(
                "status",
                sa.Unicode(30),
                nullable=False,
                server_default=sa.text("N'SUCCESS'"),
            ),
            sa.Column(
                "performed_by",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=True,
            ),
            sa.Column("notes", sa.Unicode(500), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
        )
        op.create_index(
            "ix_dbo_backup_history_logs_id", "backup_history_logs", ["id"]
        )


def _drop_mssql_col_constraints(table_name: str, column_name: str) -> None:
    """Drops SQL Server default and foreign-key constraints on a column before DROP COLUMN."""
    op.execute(
        f"""
        DECLARE @sql NVARCHAR(MAX) = N'';
        SELECT @sql += N'ALTER TABLE dbo.{table_name} DROP CONSTRAINT [' + dc.name + N'];'
        FROM sys.default_constraints dc
        JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.{table_name}') AND c.name = N'{column_name}';

        SELECT @sql += N'ALTER TABLE dbo.{table_name} DROP CONSTRAINT [' + fk.name + N'];'
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.{table_name}') AND c.name = N'{column_name}';

        IF LEN(@sql) > 0 EXEC sp_executesql @sql;
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    is_mssql = bind.dialect.name == "mssql"

    for tbl in (
        "backup_history_logs",
        "overtime_requests",
        "attendance_logs",
        "employment_contracts",
        "leave_balances",
    ):
        if _table_exists(inspector, tbl):
            op.drop_table(tbl)

    for col in ("deleted_by_id", "deleted_at", "is_deleted"):
        if _column_exists(inspector, "vacations", col):
            if is_mssql:
                _drop_mssql_col_constraints("vacations", col)
            op.drop_column("vacations", col)
