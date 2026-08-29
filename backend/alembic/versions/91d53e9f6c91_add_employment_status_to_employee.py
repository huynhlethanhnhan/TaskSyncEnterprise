"""Add employment_status to Employee

Revision ID: 91d53e9f6c91
Revises: 6a4c9e2f1b70
Create Date: 2026-08-29 19:28:17.716245

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "91d53e9f6c91"
down_revision: Union[str, Sequence[str], None] = "6a4c9e2f1b70"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "employees",
        sa.Column(
            "employment_status", sa.String(50), server_default="Active", nullable=False
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("employees", "employment_status")
