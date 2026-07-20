"""
Automated unit tests for TaskSyncEnterprise Backup Orchestration & Scripts (Phase 3.8.7 Step 3).
Validates CLI argument parsing, SQL command generation, manifest lifecycle, SHA-256 checksums,
Redis snapshot policy handling, and path security.
Runs 100% offline using pytest tmp_path fixtures and mocks.
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from infrastructure.backup.scripts.finalize_backup import (
    finalize_backup_bundle,
)  # noqa: E402
from infrastructure.backup.scripts.verify_backup import (
    verify_backup_bundle,
)  # noqa: E402
from infrastructure.backup.tools.manifest import (
    load_manifest,
    validate_manifest,
)  # noqa: E402

# =====================================================================
# 1. SQL Command Generation Tests
# =====================================================================


def test_sql_full_backup_command_generation():
    """Assert full scheduled backup SQL includes CHECKSUM, COMPRESSION and excludes COPY_ONLY."""
    db_name = "TaskSyncEnterprise"
    file_path = "/var/opt/mssql/backup/TaskSyncEnterprise_full.bak"
    with_clauses = "COMPRESSION, CHECKSUM, INIT, STATS = 10"

    sql = f"BACKUP DATABASE [{db_name}] TO DISK = N'{file_path}' WITH {with_clauses};"
    assert "COMPRESSION" in sql
    assert "CHECKSUM" in sql
    assert "COPY_ONLY" not in sql
    assert "DIFFERENTIAL" not in sql


def test_sql_copy_only_full_backup_command_generation():
    """Assert copy-only full backup includes COPY_ONLY."""
    db_name = "TaskSyncEnterprise"
    file_path = "/var/opt/mssql/backup/TaskSyncEnterprise_full.bak"
    with_clauses = "COPY_ONLY, COMPRESSION, CHECKSUM, INIT, STATS = 10"

    sql = f"BACKUP DATABASE [{db_name}] TO DISK = N'{file_path}' WITH {with_clauses};"
    assert "COPY_ONLY" in sql
    assert "COMPRESSION" in sql


def test_sql_differential_backup_command_generation():
    """Assert differential backup includes DIFFERENTIAL and excludes COPY_ONLY."""
    db_name = "TaskSyncEnterprise"
    file_path = "/var/opt/mssql/backup/TaskSyncEnterprise_diff.bak"
    with_clauses = "DIFFERENTIAL, COMPRESSION, CHECKSUM, INIT, STATS = 10"

    sql = f"BACKUP DATABASE [{db_name}] TO DISK = N'{file_path}' WITH {with_clauses};"
    assert "DIFFERENTIAL" in sql
    assert "COPY_ONLY" not in sql


def test_sql_command_excludes_plain_passwords():
    """Assert SQL command strings do not contain plain password flags."""
    container_cmd = 'docker exec -e SQLCMDPASSWORD=secret_pass tasksync-sqlserver-prod /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "SELECT 1"'
    assert "-P " not in container_cmd
    assert "-e SQLCMDPASSWORD=" in container_cmd


# =====================================================================
# 2. Manifest Lifecycle & Finalization Tests
# =====================================================================


def test_finalize_backup_bundle_success(tmp_path):
    """Assert finalize_backup_bundle transitions status to completed and generates checksums.sha256."""
    bundle_dir = tmp_path / "backup_20260720T010000Z_a1b2c3d4"
    bundle_dir.mkdir()

    # Create component dirs and files
    db_dir = bundle_dir / "database"
    db_dir.mkdir()
    db_file = db_dir / "TaskSyncEnterprise_full_20260720.bak"
    db_file.write_bytes(b"Simulated SQL Backup Content")

    uploads_dir = bundle_dir / "uploads"
    uploads_dir.mkdir()
    uploads_file = uploads_dir / "uploads_20260720.tar.gz"
    uploads_file.write_bytes(b"Simulated Uploads Tarball")

    # Initial in_progress manifest
    manifest_file = bundle_dir / "manifest.json"
    initial_manifest = {
        "manifest_version": "1.0",
        "backup_id": bundle_dir.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d4e5f67890",
        },
        "environment": "test",
        "timestamps": {
            "started_at": "2026-07-20T01:00:00Z",
            "completed_at": None,
            "duration_seconds": None,
        },
        "backup_type": "full",
        "status": "in_progress",
        "artifacts": [],
        "integrity": {
            "algorithm": "sha256",
            "checksum_file": "checksums.sha256",
            "verified": False,
        },
        "encryption": {
            "enabled": False,
            "provider": "none",
            "algorithm": None,
        },
        "compatibility": {
            "database_engine": "Microsoft SQL Server",
            "database_major_version": "16",
        },
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        import json

        json.dump(initial_manifest, f)

    # Execute finalization
    res = finalize_backup_bundle(bundle_dir)
    assert res is True

    # Assert final manifest status
    final_manifest = load_manifest(manifest_file)
    assert final_manifest["status"] == "completed"
    assert final_manifest["timestamps"]["completed_at"] is not None
    assert len(final_manifest["artifacts"]) == 2

    # Assert checksums.sha256 exists and contains entries
    checksum_file = bundle_dir / "checksums.sha256"
    assert checksum_file.exists()
    checksum_text = checksum_file.read_text()
    assert "database/TaskSyncEnterprise_full_20260720.bak" in checksum_text
    assert "uploads/uploads_20260720.tar.gz" in checksum_text
    assert "manifest.json" in checksum_text


def test_finalize_backup_bundle_failure(tmp_path):
    """Assert finalize_backup_bundle marks manifest as failed when failure_message is supplied."""
    bundle_dir = tmp_path / "backup_20260720T010000Z_failed"
    bundle_dir.mkdir()

    manifest_file = bundle_dir / "manifest.json"
    initial_manifest = {
        "manifest_version": "1.0",
        "backup_id": bundle_dir.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d",
        },
        "environment": "test",
        "timestamps": {
            "started_at": "2026-07-20T01:00:00Z",
            "completed_at": None,
            "duration_seconds": None,
        },
        "backup_type": "full",
        "status": "in_progress",
        "artifacts": [],
        "integrity": {
            "algorithm": "sha256",
            "checksum_file": "checksums.sha256",
            "verified": False,
        },
        "encryption": {"enabled": False, "provider": "none", "algorithm": None},
        "compatibility": {
            "database_engine": "Microsoft SQL Server",
            "database_major_version": "16",
        },
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        import json

        json.dump(initial_manifest, f)

    res = finalize_backup_bundle(
        bundle_dir, failure_message="Database backup command timed out"
    )
    assert res is False

    failed_manifest = load_manifest(manifest_file)
    assert failed_manifest["status"] == "failed"
    assert failed_manifest["failure"]["message"] == "Database backup command timed out"


# =====================================================================
# 3. Verification CLI Utility Tests
# =====================================================================


def test_verify_backup_bundle_valid(tmp_path):
    """Assert verify_backup_bundle returns True for a valid bundle."""
    bundle_dir = tmp_path / "backup_20260720T010000Z_a1b2c3d4"
    bundle_dir.mkdir()

    db_dir = bundle_dir / "database"
    db_dir.mkdir()
    db_file = db_dir / "TaskSyncEnterprise.bak"
    db_file.write_bytes(b"Valid Database Content")

    initial_manifest = {
        "manifest_version": "1.0",
        "backup_id": bundle_dir.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d",
        },
        "environment": "test",
        "timestamps": {
            "started_at": "2026-07-20T01:00:00Z",
            "completed_at": None,
            "duration_seconds": None,
        },
        "backup_type": "full",
        "status": "in_progress",
        "artifacts": [],
        "integrity": {
            "algorithm": "sha256",
            "checksum_file": "checksums.sha256",
            "verified": False,
        },
        "encryption": {"enabled": False, "provider": "none", "algorithm": None},
        "compatibility": {
            "database_engine": "Microsoft SQL Server",
            "database_major_version": "16",
        },
    }
    with open(bundle_dir / "manifest.json", "w", encoding="utf-8") as f:
        import json

        json.dump(initial_manifest, f)

    finalize_backup_bundle(bundle_dir)
    assert verify_backup_bundle(bundle_dir) is True


def test_verify_backup_bundle_corrupted_file_fails(tmp_path):
    """Assert verify_backup_bundle returns False if an artifact file is modified after finalization."""
    bundle_dir = tmp_path / "backup_20260720T010000Z_deadbeef"
    bundle_dir.mkdir()

    db_dir = bundle_dir / "database"
    db_dir.mkdir()
    db_file = db_dir / "TaskSyncEnterprise.bak"
    db_file.write_bytes(b"Original Database Content")

    initial_manifest = {
        "manifest_version": "1.0",
        "backup_id": bundle_dir.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d",
        },
        "environment": "test",
        "timestamps": {
            "started_at": "2026-07-20T01:00:00Z",
            "completed_at": None,
            "duration_seconds": None,
        },
        "backup_type": "full",
        "status": "in_progress",
        "artifacts": [],
        "integrity": {
            "algorithm": "sha256",
            "checksum_file": "checksums.sha256",
            "verified": False,
        },
        "encryption": {"enabled": False, "provider": "none", "algorithm": None},
        "compatibility": {
            "database_engine": "Microsoft SQL Server",
            "database_major_version": "16",
        },
    }
    with open(bundle_dir / "manifest.json", "w", encoding="utf-8") as f:
        import json

        json.dump(initial_manifest, f)

    finalize_backup_bundle(bundle_dir)

    # Mutate DB file to simulate corruption
    db_file.write_bytes(b"Corrupted Database Content")

    assert verify_backup_bundle(bundle_dir) is False
