"""add organization leadership fields

Revision ID: b7d4e8f1a203
Revises: 7b31f6e4c2a0
Create Date: 2026-07-30 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b7d4e8f1a203"
down_revision: Union[str, Sequence[str], None] = "7b31f6e4c2a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("departments", sa.Column("manager_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_departments_manager_id_employees",
        "departments",
        "employees",
        ["manager_id"],
        ["id"],
    )
    op.add_column("teams", sa.Column("leader_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_teams_leader_id_employees",
        "teams",
        "employees",
        ["leader_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_teams_leader_id_employees",
        "teams",
        type_="foreignkey",
    )
    op.drop_column("teams", "leader_id")
    op.drop_constraint(
        "fk_departments_manager_id_employees",
        "departments",
        type_="foreignkey",
    )
    op.drop_column("departments", "manager_id")
