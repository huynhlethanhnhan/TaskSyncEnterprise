"""alter_notification_unicode

Revision ID: f69319655bb9
Revises: f4e146c8eb61
Create Date: 2026-07-04 04:08:03.749302

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f69319655bb9'
down_revision: Union[str, Sequence[str], None] = 'f4e146c8eb61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Manually alter columns in notifications table to use NVARCHAR
    op.alter_column('notifications', 'title',
               existing_type=sa.String(length=200),
               type_=sa.Unicode(length=200),
               existing_nullable=False,
               schema='dbo')
    op.alter_column('notifications', 'message',
               existing_type=sa.String(length=1000),
               type_=sa.Unicode(length=1000),
               existing_nullable=False,
               schema='dbo')


def downgrade() -> None:
    """Downgrade schema."""
    # Manually revert columns in notifications table to VARCHAR
    op.alter_column('notifications', 'title',
               existing_type=sa.Unicode(length=200),
               type_=sa.String(length=200),
               existing_nullable=False,
               schema='dbo')
    op.alter_column('notifications', 'message',
               existing_type=sa.Unicode(length=1000),
               type_=sa.String(length=1000),
               existing_nullable=False,
               schema='dbo')
