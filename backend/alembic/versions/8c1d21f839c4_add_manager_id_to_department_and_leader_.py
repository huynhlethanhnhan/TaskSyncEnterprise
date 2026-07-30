"""add_manager_id_to_department_and_leader_id_to_team

Revision ID: 8c1d21f839c4
Revises: 11a2b3c4d5e6
Create Date: 2026-07-24 23:48:25.280532

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c1d21f839c4'
down_revision: Union[str, Sequence[str], None] = '11a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('departments', sa.Column('manager_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=True))
    op.add_column('teams', sa.Column('leader_id', sa.Integer(), sa.ForeignKey('employees.id'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('teams', 'leader_id')
    op.drop_column('departments', 'manager_id')

