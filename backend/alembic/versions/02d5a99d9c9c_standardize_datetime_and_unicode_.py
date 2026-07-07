"""standardize_datetime_and_unicode_defaults

Revision ID: 02d5a99d9c9c
Revises: f69319655bb9
Create Date: 2026-07-07 20:22:59.573565

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02d5a99d9c9c'
down_revision: Union[str, Sequence[str], None] = 'f69319655bb9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def drop_default_constraint(table_name: str, column_name: str) -> None:
    """Helper to dynamically locate and drop existing default constraints on SQL Server."""
    sql = f"""
    DECLARE @ConstraintName nvarchar(200)
    SELECT @ConstraintName = d.name 
    FROM sys.default_constraints d 
    JOIN sys.columns c ON d.parent_column_id = c.column_id AND d.parent_object_id = c.object_id
    WHERE d.parent_object_id = object_id('dbo.{table_name}') 
      AND c.name = '{column_name}'

    IF @ConstraintName IS NOT NULL
        EXEC('ALTER TABLE dbo.{table_name} DROP CONSTRAINT [' + @ConstraintName + ']')
    """
    op.execute(sql)


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Drop existing defaults first
    drop_default_constraint('audit_logs', 'timestamp')
    drop_default_constraint('departments', 'created_at')
    drop_default_constraint('employees', 'created_at')
    drop_default_constraint('notifications', 'created_at')
    drop_default_constraint('project_members', 'joined_at')
    drop_default_constraint('projects', 'status')
    drop_default_constraint('projects', 'priority')
    drop_default_constraint('projects', 'created_at')
    drop_default_constraint('refresh_tokens', 'created_at')
    drop_default_constraint('roles', 'created_at')
    drop_default_constraint('task_assignments', 'assigned_at')
    drop_default_constraint('task_attachments', 'uploaded_at')
    drop_default_constraint('task_comments', 'created_at')
    drop_default_constraint('tasks', 'priority')
    drop_default_constraint('tasks', 'status')
    drop_default_constraint('tasks', 'created_at')
    drop_default_constraint('teams', 'created_at')
    drop_default_constraint('token_blacklist', 'created_at')
    drop_default_constraint('user_sessions', 'created_at')
    drop_default_constraint('vacations', 'status')
    drop_default_constraint('vacations', 'created_at')

    # 2. Run alter columns to set new defaults
    op.alter_column('audit_logs', 'timestamp',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=True)
    
    op.alter_column('departments', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('employees', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('notifications', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('project_members', 'joined_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('projects', 'status',
               existing_type=sa.VARCHAR(length=30, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("N'Planning'"),
               existing_nullable=False)
    op.alter_column('projects', 'priority',
               existing_type=sa.VARCHAR(length=20, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("N'Medium'"),
               existing_nullable=False)
    op.alter_column('projects', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('refresh_tokens', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('roles', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('task_assignments', 'assigned_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('task_attachments', 'uploaded_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('task_comments', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('tasks', 'priority',
               existing_type=sa.VARCHAR(length=20, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("N'Medium'"),
               existing_nullable=False)
    op.alter_column('tasks', 'status',
               existing_type=sa.VARCHAR(length=30, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("N'To Do'"),
               existing_nullable=False)
    op.alter_column('tasks', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('teams', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('token_blacklist', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('user_sessions', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)
    
    op.alter_column('vacations', 'status',
               existing_type=sa.VARCHAR(length=50, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("N'Pending'"),
               existing_nullable=False)
    op.alter_column('vacations', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('SYSUTCDATETIME()'),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop existing defaults first
    drop_default_constraint('audit_logs', 'timestamp')
    drop_default_constraint('departments', 'created_at')
    drop_default_constraint('employees', 'created_at')
    drop_default_constraint('notifications', 'created_at')
    drop_default_constraint('project_members', 'joined_at')
    drop_default_constraint('projects', 'status')
    drop_default_constraint('projects', 'priority')
    drop_default_constraint('projects', 'created_at')
    drop_default_constraint('refresh_tokens', 'created_at')
    drop_default_constraint('roles', 'created_at')
    drop_default_constraint('task_assignments', 'assigned_at')
    drop_default_constraint('task_attachments', 'uploaded_at')
    drop_default_constraint('task_comments', 'created_at')
    drop_default_constraint('tasks', 'priority')
    drop_default_constraint('tasks', 'status')
    drop_default_constraint('tasks', 'created_at')
    drop_default_constraint('teams', 'created_at')
    drop_default_constraint('token_blacklist', 'created_at')
    drop_default_constraint('user_sessions', 'created_at')
    drop_default_constraint('vacations', 'status')
    drop_default_constraint('vacations', 'created_at')

    # 2. Run alter columns to restore old defaults
    op.alter_column('vacations', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    op.alter_column('vacations', 'status',
               existing_type=sa.VARCHAR(length=50, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("('Pending')"),
               existing_nullable=False)
    
    op.alter_column('user_sessions', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('token_blacklist', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('teams', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('tasks', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    op.alter_column('tasks', 'status',
               existing_type=sa.VARCHAR(length=30, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("('To Do')"),
               existing_nullable=False)
    op.alter_column('tasks', 'priority',
               existing_type=sa.VARCHAR(length=20, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("('Medium')"),
               existing_nullable=False)
    
    op.alter_column('task_comments', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('task_attachments', 'uploaded_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('task_assignments', 'assigned_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('roles', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('refresh_tokens', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('projects', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    op.alter_column('projects', 'priority',
               existing_type=sa.VARCHAR(length=20, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("('Medium')"),
               existing_nullable=False)
    op.alter_column('projects', 'status',
               existing_type=sa.VARCHAR(length=30, collation='SQL_Latin1_General_CP1_CI_AS'),
               server_default=sa.text("('Planning')"),
               existing_nullable=False)
    
    op.alter_column('project_members', 'joined_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('notifications', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('employees', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('departments', 'created_at',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=False)
    
    op.alter_column('audit_logs', 'timestamp',
               existing_type=sa.DATETIME(),
               server_default=sa.text('(getdate())'),
               existing_nullable=True)
