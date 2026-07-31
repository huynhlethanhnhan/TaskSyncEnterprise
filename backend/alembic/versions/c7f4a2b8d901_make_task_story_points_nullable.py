"""make task story points nullable

Revision ID: c7f4a2b8d901
Revises: 9d2e31f839c5
Create Date: 2026-07-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7f4a2b8d901"
down_revision: Union[str, Sequence[str], None] = "9d2e31f839c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_story_points_default() -> None:
    op.execute(
        """
        DECLARE @ConstraintName nvarchar(200)
        SELECT @ConstraintName = d.name
        FROM sys.default_constraints d
        JOIN sys.columns c
          ON d.parent_column_id = c.column_id
         AND d.parent_object_id = c.object_id
        WHERE d.parent_object_id = object_id('dbo.tasks')
          AND c.name = 'story_points'

        IF @ConstraintName IS NOT NULL
            EXEC(
                'ALTER TABLE dbo.tasks DROP CONSTRAINT ['
                + @ConstraintName + ']'
            )
        """
    )


def upgrade() -> None:
    _drop_story_points_default()
    op.alter_column(
        "tasks",
        "story_points",
        existing_type=sa.Integer(),
        nullable=True,
        schema="dbo",
    )


def downgrade() -> None:
    op.execute("UPDATE dbo.tasks SET story_points = 0 WHERE story_points IS NULL")
    op.alter_column(
        "tasks",
        "story_points",
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text("0"),
        schema="dbo",
    )
