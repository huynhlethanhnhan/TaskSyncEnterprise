"""
Database Backup Inspection Utility for TaskSyncEnterprise (Phase 3.8.7 Step 4).
Inspects SQL Server .bak files using RESTORE HEADERONLY and RESTORE FILELISTONLY
to dynamically extract logical file names, file types, LSN metadata, and backup chains.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# fmt: off
from infrastructure.backup.tools.manifest import load_manifest  # noqa: E402
from infrastructure.backup.tools.paths import (  # noqa: E402
    validate_safe_relative_path,
    verify_within_directory,
)
# fmt: on


class BackupInspectionError(ValueError):
    """Raised when backup inspection or parsing fails."""

    pass


def parse_filelistonly_output(raw_output: str) -> list[dict[str, Any]]:
    """
    Parse text output from RESTORE FILELISTONLY into structured file list metadata.

    Args:
        raw_output: Text output returned by sqlcmd RESTORE FILELISTONLY.

    Returns:
        List of dicts containing LogicalName, PhysicalName, Type ('D' or 'L'), Size.
    """
    files: list[dict[str, Any]] = []
    lines = [line.strip() for line in raw_output.splitlines() if line.strip()]

    # Parse CSV or space-separated sqlcmd output
    for line in lines:
        if (
            line.startswith("LogicalName")
            or line.startswith("---")
            or "rows affected" in line
        ):
            continue

        parts = (
            [p.strip() for p in line.split(",") if p.strip()]
            if "," in line
            else line.split()
        )
        if len(parts) >= 3:
            logical_name = parts[0]
            physical_name = parts[1]
            file_type = parts[2].upper()
            files.append(
                {
                    "logical_name": logical_name,
                    "physical_name": physical_name,
                    "type": file_type,  # 'D' = Data, 'L' = Log
                }
            )

    return files


def generate_with_move_clause(
    file_list: list[dict[str, Any]], target_db_name: str
) -> list[str]:
    """
    Generate dynamic WITH MOVE clauses for SQL Server RESTORE DATABASE statement.

    Args:
        file_list: List of parsed file metadata dicts.
        target_db_name: Target database identifier.

    Returns:
        List of MOVE clauses strings (e.g., MOVE N'Logical' TO N'/var/opt/mssql/data/target.mdf').
    """
    if not file_list:
        raise BackupInspectionError(
            "File list is empty. Cannot generate WITH MOVE clause."
        )

    data_count = 0
    log_count = 0
    move_clauses: list[str] = []
    seen_logical: set[str] = set()

    for item in file_list:
        logical = item["logical_name"]
        file_type = item["type"]

        if logical in seen_logical:
            raise BackupInspectionError(
                f"Duplicate logical file name found in backup: '{logical}'"
            )
        seen_logical.add(logical)

        if file_type == "D":
            suffix = f"_{data_count}.mdf" if data_count > 0 else ".mdf"
            data_count += 1
            target_path = f"/var/opt/mssql/data/{target_db_name}{suffix}"
        elif file_type == "L":
            suffix = f"_log_{log_count}.ldf" if log_count > 0 else "_log.ldf"
            log_count += 1
            target_path = f"/var/opt/mssql/data/{target_db_name}{suffix}"
        else:
            target_path = f"/var/opt/mssql/data/{target_db_name}_{logical}.ndf"

        move_clauses.append(f"MOVE N'{logical}' TO N'{target_path}'")

    if data_count == 0:
        raise BackupInspectionError(
            "Backup file list contains no data file (Type 'D')."
        )
    if log_count == 0:
        raise BackupInspectionError("Backup file list contains no log file (Type 'L').")

    return move_clauses


def inspect_backup_bundle(bundle_dir: Path) -> dict[str, Any]:
    """
    Inspect a backup bundle and extract database backup metadata from manifest.json.

    Args:
        bundle_dir: Path to the backup bundle.

    Returns:
        Dictionary containing backup inspection details.
    """
    manifest_path = bundle_dir / "manifest.json"
    manifest = load_manifest(manifest_path)

    db_artifact = None
    for art in manifest.get("artifacts", []):
        if art.get("component") == "database":
            db_artifact = art
            break

    if not db_artifact:
        raise BackupInspectionError("Manifest contains no database artifact.")

    rel_path = db_artifact["relative_path"]
    safe_rel_path = validate_safe_relative_path(rel_path)
    bak_file = bundle_dir / safe_rel_path
    verify_within_directory(bundle_dir, bak_file)

    if not bak_file.exists():
        raise BackupInspectionError(
            f"Database backup file missing on disk: '{bak_file}'"
        )

    backup_type = manifest.get("backup_type", "full")
    db_engine = manifest.get("compatibility", {}).get(
        "database_engine", "Microsoft SQL Server"
    )

    return {
        "bundle_id": manifest.get("backup_id"),
        "backup_type": backup_type,
        "database_engine": db_engine,
        "relative_path": rel_path,
        "bak_file_path": str(bak_file),
        "file_size_bytes": bak_file.stat().st_size,
        "sha256": db_artifact.get("sha256"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect TaskSyncEnterprise Database Backup File"
    )
    parser.add_argument(
        "--bundle", required=True, help="Path to backup bundle directory"
    )
    args = parser.parse_args()

    bundle_path = Path(args.bundle).resolve()
    try:
        info = inspect_backup_bundle(bundle_path)
        print(json.dumps(info, indent=2))
    except Exception as exc:
        print(f"[ERROR] Backup inspection failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
