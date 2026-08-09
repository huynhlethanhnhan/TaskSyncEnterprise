# 📂 FILE: backend/scripts/apply_story_points_nullable_migration.py
"""
MSSQL Database Schema Migration Script
Alters dbo.tasks.story_points column from INT NOT NULL to INT NULL on the active development database.
Inspects INFORMATION_SCHEMA.COLUMNS before and after execution without resetting or deleting data.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database import engine


def query_column_metadata(conn):
    result = conn.execute(text("""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'story_points'
    """)).first()
    return result


def run_migration():
    print("=" * 60)
    print("      MSSQL TASK STORY_POINTS NULLABLE MIGRATION")
    print("=" * 60)

    with engine.begin() as conn:
        # 1. Inspect metadata before migration
        before = query_column_metadata(conn)
        if before:
            print(
                f"BEFORE MIGRATION: Column={before.COLUMN_NAME}, Type={before.DATA_TYPE}, IsNullable={before.IS_NULLABLE}"
            )
        else:
            print("BEFORE MIGRATION: Cột story_points chưa tồn tại trong metadata.")

        # 2. Drop default constraint if present on MSSQL
        drop_constraint_sql = """
        DECLARE @ConstraintName nvarchar(200);
        SELECT @ConstraintName = d.name
        FROM sys.default_constraints d
        JOIN sys.columns c ON d.parent_column_id = c.column_id AND d.parent_object_id = c.object_id
        WHERE d.parent_object_id = object_id('dbo.tasks') AND c.name = 'story_points';

        IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE dbo.tasks DROP CONSTRAINT [' + @ConstraintName + ']');
        """
        conn.execute(text(drop_constraint_sql))
        print("  -> Default constraint on story_points dropped (if existing).")

        # 3. Alter column to INT NULL
        alter_column_sql = "ALTER TABLE dbo.tasks ALTER COLUMN story_points INT NULL;"
        conn.execute(text(alter_column_sql))
        print(
            "  -> Executed: ALTER TABLE dbo.tasks ALTER COLUMN story_points INT NULL;"
        )

        # 4. Stamp alembic_version if table exists
        try:
            conn.execute(
                text("UPDATE alembic_version SET version_num = 'c7f4a2b8d901';")
            )
            print("  -> Updated alembic_version to c7f4a2b8d901.")
        except Exception as e:
            print(f"  -> Notice: Could not update alembic_version table: {e}")

        # 5. Inspect metadata after migration
        after = query_column_metadata(conn)
        if after:
            print(
                f"AFTER MIGRATION:  Column={after.COLUMN_NAME}, Type={after.DATA_TYPE}, IsNullable={after.IS_NULLABLE}"
            )
        else:
            print("AFTER MIGRATION: Không thể đọc metadata sau migration.")

        print("=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY! No data was deleted.")
        print("=" * 60)


if __name__ == "__main__":
    run_migration()
