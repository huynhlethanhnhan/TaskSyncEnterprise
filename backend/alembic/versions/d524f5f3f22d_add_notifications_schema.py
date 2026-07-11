"""add_notifications_schema

Revision ID: d524f5f3f22d
Revises: 02d5a99d9c9c
Create Date: 2026-07-11 09:01:56.992438

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
"""add_notifications_schema

Revision ID: d524f5f3f22d
Revises: 02d5a99d9c9c
Create Date: 2026-07-11 09:01:56.992438

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision: str = 'd524f5f3f22d'
down_revision: Union[str, Sequence[str], None] = '02d5a99d9c9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create notification_preferences table
    op.create_table('notification_preferences',
    sa.Column('employee_id', sa.Integer(), nullable=False),
    sa.Column('notification_type', sa.Unicode(length=50), nullable=False),
    sa.Column('channel', sa.Unicode(length=20), nullable=False),
    sa.Column('enabled', sa.Boolean(), server_default=sa.text('1'), nullable=False),
    sa.CheckConstraint("channel IN (N'IN_APP', N'EMAIL', N'WEBSOCKET', N'PUSH', N'SMS', N'SLACK', N'TEAMS')", name='ck_dbo_notification_preferences_channel'),
    sa.CheckConstraint("notification_type IN (N'AUTHENTICATION', N'TASKS', N'PROJECTS', N'VACATION', N'COMMENTS', N'SYSTEM')", name='ck_dbo_notification_preferences_type'),
    sa.ForeignKeyConstraint(['employee_id'], ['dbo.employees.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('employee_id', 'notification_type', 'channel'),
    schema='dbo'
    )
    
    # 2. Create notification_logs table
    op.create_table('notification_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('notification_id', sa.Integer(), nullable=False),
    sa.Column('channel', sa.Unicode(length=20), nullable=False),
    sa.Column('delivery_status', sa.Unicode(length=20), nullable=False),
    sa.Column('retry_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('provider_response', sa.UnicodeText(), nullable=True),
    sa.Column('duration_ms', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('SYSUTCDATETIME()'), nullable=False),
    sa.CheckConstraint("channel IN (N'IN_APP', N'EMAIL', N'WEBSOCKET', N'PUSH', N'SMS', N'SLACK', N'TEAMS')", name='ck_dbo_notification_logs_channel'),
    sa.CheckConstraint("delivery_status IN (N'PENDING', N'PROCESSING', N'SENT', N'FAILED', N'READ', N'ARCHIVED')", name='ck_dbo_notification_logs_delivery_status'),
    sa.ForeignKeyConstraint(['notification_id'], ['dbo.notifications.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    schema='dbo'
    )
    op.create_index(op.f('ix_dbo_notification_logs_id'), 'notification_logs', ['id'], unique=False, schema='dbo')
    op.create_index(op.f('ix_dbo_notification_logs_notification_id'), 'notification_logs', ['notification_id'], unique=False, schema='dbo')
    
    # 3. Standardize audit_logs timestamp nullability
    op.alter_column('audit_logs', 'timestamp',
               existing_type=sa.DATETIME(),
               nullable=False,
               existing_server_default=sa.text('(sysutcdatetime())'))
               
    # 4. Modify existing notifications table (safe migration with defaults for new not-null columns)
    op.add_column('notifications', sa.Column('type', sa.Unicode(length=50), server_default=sa.text("N'SYSTEM'"), nullable=False), schema='dbo')
    op.add_column('notifications', sa.Column('priority', sa.Unicode(length=20), server_default=sa.text("N'NORMAL'"), nullable=False), schema='dbo')
    op.add_column('notifications', sa.Column('status', sa.Unicode(length=20), server_default=sa.text("N'PENDING'"), nullable=False), schema='dbo')
    op.add_column('notifications', sa.Column('channel', sa.Unicode(length=20), server_default=sa.text("N'IN_APP'"), nullable=False), schema='dbo')
    op.add_column('notifications', sa.Column('event_id', sa.Unicode(length=50), nullable=True), schema='dbo')
    op.add_column('notifications', sa.Column('context_json', sa.UnicodeText(), nullable=True), schema='dbo')
    op.add_column('notifications', sa.Column('read_at', sa.DateTime(), nullable=True), schema='dbo')
    op.add_column('notifications', sa.Column('updated_at', sa.DateTime(), nullable=True), schema='dbo')
    
    # 5. Create constraints and indexes for notifications
    op.create_check_constraint(
        'ck_dbo_notifications_priority',
        'notifications',
        "priority IN (N'LOW', N'NORMAL', N'HIGH', N'CRITICAL')",
        schema='dbo'
    )
    op.create_check_constraint(
        'ck_dbo_notifications_status',
        'notifications',
        "status IN (N'PENDING', N'PROCESSING', N'SENT', N'FAILED', N'READ', N'ARCHIVED')",
        schema='dbo'
    )
    op.create_check_constraint(
        'ck_dbo_notifications_channel',
        'notifications',
        "channel IN (N'IN_APP', N'EMAIL', N'WEBSOCKET', N'PUSH', N'SMS', N'SLACK', N'TEAMS')",
        schema='dbo'
    )
    op.create_index(op.f('ix_dbo_notifications_employee_id'), 'notifications', ['employee_id'], unique=False, schema='dbo')
    op.create_index(op.f('ix_dbo_notifications_event_id'), 'notifications', ['event_id'], unique=False, schema='dbo')
    op.create_index(op.f('ix_dbo_notifications_type'), 'notifications', ['type'], unique=False, schema='dbo')


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop indexes and constraints from notifications table
    op.drop_index(op.f('ix_dbo_notifications_type'), table_name='notifications', schema='dbo')
    op.drop_index(op.f('ix_dbo_notifications_event_id'), table_name='notifications', schema='dbo')
    op.drop_index(op.f('ix_dbo_notifications_employee_id'), table_name='notifications', schema='dbo')
    
    op.drop_constraint('ck_dbo_notifications_priority', 'notifications', schema='dbo', type_='check')
    op.drop_constraint('ck_dbo_notifications_status', 'notifications', schema='dbo', type_='check')
    op.drop_constraint('ck_dbo_notifications_channel', 'notifications', schema='dbo', type_='check')

    # 2. Drop added columns from notifications table
    op.drop_column('notifications', 'updated_at', schema='dbo')
    op.drop_column('notifications', 'read_at', schema='dbo')
    op.drop_column('notifications', 'context_json', schema='dbo')
    op.drop_column('notifications', 'event_id', schema='dbo')
    op.drop_column('notifications', 'channel', schema='dbo')
    op.drop_column('notifications', 'status', schema='dbo')
    op.drop_column('notifications', 'priority', schema='dbo')
    op.drop_column('notifications', 'type', schema='dbo')
    
    # 3. Restore audit_logs timestamp nullability
    op.alter_column('audit_logs', 'timestamp',
               existing_type=sa.DATETIME(),
               nullable=True,
               existing_server_default=sa.text('(sysutcdatetime())'))
               
    # 4. Drop notification_logs and notification_preferences tables
    op.drop_index(op.f('ix_dbo_notification_logs_notification_id'), table_name='notification_logs', schema='dbo')
    op.drop_index(op.f('ix_dbo_notification_logs_id'), table_name='notification_logs', schema='dbo')
    op.drop_table('notification_logs', schema='dbo')
    op.drop_table('notification_preferences', schema='dbo')
