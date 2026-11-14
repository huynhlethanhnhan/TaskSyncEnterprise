"""Add payroll_records and recruitment_candidates tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-14 15:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return inspector.has_table(table_name) or inspector.has_table(
        table_name, schema="dbo"
    )


def upgrade() -> None:
    """Create payroll_records and recruitment_candidates tables idempotently."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector, "payroll_records"):
        op.create_table(
            "payroll_records",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "employee_id",
                sa.Integer(),
                sa.ForeignKey("employees.id"),
                nullable=False,
            ),
            sa.Column(
                "contract_id",
                sa.Integer(),
                sa.ForeignKey("employment_contracts.id"),
                nullable=True,
            ),
            sa.Column("pay_period", sa.Unicode(7), nullable=False),
            sa.Column(
                "standard_work_days",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("22.00"),
            ),
            sa.Column(
                "actual_work_days",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "paid_leave_days",
                sa.Numeric(5, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "overtime_hours",
                sa.Numeric(6, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "base_salary",
                sa.Numeric(18, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "allowance",
                sa.Numeric(18, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "overtime_pay",
                sa.Numeric(18, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "bonus",
                sa.Numeric(18, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "deduction",
                sa.Numeric(18, 2),
                nullable=False,
                server_default=sa.text("0.00"),
            ),
            sa.Column(
                "net_salary",
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
            sa.Column(
                "status",
                sa.Unicode(30),
                nullable=False,
                server_default=sa.text("N'Draft'"),
            ),
            sa.Column("note", sa.Unicode(500), nullable=True),
            sa.Column("paid_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("SYSUTCDATETIME()"),
            ),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
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
            sa.UniqueConstraint(
                "employee_id", "pay_period", name="uq_payroll_emp_period"
            ),
            sa.CheckConstraint(
                "standard_work_days > 0 AND actual_work_days >= 0 "
                "AND paid_leave_days >= 0 AND overtime_hours >= 0",
                name="ck_payroll_work_days",
            ),
            sa.CheckConstraint(
                "base_salary >= 0 AND allowance >= 0 AND overtime_pay >= 0 "
                "AND bonus >= 0 AND deduction >= 0 AND net_salary >= 0",
                name="ck_payroll_amounts",
            ),
        )
        op.create_index("ix_dbo_payroll_records_id", "payroll_records", ["id"])
        op.create_index(
            "ix_dbo_payroll_records_employee_id", "payroll_records", ["employee_id"]
        )
        op.create_index(
            "ix_dbo_payroll_records_pay_period", "payroll_records", ["pay_period"]
        )

    if not _table_exists(inspector, "recruitment_candidates"):
        op.create_table(
            "recruitment_candidates",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("full_name", sa.Unicode(150), nullable=False),
            sa.Column("email", sa.Unicode(150), nullable=False),
            sa.Column("phone", sa.Unicode(30), nullable=True),
            sa.Column("applied_position", sa.Unicode(120), nullable=False),
            sa.Column(
                "department_id",
                sa.Integer(),
                sa.ForeignKey("departments.id"),
                nullable=True,
            ),
            sa.Column("expected_salary", sa.Numeric(18, 2), nullable=True),
            sa.Column(
                "stage",
                sa.Unicode(30),
                nullable=False,
                server_default=sa.text("N'Applied'"),
            ),
            sa.Column("interview_date", sa.Date(), nullable=True),
            sa.Column("source", sa.Unicode(100), nullable=True),
            sa.Column("notes", sa.Unicode(500), nullable=True),
            sa.Column(
                "converted_employee_id",
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
        )
        op.create_index(
            "ix_dbo_recruitment_candidates_id", "recruitment_candidates", ["id"]
        )
        op.create_index(
            "ix_dbo_recruitment_candidates_email",
            "recruitment_candidates",
            ["email"],
        )
        op.create_index(
            "ix_dbo_recruitment_candidates_department_id",
            "recruitment_candidates",
            ["department_id"],
        )


def downgrade() -> None:
    """Drop recruitment_candidates and payroll_records if present."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for tbl in ("recruitment_candidates", "payroll_records"):
        if _table_exists(inspector, tbl):
            op.drop_table(tbl)
