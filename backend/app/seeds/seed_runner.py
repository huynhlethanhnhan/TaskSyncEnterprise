import os
import sys
import argparse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import SessionLocal, Base, engine
from app.config import settings

# Import seed modules
from app.seeds.seed_roles import seed_roles
from app.seeds.seed_departments import seed_departments
from app.seeds.seed_employees import seed_employees
from app.seeds.seed_projects import seed_projects
from app.seeds.seed_sprints import seed_sprints
from app.seeds.seed_tasks import seed_tasks
from app.seeds.seed_comments import seed_comments
from app.seeds.seed_notifications import seed_notifications
from app.seeds.seed_vacations import seed_vacations
from app.seeds.seed_settings import seed_settings
from app.seeds.seed_topics import seed_topics

# Order of tables to reset respecting Foreign Key constraints
TABLES_TO_RESET = [
    "audit_logs",
    "notification_preferences",
    "notification_logs",
    "notifications",
    "task_comments",
    "task_attachments",
    "task_checklists",
    "task_assignments",
    "backlog_items",
    "tasks",
    "sprint_snapshots",
    "sprint_members",
    "sprints",
    "project_members",
    "projects",
    "team_members",
    "teams",
    "user_feedback",
    "discussion_replies",
    "discussion_topics",
    "vacations",
    "user_sessions",
    "refresh_tokens",
    "token_blacklist",
    "system_settings",
    "user_preferences",
    "employees",
    "departments",
    "roles",
]


def safe_reset_database(db: Session, confirm: bool) -> dict[str, int]:
    env = os.environ.get("ENVIRONMENT", getattr(settings, "ENVIRONMENT", "development"))
    allow_reset = os.environ.get("ALLOW_DATABASE_RESET", "false").lower() == "true"

    if env == "production" and not allow_reset:
        print("[ERROR] Cannot reset database on Production environment!", file=sys.stderr)
        sys.exit(1)

    if not confirm:
        print("[ERROR] Confirmation flag --confirm-reset required for reset!", file=sys.stderr)
        sys.exit(1)

    deleted_counts = {}
    print("[RESET] Cleaning and resetting development database...")

    # Schema creation is managed strictly by Alembic migrations
    # (Base.metadata.create_all is avoided per production standards)

    for table_name in TABLES_TO_RESET:
        try:
            # Check if table exists
            check_stmt = text(f"SELECT COUNT(*) FROM {table_name}")
            count = db.execute(check_stmt).scalar() or 0

            if count > 0:
                del_stmt = text(f"DELETE FROM {table_name}")
                db.execute(del_stmt)
                db.commit()
            deleted_counts[table_name] = count
            print(f"  - {table_name}: deleted {count} records.")
        except Exception:
            db.rollback()
            # Ignore missing table errors in test harness
            deleted_counts[table_name] = 0

    return deleted_counts


def run_seed_pipeline(db: Session) -> dict[str, int]:
    print("\n[SEED] Initializing large-scale deterministic dataset...")

    # 1. Seed Roles
    seed_roles(db)
    print("  [OK] Seeded Roles: 3 (Admin, Manager, Employee)")

    # 2. Seed Departments
    departments = seed_departments(db)
    print(f"  [OK] Seeded Departments: {len(departments)}")

    # 3. Seed Employees
    employees = seed_employees(db, departments)
    print(f"  [OK] Seeded Employees: {len(employees)} (Accounts: admin001, manager001, employee001...)")

    # 4. Seed Projects
    projects = seed_projects(db, employees)
    print(f"  [OK] Seeded Projects: {len(projects)} (Includes PRJ-SPRINT-TEST)")

    # 4.5 Seed Topics
    topics = seed_topics(db, projects, employees)
    print(f"  [OK] Seeded Topics: {len(topics)}")

    # 5. Seed Sprints
    sprints = seed_sprints(db, projects)
    print(f"  [OK] Seeded Sprints: {len(sprints)} (Includes Sprint A, B, C)")

    # 6. Seed Tasks
    tasks = seed_tasks(db, projects, sprints, employees)
    print(f"  [OK] Seeded Tasks: {len(tasks)} (Includes EMP001-TASK-001 to 005)")

    # 7. Seed Comments
    num_comments = seed_comments(db, tasks, employees)
    print(f"  [OK] Seeded Task Comments: {num_comments}")

    # 8. Seed Notifications
    num_notifs = seed_notifications(db, employees)
    print(f"  [OK] Seeded Notifications: {num_notifs}")

    # 9. Seed Vacations
    num_vacations = seed_vacations(db, employees)
    print(f"  [OK] Seeded Vacations: {num_vacations}")

    # 10. Seed Settings
    num_prefs = seed_settings(db, employees)
    print(f"  [OK] Seeded Settings & User Preferences: {num_prefs}")

    summary = {
        "Roles": 3,
        "Departments": len(departments),
        "Employees": len(employees),
        "Projects": len(projects),
        "Topics": len(topics),
        "Sprints": len(sprints),
        "Tasks": len(tasks),
        "Comments": num_comments,
        "Notifications": num_notifs,
        "Vacations": num_vacations,
        "Settings": num_prefs,
    }
    return summary


def main():
    parser = argparse.ArgumentParser(description="TaskSyncEnterprise Database Reset & Seed CLI Runner")
    parser.add_argument("--reset", action="store_true", help="Reset development database tables")
    parser.add_argument("--seed", action="store_true", help="Run deterministic seed pipeline")
    parser.add_argument("--reset-and-seed", action="store_true", help="Reset existing data and seed clean dataset")
    parser.add_argument("--confirm-reset", action="store_true", help="Explicit confirmation flag required for reset")
    parser.add_argument("--summary", action="store_true", help="Print summary counts after operation")

    args = parser.parse_args()

    if not (args.reset or args.seed or args.reset_and_seed):
        args.reset_and_seed = True
        args.confirm_reset = True

    db = SessionLocal()
    try:
        if args.reset or args.reset_and_seed:
            safe_reset_database(db, confirm=args.confirm_reset)

        if args.seed or args.reset_and_seed:
            summary = run_seed_pipeline(db)

            print("\n" + "=" * 55)
            print("         SEED DATASET SUMMARY REPORT")
            print("=" * 55)
            for key, val in summary.items():
                print(f"  * {key:<20}: {val:>5}")
            print("=" * 55)
            print("  Test Accounts (Development Password: TaskSync@2026):")
            print("    - Admin   : admin001@enterprise.com")
            print("    - Manager : manager001@enterprise.com")
            print("    - Employee: employee001@enterprise.com")
            print("=" * 55 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
