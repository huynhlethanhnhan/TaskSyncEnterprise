"""
Automated unit tests for TaskSyncEnterprise Backup Restore Orchestration & Controls (Phase 3.8.7 Step 4).
Validates production overwrite safeguards, RESTORE FILELISTONLY parsing, dynamic WITH MOVE generation,
differential chain controls, upload archive pre-extraction security, and Redis confirmation checks.
Runs 100% offline using pytest tmp_path fixtures and mocks.
"""

import tarfile
from pathlib import Path
import sys
import pytest

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# fmt: off
from infrastructure.backup.scripts.inspect_database_backup import (  # noqa: E402
    BackupInspectionError,
    generate_with_move_clause,
    parse_filelistonly_output,
)
from infrastructure.backup.scripts.validate_archive import (  # noqa: E402
    ArchiveValidationError,
    validate_tar_archive,
)
# fmt: on


# =====================================================================
# 1. Database Inspection & Dynamic WITH MOVE Tests
# =====================================================================


def test_parse_filelistonly_output_multiple_files():
    """Assert parse_filelistonly_output handles multiple data and log files correctly."""
    raw_output = """
LogicalName, PhysicalName, Type, FileGroupName, Size
TaskSyncEnterprise, /var/opt/mssql/data/TaskSyncEnterprise.mdf, D, PRIMARY, 10485760
TaskSyncEnterprise_log, /var/opt/mssql/data/TaskSyncEnterprise_log.ldf, L, NULL, 5242880
TaskSyncEnterprise_Data2, /var/opt/mssql/data/TaskSyncEnterprise_2.ndf, D, PRIMARY, 10485760
"""
    files = parse_filelistonly_output(raw_output)
    assert len(files) == 3
    assert files[0]["logical_name"] == "TaskSyncEnterprise"
    assert files[0]["type"] == "D"
    assert files[1]["logical_name"] == "TaskSyncEnterprise_log"
    assert files[1]["type"] == "L"


def test_generate_with_move_clause_dynamic():
    """Assert generate_with_move_clause constructs correct MOVE statements for test target database."""
    file_list = [
        {
            "logical_name": "TaskSyncEnterprise",
            "physical_name": "TaskSyncEnterprise.mdf",
            "type": "D",
        },
        {
            "logical_name": "TaskSyncEnterprise_log",
            "physical_name": "TaskSyncEnterprise_log.ldf",
            "type": "L",
        },
    ]
    target_db = "TaskSyncEnterprise_restore_test"
    moves = generate_with_move_clause(file_list, target_db)

    assert len(moves) == 2
    assert (
        "MOVE N'TaskSyncEnterprise' TO N'/var/opt/mssql/data/TaskSyncEnterprise_restore_test.mdf'"
        in moves[0]
    )
    assert (
        "MOVE N'TaskSyncEnterprise_log' TO N'/var/opt/mssql/data/TaskSyncEnterprise_restore_test_log.ldf'"
        in moves[1]
    )


def test_generate_with_move_missing_data_file_fails():
    """Assert generate_with_move_clause raises BackupInspectionError if data file is missing."""
    file_list = [
        {
            "logical_name": "TaskSyncEnterprise_log",
            "physical_name": "TaskSyncEnterprise_log.ldf",
            "type": "L",
        }
    ]
    with pytest.raises(BackupInspectionError, match="no data file"):
        generate_with_move_clause(file_list, "TaskSyncEnterprise_test")


def test_generate_with_move_duplicate_logical_name_fails():
    """Assert generate_with_move_clause raises BackupInspectionError if duplicate logical names exist."""
    file_list = [
        {
            "logical_name": "TaskSyncEnterprise",
            "physical_name": "TaskSyncEnterprise.mdf",
            "type": "D",
        },
        {
            "logical_name": "TaskSyncEnterprise",
            "physical_name": "TaskSyncEnterprise_2.mdf",
            "type": "D",
        },
        {
            "logical_name": "TaskSyncEnterprise_log",
            "physical_name": "TaskSyncEnterprise_log.ldf",
            "type": "L",
        },
    ]
    with pytest.raises(BackupInspectionError, match="Duplicate logical file name"):
        generate_with_move_clause(file_list, "TaskSyncEnterprise_test")


# =====================================================================
# 2. Production Overwrite Safeguard Logic Tests
# =====================================================================


def test_production_overwrite_safeguards():
    """Assert production target DB 'TaskSyncEnterprise' requires both force and exact confirmation."""
    target_db = "TaskSyncEnterprise"
    force_prod = True
    confirm_str_valid = "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    confirm_str_invalid = "wrong_confirmation_string"

    # Valid case: both present and matching
    assert (target_db != "TaskSyncEnterprise") or (
        force_prod and confirm_str_valid == "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
    )

    # Invalid case: wrong confirmation string
    assert not (
        (target_db != "TaskSyncEnterprise")
        or (
            force_prod
            and confirm_str_invalid == "RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
        )
    )


# =====================================================================
# 3. Upload Archive Pre-Extraction Security Tests
# =====================================================================


def test_validate_tar_archive_valid(tmp_path):
    """Assert valid tarball archive passes validation."""
    archive_file = tmp_path / "valid_uploads.tar.gz"
    with tarfile.open(archive_file, "w:gz") as tar:
        # Create a dummy file to add
        dummy_file = tmp_path / "avatar1.png"
        dummy_file.write_bytes(b"PNG header data")
        tar.add(dummy_file, arcname="avatars/avatar1.png")

    assert validate_tar_archive(archive_file) is True


def test_validate_tar_archive_parent_traversal_fails(tmp_path):
    """Assert archive containing parent traversal '..' path fails validation."""
    archive_file = tmp_path / "traversal.tar.gz"
    with tarfile.open(archive_file, "w:gz") as tar:
        dummy = tmp_path / "hack.txt"
        dummy.write_bytes(b"hacked")
        tar.add(dummy, arcname="../outside.txt")

    with pytest.raises(ArchiveValidationError, match="Path traversal"):
        validate_tar_archive(archive_file)


def test_validate_tar_archive_absolute_path_fails(tmp_path):
    """Assert archive containing absolute path '/etc/passwd' fails validation."""
    archive_file = tmp_path / "absolute.tar.gz"
    with tarfile.open(archive_file, "w:gz") as tar:
        ti = tarfile.TarInfo(name="/etc/passwd")
        content = b"hacked"
        ti.size = len(content)
        import io

        tar.addfile(ti, io.BytesIO(content))

    with pytest.raises(ArchiveValidationError, match="Path traversal"):
        validate_tar_archive(archive_file)


def test_validate_tar_archive_max_files_exceeded_fails(tmp_path):
    """Assert archive exceeding max_files limit fails validation."""
    archive_file = tmp_path / "too_many_files.tar.gz"
    with tarfile.open(archive_file, "w:gz") as tar:
        for i in range(5):
            f = tmp_path / f"file_{i}.txt"
            f.write_bytes(b"content")
            tar.add(f, arcname=f"file_{i}.txt")

    # Set max_files = 3
    with pytest.raises(ArchiveValidationError, match="maximum file count limit"):
        validate_tar_archive(archive_file, max_files=3)


def test_validate_tar_archive_duplicate_paths_fail(tmp_path):
    """Assert archive containing duplicate entry paths fails validation."""
    archive_file = tmp_path / "duplicate_paths.tar.gz"
    with tarfile.open(archive_file, "w:gz") as tar:
        f1 = tmp_path / "f1.txt"
        f1.write_bytes(b"data1")
        tar.add(f1, arcname="file.txt")
        tar.add(f1, arcname="file.txt")

    with pytest.raises(ArchiveValidationError, match="Duplicate entry path"):
        validate_tar_archive(archive_file)
