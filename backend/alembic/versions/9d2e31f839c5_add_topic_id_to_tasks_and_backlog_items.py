"""add_topic_id_to_tasks_and_backlog_items

Revision ID: 9d2e31f839c5
Revises: 8c1d21f839c4
Create Date: 2026-07-25 00:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "9d2e31f839c5"
down_revision: Union[str, Sequence[str], None] = "8c1d21f839c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def find_foreign_key_name(
    table_name: str,
    constrained_columns: set[str],
    referred_table: str,
    schema: str = "dbo",
) -> str | None:
    """Dynamically locate a foreign key constraint name by table and column mapping."""
    bind = op.get_bind()
    inspector = inspect(bind)

    for fk in inspector.get_foreign_keys(table_name, schema=schema):
        fk_columns = set(fk.get("constrained_columns") or [])
        raw_ref_table = fk.get("referred_table") or ""
        ref_table = raw_ref_table.split(".")[-1]

        if fk_columns == constrained_columns and ref_table == referred_table:
            return fk.get("name")

    return None


def safe_drop_foreign_key(
    table_name: str,
    constrained_columns: set[str],
    referred_table: str,
    schema: str = "dbo",
) -> None:
    """Safely drop a foreign key constraint if found dynamically in metadata."""
    fk_name = find_foreign_key_name(
        table_name, constrained_columns, referred_table, schema=schema
    )
    if fk_name:
        op.drop_constraint(fk_name, table_name, type_="foreignkey", schema=schema)


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "tasks",
        sa.Column(
            "topic_id",
            sa.Integer(),
            sa.ForeignKey("discussion_topics.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "backlog_items",
        sa.Column(
            "topic_id",
            sa.Integer(),
            sa.ForeignKey("discussion_topics.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    safe_drop_foreign_key("backlog_items", {"topic_id"}, "discussion_topics")
    safe_drop_foreign_key("tasks", {"topic_id"}, "discussion_topics")
    op.drop_column("backlog_items", "topic_id")
    op.drop_column("tasks", "topic_id")
