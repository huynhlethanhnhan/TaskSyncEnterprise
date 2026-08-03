"""alter_notification_unicode

Revision ID: f69319655bb9
Revises: f4e146c8eb61
Create Date: 2026-07-04 04:08:03.749302

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'f69319655bb9'
down_revision: Union[str, Sequence[str], None] = 'f4e146c8eb61'
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
    fk_name = find_foreign_key_name(table_name, constrained_columns, referred_table, schema=schema)
    if fk_name:
        op.drop_constraint(fk_name, table_name, type_="foreignkey", schema=schema)


def upgrade() -> None:
    """Upgrade schema."""
    safe_drop_foreign_key('audit_logs', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'audit_logs', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('employees', {'department_id'}, 'departments')
    safe_drop_foreign_key('employees', {'team_id'}, 'teams')
    safe_drop_foreign_key('employees', {'manager_id'}, 'employees')
    safe_drop_foreign_key('employees', {'role_id'}, 'roles')
    op.create_foreign_key(None, 'employees', 'departments', ['department_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'employees', 'roles', ['role_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'employees', 'employees', ['manager_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'employees', 'teams', ['team_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('notifications', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'notifications', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('project_members', {'project_id'}, 'projects')
    safe_drop_foreign_key('project_members', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'project_members', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'project_members', 'projects', ['project_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('projects', {'created_by'}, 'employees')
    op.create_foreign_key(None, 'projects', 'employees', ['created_by'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('refresh_tokens', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'refresh_tokens', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo', ondelete='CASCADE')

    safe_drop_foreign_key('task_assignments', {'task_id'}, 'tasks')
    safe_drop_foreign_key('task_assignments', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'task_assignments', 'tasks', ['task_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'task_assignments', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('task_attachments', {'uploaded_by_id'}, 'employees')
    safe_drop_foreign_key('task_attachments', {'task_id'}, 'tasks')
    op.create_foreign_key(None, 'task_attachments', 'tasks', ['task_id'], ['id'], source_schema='dbo', referent_schema='dbo', ondelete='CASCADE')
    op.create_foreign_key(None, 'task_attachments', 'employees', ['uploaded_by_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('task_checklists', {'task_id'}, 'tasks')
    op.create_foreign_key(None, 'task_checklists', 'tasks', ['task_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('task_comments', {'task_id'}, 'tasks')
    safe_drop_foreign_key('task_comments', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'task_comments', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'task_comments', 'tasks', ['task_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('tasks', {'project_id'}, 'projects')
    safe_drop_foreign_key('tasks', {'created_by'}, 'employees')
    op.create_foreign_key(None, 'tasks', 'projects', ['project_id'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'tasks', 'employees', ['created_by'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('teams', {'department_id'}, 'departments')
    op.create_foreign_key(None, 'teams', 'departments', ['department_id'], ['id'], source_schema='dbo', referent_schema='dbo')

    safe_drop_foreign_key('user_sessions', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'user_sessions', 'employees', ['employee_id'], ['id'], source_schema='dbo', referent_schema='dbo', ondelete='CASCADE')

    safe_drop_foreign_key('vacations', {'approved_by'}, 'employees')
    safe_drop_foreign_key('vacations', {'requested_by'}, 'employees')
    op.create_foreign_key(None, 'vacations', 'employees', ['requested_by'], ['id'], source_schema='dbo', referent_schema='dbo')
    op.create_foreign_key(None, 'vacations', 'employees', ['approved_by'], ['id'], source_schema='dbo', referent_schema='dbo')
    
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
    safe_drop_foreign_key('vacations', {'requested_by'}, 'employees')
    safe_drop_foreign_key('vacations', {'approved_by'}, 'employees')
    op.create_foreign_key(None, 'vacations', 'employees', ['requested_by'], ['id'])
    op.create_foreign_key(None, 'vacations', 'employees', ['approved_by'], ['id'])

    safe_drop_foreign_key('user_sessions', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'user_sessions', 'employees', ['employee_id'], ['id'], ondelete='CASCADE')

    safe_drop_foreign_key('teams', {'department_id'}, 'departments')
    op.create_foreign_key(None, 'teams', 'departments', ['department_id'], ['id'])

    safe_drop_foreign_key('tasks', {'created_by'}, 'employees')
    safe_drop_foreign_key('tasks', {'project_id'}, 'projects')
    op.create_foreign_key(None, 'tasks', 'employees', ['created_by'], ['id'])
    op.create_foreign_key(None, 'tasks', 'projects', ['project_id'], ['id'])

    safe_drop_foreign_key('task_comments', {'employee_id'}, 'employees')
    safe_drop_foreign_key('task_comments', {'task_id'}, 'tasks')
    op.create_foreign_key(None, 'task_comments', 'employees', ['employee_id'], ['id'])
    op.create_foreign_key(None, 'task_comments', 'tasks', ['task_id'], ['id'])

    safe_drop_foreign_key('task_checklists', {'task_id'}, 'tasks')
    op.create_foreign_key(None, 'task_checklists', 'tasks', ['task_id'], ['id'])

    safe_drop_foreign_key('task_attachments', {'task_id'}, 'tasks')
    safe_drop_foreign_key('task_attachments', {'uploaded_by_id'}, 'employees')
    op.create_foreign_key(None, 'task_attachments', 'tasks', ['task_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'task_attachments', 'employees', ['uploaded_by_id'], ['id'])

    safe_drop_foreign_key('task_assignments', {'employee_id'}, 'employees')
    safe_drop_foreign_key('task_assignments', {'task_id'}, 'tasks')
    op.create_foreign_key(None, 'task_assignments', 'employees', ['employee_id'], ['id'])
    op.create_foreign_key(None, 'task_assignments', 'tasks', ['task_id'], ['id'])

    safe_drop_foreign_key('refresh_tokens', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'refresh_tokens', 'employees', ['employee_id'], ['id'], ondelete='CASCADE')

    safe_drop_foreign_key('projects', {'created_by'}, 'employees')
    op.create_foreign_key(None, 'projects', 'employees', ['created_by'], ['id'])

    safe_drop_foreign_key('project_members', {'employee_id'}, 'employees')
    safe_drop_foreign_key('project_members', {'project_id'}, 'projects')
    op.create_foreign_key(None, 'project_members', 'employees', ['employee_id'], ['id'])
    op.create_foreign_key(None, 'project_members', 'projects', ['project_id'], ['id'])

    safe_drop_foreign_key('notifications', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'notifications', 'employees', ['employee_id'], ['id'])

    safe_drop_foreign_key('employees', {'role_id'}, 'roles')
    safe_drop_foreign_key('employees', {'manager_id'}, 'employees')
    safe_drop_foreign_key('employees', {'team_id'}, 'teams')
    safe_drop_foreign_key('employees', {'department_id'}, 'departments')
    op.create_foreign_key(None, 'employees', 'roles', ['role_id'], ['id'])
    op.create_foreign_key(None, 'employees', 'employees', ['manager_id'], ['id'])
    op.create_foreign_key(None, 'employees', 'teams', ['team_id'], ['id'])
    op.create_foreign_key(None, 'employees', 'departments', ['department_id'], ['id'])

    safe_drop_foreign_key('audit_logs', {'employee_id'}, 'employees')
    op.create_foreign_key(None, 'audit_logs', 'employees', ['employee_id'], ['id'])
    
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
