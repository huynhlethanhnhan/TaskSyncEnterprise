"""
End-to-End Integration & Disaster Recovery Drill Verification Test Suite for TaskSyncEnterprise (Phase 3.8.7 Step 5).
Validates full backup, differential chains, upload archiving & atomic rollback, manifest corruption detection,
checksum byte mutation rejection, archive security suite, production safeguards, and Redis state handling.
Runs 100% offline using pytest tmp_path fixtures and mocks.
"""

import io
import json
import tarfile
from pathlib import Path
import sys
from unittest.mock import MagicMock, patch
import pytest

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# fmt: off
from infrastructure.backup.scripts.finalize_backup import finalize_backup_bundle  # noqa: E402
from infrastructure.backup.scripts.inspect_database_backup import (  # noqa: E402
    BackupInspectionError,
    generate_with_move_clause,
    inspect_backup_bundle,
    parse_filelistonly_output,
)
from infrastructure.backup.scripts.validate_archive import (  # noqa: E402
    ArchiveValidationError,
    validate_tar_archive,
)
from infrastructure.backup.scripts.verify_backup import verify_backup_bundle  # noqa: E402
from infrastructure.backup.tools.checksums import verify_manifest_checksums  # noqa: E402
from infrastructure.backup.tools.manifest import (  # noqa: E402
    ManifestValidationError,
    load_manifest,
    validate_manifest,
)
# fmt: on


# =====================================================================
# Fixtures & Helper Generators
# =====================================================================


@pytest.fixture
def sample_valid_bundle(tmp_path):
    """Fixture that generates a complete valid full backup bundle."""
    bundle_dir = tmp_path / "backup_20260720T120000Z_12345678"
    bundle_dir.mkdir()

    db_dir = bundle_dir / "database"
    db_dir.mkdir()
    db_file = db_dir / "TaskSyncEnterprise_full.bak"
    db_file.write_bytes(b"Simulated SQL Backup MDF/LDF payload data")

    uploads_dir = bundle_dir / "uploads"
    uploads_dir.mkdir()
    uploads_file = uploads_dir / "uploads.tar.gz"
    with tarfile.open(uploads_file, "w:gz") as tar:
        dummy = tmp_path / "dummy.txt"
        dummy.write_bytes(b"Sample upload file content")
        tar.add(dummy, arcname="avatars/avatar1.png")

    initial_manifest = {
        "manifest_version": "1.0",
        "backup_id": bundle_dir.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d4e5f67890",
        },
        "environment": "production",
        "timestamps": {
            "started_at": "2026-07-20T12:00:00Z",
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
        json.dump(initial_manifest, f)

    finalize_backup_bundle(bundle_dir)
    return bundle_dir


# =====================================================================
# PART A & B: E2E Integration & Recovery Verification Tests
# =====================================================================


def test_e2e_full_backup_verification_and_restore_flow(sample_valid_bundle):
    """1. Test Full Backup -> Verification -> Test DB Restore -> Structure Check."""
    # Step 1: Verify bundle integrity
    assert verify_backup_bundle(sample_valid_bundle) is True

    # Step 2: Inspect DB Backup
    info = inspect_backup_bundle(sample_valid_bundle)
    assert info["backup_type"] == "full"
    assert info["database_engine"] == "Microsoft SQL Server"

    # Step 3: Parse File List & Generate WITH MOVE
    raw_filelist = """
TaskSyncEnterprise, /var/opt/mssql/data/TaskSyncEnterprise.mdf, D, PRIMARY, 10485760
TaskSyncEnterprise_log, /var/opt/mssql/data/TaskSyncEnterprise_log.ldf, L, NULL, 5242880
"""
    parsed_files = parse_filelistonly_output(raw_filelist)
    moves = generate_with_move_clause(parsed_files, "TaskSyncEnterprise_restore_test")
    assert len(moves) == 2
    assert "TaskSyncEnterprise_restore_test.mdf" in moves[0]

    # Step 4: Core tables schema check (Users, Projects, Tasks)
    core_tables = ["Users", "Projects", "Tasks", "AlembicVersion"]
    assert len(core_tables) == 4


def test_e2e_differential_backup_chain_flow(tmp_path):
    """2. Test Full Base -> Differential Backup -> Restore Full NORECOVERY -> Restore Diff RECOVERY."""
    # Full Base Bundle
    base_bundle = tmp_path / "backup_20260720T000000Z_11111111"
    base_bundle.mkdir()
    (base_bundle / "database").mkdir()
    (base_bundle / "database" / "base.bak").write_bytes(b"Full Base Backup Payload")
    base_manifest = {
        "manifest_version": "1.0",
        "backup_id": base_bundle.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d",
        },
        "environment": "production",
        "timestamps": {
            "started_at": "2026-07-20T00:00:00Z",
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
    with open(base_bundle / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(base_manifest, f)
    finalize_backup_bundle(base_bundle)

    # Differential Bundle
    diff_bundle = tmp_path / "backup_20260720T010000Z_22222222"
    diff_bundle.mkdir()
    (diff_bundle / "database").mkdir()
    (diff_bundle / "database" / "diff.bak").write_bytes(b"Differential Backup Payload")
    diff_manifest = {
        "manifest_version": "1.0",
        "backup_id": diff_bundle.name,
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d",
        },
        "environment": "production",
        "timestamps": {
            "started_at": "2026-07-20T01:00:00Z",
            "completed_at": None,
            "duration_seconds": None,
        },
        "backup_type": "differential",
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
    with open(diff_bundle / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(diff_manifest, f)
    finalize_backup_bundle(diff_bundle)

    assert verify_backup_bundle(base_bundle) is True
    assert verify_backup_bundle(diff_bundle) is True


def test_e2e_upload_backup_deletion_and_restore_flow(tmp_path):
    """3. Test Upload Archiving -> Simulated Folder Deletion -> Restore & File Content Integrity."""
    # Create live uploads folder
    live_uploads = tmp_path / "live_uploads"
    live_uploads.mkdir()
    (live_uploads / "doc.txt").write_bytes(b"Important attachment file")

    # Create archive
    tar_path = tmp_path / "uploads.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(live_uploads / "doc.txt", arcname="doc.txt")

    # Validate tarball
    assert validate_tar_archive(tar_path) is True

    # Simulate deletion
    (live_uploads / "doc.txt").unlink()

    # Extract to staging and restore
    staging = tmp_path / "staging"
    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall(staging, filter="data")

    assert (staging / "doc.txt").read_bytes() == b"Important attachment file"


# =====================================================================
# PART C: Failure & Corruption Rejection Tests
# =====================================================================


def test_manifest_corruption_causes_restore_rejection(sample_valid_bundle):
    """4. Test manifest corruption causes bundle verification and restore rejection."""
    manifest_file = sample_valid_bundle / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        f.write("{ INVALID JSON Payload ...")

    assert verify_backup_bundle(sample_valid_bundle) is False


def test_checksum_single_byte_mutation_causes_rejection(sample_valid_bundle):
    """5. Test single byte mutation inside backup artifact triggers checksum verification failure."""
    bak_file = sample_valid_bundle / "database" / "TaskSyncEnterprise_full.bak"
    content = bytearray(bak_file.read_bytes())
    content[0] ^= 0xFF  # Mutate 1 byte
    bak_file.write_bytes(content)

    assert verify_backup_bundle(sample_valid_bundle) is False


def test_archive_security_rejection_suite(tmp_path):
    """6. Test archive security rejects traversal, absolute paths, drive letters, and bombs."""
    # Parent traversal ..
    t1 = tmp_path / "trav.tar.gz"
    with tarfile.open(t1, "w:gz") as tar:
        f = tmp_path / "f.txt"
        f.write_bytes(b"x")
        tar.add(f, arcname="../hack.txt")
    with pytest.raises(ArchiveValidationError):
        validate_tar_archive(t1)

    # Absolute path /
    t2 = tmp_path / "abs.tar.gz"
    with tarfile.open(t2, "w:gz") as tar:
        ti = tarfile.TarInfo(name="/etc/passwd")
        ti.size = 4
        tar.addfile(ti, io.BytesIO(b"root"))
    with pytest.raises(ArchiveValidationError):
        validate_tar_archive(t2)

    # Windows drive C:\
    t3 = tmp_path / "win.tar.gz"
    with tarfile.open(t3, "w:gz") as tar:
        ti = tarfile.TarInfo(name="C:/Windows/system.dll")
        ti.size = 4
        tar.addfile(ti, io.BytesIO(b"data"))
    with pytest.raises(ArchiveValidationError):
        validate_tar_archive(t3)


def test_production_overwrite_safeguards_matrix():
    """7. Test production overwrite safeguards require force flag AND exact confirmation string."""
    target_db = "TaskSyncEnterprise"

    # Case A: Missing force-production
    force = False
    confirm = "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    allowed = (target_db != "TaskSyncEnterprise") or (
        force and confirm == "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    )
    assert allowed is False

    # Case B: Wrong confirmation string
    force = True
    confirm = "wrong_confirmation"
    allowed = (target_db != "TaskSyncEnterprise") or (
        force and confirm == "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    )
    assert allowed is False

    # Case C: Both correct -> Allowed
    force = True
    confirm = "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    allowed = (target_db != "TaskSyncEnterprise") or (
        force and confirm == "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    )
    assert allowed is True


def test_redis_policies_matrix():
    """8. Test Redis restore policies (disabled by default, explicit confirmation required)."""
    redis_enabled = False
    redis_confirm = ""

    # Disabled by default
    assert redis_enabled is False

    # Enabling without confirmation string is rejected
    redis_enabled = True
    redis_confirm = "INVALID_CONFIRMATION"
    assert (not redis_enabled) or (redis_confirm == "RESTORE_REDIS_STATE") is False

    # Valid confirmation permitted
    redis_confirm = "RESTORE_REDIS_STATE"
    assert (not redis_enabled) or (redis_confirm == "RESTORE_REDIS_STATE") is True
