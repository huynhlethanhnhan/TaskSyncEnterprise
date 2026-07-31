# 📂 FILE: backend/scripts/reset_demo_data.py
import os
import sys
from pathlib import Path

# Ensure root backend dir is in PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database import SessionLocal
from app.core.security import get_password_hash
from app.core.constants import ROLE_ADMIN


def count_table(db, table_name: str) -> int:
    try:
        result = db.execute(text(f"SELECT COUNT(*) FROM dbo.{table_name}"))
        return result.scalar() or 0
    except Exception:
        return 0


def reset_demo_data():
    allow_reset = os.getenv("ALLOW_DESTRUCTIVE_RESET", "").lower() in ("true", "1", "yes")
    if not allow_reset:
        print("[ERROR] Destructive reset denied!")
        print("You must set ALLOW_DESTRUCTIVE_RESET=true environment variable to run this script.")
        sys.exit(1)

    env = os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development")).lower()
    if env not in ("development", "testing", "test"):
        print(f"[ERROR] Cannot run reset_demo_data.py in environment '{env}'!")
        sys.exit(1)

    from app.config import settings
    db_uri = settings.SQLALCHEMY_DATABASE_URI.lower()
    if "tasksyncenterprise" not in db_uri:
        print(f"[ERROR] Destructive reset target must be 'TaskSyncEnterprise', found URI: {db_uri}")
        sys.exit(1)

    allowed_hosts = ("127.0.0.1", "localhost", "sqlserver")
    if not any(host in db_uri for host in allowed_hosts):
        print(f"[ERROR] Database host in URI is not an allowed local host for reset: {db_uri}")
        sys.exit(1)

    print("==================================================")
    print("STARTING SAFE DATABASE CLEANUP & RESET")
    print("==================================================")

    db = SessionLocal()
    tables_to_count = [
        "task_assignments",
        "task_checklists",
        "task_comments",
        "task_attachments",
        "tasks",
        "backlog_items",
        "sprints",
        "discussion_topics",
        "project_members",
        "projects",
        "notifications",
        "notification_preferences",
        "teams",
        "departments",
        "employees",
    ]

    print("\n--- PRE-CLEANUP RECORD COUNTS ---")
    pre_counts = {}
    for table in tables_to_count:
        cnt = count_table(db, table)
        pre_counts[table] = cnt
        print(f"  - {table}: {cnt}")

    try:
        # Clear FK references pointing to employees
        db.execute(text("UPDATE dbo.teams SET leader_id = NULL"))
        db.execute(text("UPDATE dbo.departments SET manager_id = NULL"))
        db.execute(text("UPDATE dbo.employees SET manager_id = NULL, team_id = NULL, department_id = NULL"))
        try:
            db.execute(text("UPDATE dbo.projects SET created_by = NULL"))
        except Exception:
            pass
        
        for statement in [
            "UPDATE dbo.system_settings SET updated_by = NULL",
            "UPDATE dbo.system_settings SET created_by = NULL",
            "DELETE FROM dbo.task_assignments",
            "DELETE FROM dbo.task_checklists",
            "DELETE FROM dbo.task_comments",
            "DELETE FROM dbo.task_attachments",
            "DELETE FROM dbo.tasks",
            "DELETE FROM dbo.backlog_items",
            "DELETE FROM dbo.sprints",
            "DELETE FROM dbo.discussion_topics",
            "DELETE FROM dbo.project_members",
            "DELETE FROM dbo.projects",
            "DELETE FROM dbo.notifications",
            "DELETE FROM dbo.notification_preferences",
            "DELETE FROM dbo.vacations",
            "DELETE FROM dbo.leave_requests",
            "DELETE FROM dbo.user_sessions",
            "DELETE FROM dbo.refresh_tokens",
            "DELETE FROM dbo.audit_logs",
            "DELETE FROM dbo.system_settings",
        ]:
            try:
                db.execute(text(statement))
            except Exception:
                pass

        # Keep or recreate Admin
        admin_email = "admin@tasksync.local"
        admin_exists = db.execute(
            text("SELECT id FROM dbo.employees WHERE email = :email AND is_deleted = 0"),
            {"email": admin_email},
        ).scalar()

        if admin_exists:
            db.execute(
                text("DELETE FROM dbo.employees WHERE id != :admin_id"),
                {"admin_id": admin_exists},
            )
        else:
            db.execute(text("DELETE FROM dbo.employees"))

        db.execute(text("DELETE FROM dbo.teams"))
        db.execute(text("DELETE FROM dbo.departments"))

        # Keep or recreate Admin
        admin_email = "admin@tasksync.com"
        admin_exists = db.execute(
            text("SELECT id FROM dbo.employees WHERE (email = :email OR email = 'admin@tasksync.local') AND is_deleted = 0"),
            {"email": admin_email},
        ).scalar()

        if admin_exists:
            # Delete non-admin employees
            db.execute(
                text("DELETE FROM dbo.employees WHERE id != :admin_id"),
                {"admin_id": admin_exists},
            )
            # Ensure admin properties
            db.execute(
                text(
                    """
                    UPDATE dbo.employees
                    SET email = :email,
                        role_id = :role_admin,
                        department_id = NULL,
                        team_id = NULL,
                        manager_id = NULL,
                        is_active = 1,
                        is_deleted = 0
                    WHERE id = :admin_id
                    """
                ),
                {"email": admin_email, "role_admin": ROLE_ADMIN, "admin_id": admin_exists},
            )
        else:
            # Delete all employees
            db.execute(text("DELETE FROM dbo.employees"))
            # Insert single Admin user
            hashed_pwd = get_password_hash("Admin123!")
            db.execute(
                text(
                    """
                    INSERT INTO dbo.employees (
                        employee_code, full_name, email, password_hash,
                        role_id, is_active, is_deleted, created_at
                    ) VALUES (
                        'EMP-ADMIN001', N'System Admin', :email, :pwd,
                        :role_admin, 1, 0, SYSUTCDATETIME()
                    )
                    """
                ),
                {
                    "email": admin_email,
                    "pwd": hashed_pwd,
                    "role_admin": ROLE_ADMIN,
                },
            )

        db.commit()
        print("\n[SUCCESS] Database cleanup committed successfully!")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Cleanup failed: {e}")
        sys.exit(1)
    finally:
        print("\n--- POST-CLEANUP RECORD COUNTS ---")
        for table in tables_to_count:
            cnt = count_table(db, table)
            print(f"  - {table}: {cnt}")

        db.close()


if __name__ == "__main__":
    reset_demo_data()
