"""add_topic_id_to_tasks_and_backlog_items

Revision ID: 9d2e31f839c5
Revises: 8c1d21f839c4
Create Date: 2026-07-25 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d2e31f839c5'
down_revision: Union[str, Sequence[str], None] = '8c1d21f839c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('tasks', sa.Column('topic_id', sa.Integer(), sa.ForeignKey('discussion_topics.id'), nullable=True))
    op.add_column('backlog_items', sa.Column('topic_id', sa.Integer(), sa.ForeignKey('discussion_topics.id'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('backlog_items', 'topic_id')
    op.drop_column('tasks', 'topic_id')
