# 📂 FILE: alembic/versions/11a2b3c4d5e6_gap_remediation.py
"""gap_remediation

Revision ID: 11a2b3c4d5e6
Revises: 02d5a99d9c9c
Create Date: 2026-07-24 10:35:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "11a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "7b31f6e4c2a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sprints table
    op.create_table(
        "sprints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.Unicode(length=150), nullable=False),
        sa.Column("goal", sa.UnicodeText(), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column(
            "status",
            sa.Unicode(length=30),
            server_default=sa.text("N'Planned'"),
            nullable=False,
        ),
        sa.Column(
            "capacity", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("SYSUTCDATETIME()"),
            nullable=False,
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["employees.id"]),
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_sprints_project_id",
        "sprints",
        ["project_id"],
        unique=False,
        schema="dbo",
    )

    # Create unique filtered index for active sprints per project
    bind = op.get_bind()
    if bind.dialect.name == "mssql":
        op.create_index(
            "uq_active_sprint_per_project",
            "sprints",
            ["project_id"],
            unique=True,
            mssql_where=sa.text("status = N'Active' AND is_deleted = 0"),
            schema="dbo",
        )
    elif bind.dialect.name == "sqlite":
        op.create_index(
            "uq_active_sprint_per_project",
            "sprints",
            ["project_id"],
            unique=True,
            sqlite_where=sa.text("status = 'Active' AND is_deleted = 0"),
            schema="dbo",
        )

    # 2. Create backlog_items table
    op.create_table(
        "backlog_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("sprint_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.Unicode(length=200), nullable=False),
        sa.Column("description", sa.UnicodeText(), nullable=True),
        sa.Column(
            "priority",
            sa.Unicode(length=20),
            server_default=sa.text("N'Medium'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Unicode(length=30),
            server_default=sa.text("N'Backlog'"),
            nullable=False,
        ),
        sa.Column(
            "story_points", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("SYSUTCDATETIME()"),
            nullable=False,
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["employees.id"]),
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_backlog_items_project_id",
        "backlog_items",
        ["project_id"],
        unique=False,
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_backlog_items_sprint_id",
        "backlog_items",
        ["sprint_id"],
        unique=False,
        schema="dbo",
    )

    # 3. Create sprint_snapshots table
    op.create_table(
        "sprint_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sprint_id", sa.Integer(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column(
            "remaining_story_points",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "completed_story_points",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "remaining_tasks", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "completed_tasks", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("SYSUTCDATETIME()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "sprint_id", "snapshot_date", name="uq_sprint_snapshot_date"
        ),
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_sprint_snapshots_sprint_id",
        "sprint_snapshots",
        ["sprint_id"],
        unique=False,
        schema="dbo",
    )

    # 4. Create discussion_topics table
    op.create_table(
        "discussion_topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.Unicode(length=200), nullable=False),
        sa.Column("content", sa.UnicodeText(), nullable=False),
        sa.Column(
            "status",
            sa.Unicode(length=30),
            server_default=sa.text("N'Open'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("SYSUTCDATETIME()"),
            nullable=False,
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["employees.id"]),
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_discussion_topics_project_id",
        "discussion_topics",
        ["project_id"],
        unique=False,
        schema="dbo",
    )

    # 5. Create discussion_replies table
    op.create_table(
        "discussion_replies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.UnicodeText(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("SYSUTCDATETIME()"),
            nullable=False,
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["topic_id"], ["discussion_topics.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["employees.id"]),
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_discussion_replies_topic_id",
        "discussion_replies",
        ["topic_id"],
        unique=False,
        schema="dbo",
    )

    # 6. Create user_feedback table
    op.create_table(
        "user_feedback",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.Unicode(length=200), nullable=False),
        sa.Column("category", sa.Unicode(length=100), nullable=False),
        sa.Column("description", sa.UnicodeText(), nullable=False),
        sa.Column(
            "impact_level",
            sa.Unicode(length=50),
            server_default=sa.text("N'Medium'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Unicode(length=50),
            server_default=sa.text("N'New'"),
            nullable=False,
        ),
        sa.Column("submitter_id", sa.Integer(), nullable=False),
        sa.Column("reviewer_id", sa.Integer(), nullable=True),
        sa.Column("response", sa.UnicodeText(), nullable=True),
        sa.Column(
            "is_anonymous", sa.Boolean(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("SYSUTCDATETIME()"),
            nullable=False,
        ),
        sa.Column(
            "is_deleted", sa.Boolean(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["submitter_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["employees.id"]),
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_user_feedback_submitter_id",
        "user_feedback",
        ["submitter_id"],
        unique=False,
        schema="dbo",
    )

    # 7. Alter tasks table: add sprint_id column
    op.add_column(
        "tasks", sa.Column("sprint_id", sa.Integer(), nullable=True), schema="dbo"
    )
    op.create_foreign_key(
        "fk_tasks_sprint_id",
        "tasks",
        "sprints",
        ["sprint_id"],
        ["id"],
        source_schema="dbo",
        referent_schema="dbo",
    )
    op.create_index(
        "ix_dbo_tasks_sprint_id", "tasks", ["sprint_id"], unique=False, schema="dbo"
    )

    # 8. Alter task_attachments table: make task_id nullable, add topic_id, reply_id, feedback_id
    op.alter_column(
        "task_attachments",
        "task_id",
        existing_type=sa.Integer(),
        nullable=True,
        schema="dbo",
    )
    op.add_column(
        "task_attachments",
        sa.Column("topic_id", sa.Integer(), nullable=True),
        schema="dbo",
    )
    op.add_column(
        "task_attachments",
        sa.Column("reply_id", sa.Integer(), nullable=True),
        schema="dbo",
    )
    op.add_column(
        "task_attachments",
        sa.Column("feedback_id", sa.Integer(), nullable=True),
        schema="dbo",
    )

    op.create_foreign_key(
        "fk_attachments_topic_id",
        "task_attachments",
        "discussion_topics",
        ["topic_id"],
        ["id"],
        source_schema="dbo",
        referent_schema="dbo",
    )
    op.create_foreign_key(
        "fk_attachments_reply_id",
        "task_attachments",
        "discussion_replies",
        ["reply_id"],
        ["id"],
        source_schema="dbo",
        referent_schema="dbo",
    )
    op.create_foreign_key(
        "fk_attachments_feedback_id",
        "task_attachments",
        "user_feedback",
        ["feedback_id"],
        ["id"],
        source_schema="dbo",
        referent_schema="dbo",
    )

    op.create_index(
        "ix_dbo_task_attachments_topic_id",
        "task_attachments",
        ["topic_id"],
        unique=False,
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_task_attachments_reply_id",
        "task_attachments",
        ["reply_id"],
        unique=False,
        schema="dbo",
    )
    op.create_index(
        "ix_dbo_task_attachments_feedback_id",
        "task_attachments",
        ["feedback_id"],
        unique=False,
        schema="dbo",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_attachments_feedback_id",
        "task_attachments",
        schema="dbo",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_attachments_reply_id", "task_attachments", schema="dbo", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_attachments_topic_id", "task_attachments", schema="dbo", type_="foreignkey"
    )

    op.drop_index(
        "ix_dbo_task_attachments_feedback_id",
        table_name="task_attachments",
        schema="dbo",
    )
    op.drop_index(
        "ix_dbo_task_attachments_reply_id", table_name="task_attachments", schema="dbo"
    )
    op.drop_index(
        "ix_dbo_task_attachments_topic_id", table_name="task_attachments", schema="dbo"
    )

    op.drop_column("task_attachments", "feedback_id", schema="dbo")
    op.drop_column("task_attachments", "reply_id", schema="dbo")
    op.drop_column("task_attachments", "topic_id", schema="dbo")
    op.alter_column(
        "task_attachments",
        "task_id",
        existing_type=sa.Integer(),
        nullable=False,
        schema="dbo",
    )

    op.drop_constraint("fk_tasks_sprint_id", "tasks", schema="dbo", type_="foreignkey")
    op.drop_index("ix_dbo_tasks_sprint_id", table_name="tasks", schema="dbo")
    op.drop_column("tasks", "sprint_id", schema="dbo")

    op.drop_table("user_feedback", schema="dbo")
    op.drop_table("discussion_replies", schema="dbo")
    op.drop_table("discussion_topics", schema="dbo")
    op.drop_table("sprint_snapshots", schema="dbo")
    op.drop_table("backlog_items", schema="dbo")
    op.drop_index("uq_active_sprint_per_project", table_name="sprints", schema="dbo")
    op.drop_table("sprints", schema="dbo")
