# 🔬 DATABASE CONSISTENCY AUDIT TOOL (db_audit.py)
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings


def run_database_audit():
    print("======================================================================")
    print("[AUDIT] DATABASE CONSISTENCY & INTEGRITY SCANNER")
    print("======================================================================\n")

    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)

    orphan_assignments = []
    orphan_tasks = []
    duplicate_assignments = []
    invalid_roles = []

    try:
        with engine.connect() as conn:
            # 1. Scan for orphaned task assignments (missing task or employee)
            print("Scanning for orphan task_assignments...")
            q_orphans = conn.execute(text("""
                SELECT ta.id, ta.task_id, ta.employee_id 
                FROM task_assignments ta
                LEFT JOIN tasks t ON ta.task_id = t.id
                LEFT JOIN employees e ON ta.employee_id = e.id
                WHERE t.id IS NULL OR e.id IS NULL
            """)).fetchall()
            orphan_assignments = [dict(r._mapping) for r in q_orphans]

            # 2. Scan for duplicate task assignments
            print("Scanning for duplicate task_assignments...")
            q_duplicates = conn.execute(text("""
                SELECT task_id, employee_id, COUNT(*) as cnt
                FROM task_assignments
                GROUP BY task_id, employee_id
                HAVING COUNT(*) > 1
            """)).fetchall()
            duplicate_assignments = [dict(r._mapping) for r in q_duplicates]

            # 3. Scan for tasks referencing non-existent projects
            print("Scanning for orphan tasks...")
            q_tasks = conn.execute(text("""
                SELECT t.id, t.title, t.project_id
                FROM tasks t
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE p.id IS NULL
            """)).fetchall()
            orphan_tasks = [dict(r._mapping) for r in q_tasks]

            # 4. Scan for employees with invalid role references
            print("Scanning for invalid role references in employees...")
            q_roles = conn.execute(text("""
                SELECT e.id, e.email, e.role_id
                FROM employees e
                LEFT JOIN roles r ON e.role_id = r.id
                WHERE r.id IS NULL
            """)).fetchall()
            invalid_roles = [dict(r._mapping) for r in q_roles]

    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return

    # Report findings
    print("\n----------------------------------------------------------------------")
    print("AUDIT FINDINGS:")
    print("----------------------------------------------------------------------")

    clean_sql = []

    # 1. Orphan assignments
    if orphan_assignments:
        print(f"  [FAIL] Found {len(orphan_assignments)} orphan task_assignments:")
        for r in orphan_assignments:
            print(
                f"         Assignment ID {r['id']} references task_id {r['task_id']}, employee_id {r['employee_id']}"
            )
            clean_sql.append(f"DELETE FROM task_assignments WHERE id = {r['id']};")
    else:
        print("  [PASS] No orphan task_assignments detected.")

    # 2. Duplicate assignments
    if duplicate_assignments:
        print(
            f"  [FAIL] Found {len(duplicate_assignments)} duplicate task_assignments:"
        )
        for r in duplicate_assignments:
            print(
                f"         Task ID {r['task_id']} assigned to Employee ID {r['employee_id']} {r['cnt']} times."
            )
            # Keep only one record, delete duplicates (SQL Server CTE expression)
            clean_sql.append(f"""
WITH CTE AS (
    SELECT ROW_NUMBER() OVER (PARTITION BY task_id, employee_id ORDER BY assigned_at) as RN
    FROM task_assignments
    WHERE task_id = {r['task_id']} AND employee_id = {r['employee_id']}
)
DELETE FROM CTE WHERE RN > 1;""")
    else:
        print("  [PASS] No duplicate task_assignments detected.")

    # 3. Orphan tasks
    if orphan_tasks:
        print(
            f"  [FAIL] Found {len(orphan_tasks)} tasks referencing non-existent projects:"
        )
        for r in orphan_tasks:
            print(
                f"         Task ID {r['id']} ('{r['title']}') references project_id {r['project_id']}"
            )
            clean_sql.append(f"DELETE FROM tasks WHERE id = {r['id']};")
    else:
        print("  [PASS] No orphan tasks detected.")

    # 4. Invalid roles
    if invalid_roles:
        print(f"  [FAIL] Found {len(invalid_roles)} employees with invalid roles:")
        for r in invalid_roles:
            print(
                f"         Employee ID {r['id']} ('{r['email']}') references role_id {r['role_id']}"
            )
            # Set default role Employee (3) for safety
            clean_sql.append(f"UPDATE employees SET role_id = 3 WHERE id = {r['id']};")
    else:
        print("  [PASS] No invalid role references detected.")

    # Generate cleanup script
    print("\n----------------------------------------------------------------------")
    print("SQL CLEANUP SCRIPT (SAFE):")
    print("----------------------------------------------------------------------")
    if clean_sql:
        print("-- Run the following SQL queries in SSMS or using the python executor:")
        for sql in clean_sql:
            print(sql)
    else:
        print("-- Database is fully consistent. No cleanup script needed!")

    print("\n======================================================================")


if __name__ == "__main__":
    run_database_audit()
