"""
Database Cleanup Script: db_purge_soft_deleted.py
Physically removes rows that have been soft-deleted (is_deleted = True)
from all relevant tables in the HRM SQL Server database.

Run from backend/ directory:
  .venv\\Scripts\\python.exe tests\\db_purge_soft_deleted.py

WARNING: This is an IRREVERSIBLE operation. Run only when sure.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.database import engine

def get_table_soft_delete_count(conn, table: str, col: str = "is_deleted") -> int:
    """Count soft-deleted rows in a table."""
    try:
        result = conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE {col} = 1"))
        return result.scalar()
    except Exception as e:
        print(f"  [SKIP] Could not query {table}: {e}")
        return -1

def purge_table(conn, table: str, col: str = "is_deleted", dry_run: bool = True) -> int:
    """Delete soft-deleted rows from a table. Returns count of deleted rows."""
    count = get_table_soft_delete_count(conn, table, col)
    if count <= 0:
        print(f"  [OK] {table}: 0 soft-deleted rows — nothing to clean")
        return 0
    if dry_run:
        print(f"  [DRY RUN] {table}: would DELETE {count} soft-deleted rows")
        return count
    conn.execute(text(f"DELETE FROM {table} WHERE {col} = 1"))
    print(f"  [DONE] {table}: DELETED {count} rows")
    return count

def main():
    dry_run = "--execute" not in sys.argv
    
    if dry_run:
        print("\n[DRY RUN] No actual changes will be made.")
        print("    Pass --execute flag to perform actual deletion.\n")
    else:
        print("\n[EXECUTE] Rows will be permanently deleted!\n")

    TABLES = [
        ("tasks", "is_deleted"),
        ("projects", "is_deleted"),
        ("employees", "is_deleted"),
    ]

    total_to_purge = 0
    with engine.begin() as conn:
        if not dry_run:
            # Temporarily disable all FK constraints in DB to allow safe purge
            conn.execute(text("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'"))

        for table, col in TABLES:
            count = purge_table(conn, table, col, dry_run=dry_run)
            if count > 0:
                total_to_purge += count

        if not dry_run:
            # Re-enable FK constraints
            conn.execute(text("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'"))

    print(f"\n{'='*50}")
    if dry_run:
        print(f"DRY RUN COMPLETE: {total_to_purge} rows would be purged.")
        print("Run with --execute to apply changes:")
        print("  .venv\\Scripts\\python.exe tests\\db_purge_soft_deleted.py --execute")
    else:
        print(f"CLEANUP COMPLETE: {total_to_purge} soft-deleted rows purged.")

if __name__ == "__main__":
    main()
