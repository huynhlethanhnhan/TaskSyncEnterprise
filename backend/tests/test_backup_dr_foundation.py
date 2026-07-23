"""
Automated unit tests for TaskSyncEnterprise Backup & DR Foundation (Phase 3.8.7 Step 2).
Tests manifest JSON schema validation, path safety controls, and chunked SHA-256 checksums.
Runs entirely offline using pytest tmp_path fixtures.
"""

import sys
from pathlib import Path
import pytest

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from infrastructure.backup.tools.checksums import (  # noqa: E402
    ChecksumValidationError,
    calculate_sha256,
    generate_checksum_file_content,
    verify_checksum_file,
    verify_manifest_checksums,
)
from infrastructure.backup.tools.manifest import (  # noqa: E402
    ManifestValidationError,
    load_manifest,
    validate_manifest,
)
from infrastructure.backup.tools.paths import (  # noqa: E402
    PathSafetyError,
    validate_safe_relative_path,
    verify_within_directory,
)

# =====================================================================
# Fixtures & Helper Factories
# =====================================================================


@pytest.fixture
def valid_manifest_dict() -> dict:
    """Return a completely valid full backup manifest dictionary."""
    return {
        "manifest_version": "1.0",
        "backup_id": "backup_20260720T010000Z_a1b2c3d4",
        "application": {
            "name": "TaskSyncEnterprise",
            "version": "1.0.0",
            "git_commit": "a1b2c3d4e5f67890",
        },
        "environment": "production",
        "timestamps": {
            "started_at": "2026-07-20T01:00:00Z",
            "completed_at": "2026-07-20T01:02:15Z",
            "duration_seconds": 135,
        },
        "backup_type": "full",
        "status": "completed",
        "artifacts": [
            {
                "component": "database",
                "relative_path": "database/TaskSyncEnterprise_20260720_010000.bak",
                "media_type": "application/octet-stream",
                "size_bytes": 1024,
                "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "required": True,
            },
            {
                "component": "uploads",
                "relative_path": "uploads/uploads_20260720_010000.tar.gz",
                "media_type": "application/gzip",
                "size_bytes": 2048,
                "sha256": "8f4e2a1b9c3d5e7f6a8b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f",
                "required": False,
            },
        ],
        "integrity": {
            "algorithm": "sha256",
            "checksum_file": "checksums.sha256",
            "verified": True,
        },
        "encryption": {
            "enabled": False,
            "provider": "none",
            "algorithm": None,
        },
        "compatibility": {
            "database_engine": "Microsoft SQL Server",
            "database_major_version": "16",
            "notes": ["Backup created on SQL Server 2022"],
        },
    }


# =====================================================================
# 1. Valid Manifest Tests
# =====================================================================


def test_valid_full_manifest_passes(valid_manifest_dict):
    """Assert valid full backup manifest passes schema and semantic validation."""
    assert validate_manifest(valid_manifest_dict) is True


def test_valid_differential_manifest_passes(valid_manifest_dict):
    """Assert valid differential backup manifest passes validation."""
    valid_manifest_dict["backup_type"] = "differential"
    assert validate_manifest(valid_manifest_dict) is True


def test_in_progress_manifest_with_null_completed_at_passes(valid_manifest_dict):
    """Assert in_progress manifest with null completed_at timestamp passes validation."""
    valid_manifest_dict["status"] = "in_progress"
    valid_manifest_dict["timestamps"]["completed_at"] = None
    valid_manifest_dict["timestamps"]["duration_seconds"] = None
    assert validate_manifest(valid_manifest_dict) is True


# =====================================================================
# 2. Invalid Manifest Tests
# =====================================================================


def test_manifest_missing_required_field_fails(valid_manifest_dict):
    """Assert manifest missing required top-level field fails validation."""
    del valid_manifest_dict["environment"]
    with pytest.raises(ManifestValidationError, match="environment"):
        validate_manifest(valid_manifest_dict)


def test_manifest_invalid_backup_id_fails(valid_manifest_dict):
    """Assert invalid backup_id format fails validation."""
    valid_manifest_dict["backup_id"] = "invalid_id_format"
    with pytest.raises(ManifestValidationError, match="backup_id"):
        validate_manifest(valid_manifest_dict)


def test_manifest_invalid_sha256_length_fails(valid_manifest_dict):
    """Assert non-64 hex SHA-256 fails validation."""
    valid_manifest_dict["artifacts"][0]["sha256"] = "abc123short"
    with pytest.raises(ManifestValidationError, match="sha256"):
        validate_manifest(valid_manifest_dict)


def test_manifest_unknown_component_fails(valid_manifest_dict):
    """Assert unknown component enum value fails validation."""
    valid_manifest_dict["artifacts"][0]["component"] = "invalid_component"
    with pytest.raises(ManifestValidationError, match="component"):
        validate_manifest(valid_manifest_dict)


@pytest.mark.parametrize(
    "secret_key", ["password", "MSSQL_SA_PASSWORD", "secret_key", "api_token"]
)
def test_manifest_forbidden_secret_keys_fail(valid_manifest_dict, secret_key):
    """Assert manifest containing secret-like keys is strictly rejected."""
    valid_manifest_dict[secret_key] = "super_secret_value"
    with pytest.raises(ManifestValidationError, match="Forbidden secret-like key"):
        validate_manifest(valid_manifest_dict)


def test_manifest_duplicate_relative_paths_fail(valid_manifest_dict):
    """Assert duplicate artifact relative paths fail validation."""
    valid_manifest_dict["artifacts"][1]["relative_path"] = valid_manifest_dict[
        "artifacts"
    ][0]["relative_path"]
    with pytest.raises(ManifestValidationError, match="Duplicate relative path"):
        validate_manifest(valid_manifest_dict)


def test_manifest_absolute_path_fails(valid_manifest_dict):
    """Assert absolute path in relative_path fails validation."""
    valid_manifest_dict["artifacts"][0]["relative_path"] = "/etc/passwd"
    with pytest.raises(ManifestValidationError):
        validate_manifest(valid_manifest_dict)


def test_manifest_parent_traversal_path_fails(valid_manifest_dict):
    """Assert parent traversal '..' path fails validation."""
    valid_manifest_dict["artifacts"][0]["relative_path"] = "../outside.bak"
    with pytest.raises(ManifestValidationError):
        validate_manifest(valid_manifest_dict)


def test_manifest_windows_drive_path_fails(valid_manifest_dict):
    """Assert Windows drive path fails validation."""
    valid_manifest_dict["artifacts"][0]["relative_path"] = "C:\\Windows\\system32.bak"
    with pytest.raises(ManifestValidationError):
        validate_manifest(valid_manifest_dict)


def test_manifest_unc_path_fails(valid_manifest_dict):
    """Assert UNC path fails validation."""
    valid_manifest_dict["artifacts"][0]["relative_path"] = "\\\\server\\share\\file.bak"
    with pytest.raises(ManifestValidationError):
        validate_manifest(valid_manifest_dict)


def test_completed_manifest_missing_database_fails(valid_manifest_dict):
    """Assert completed manifest missing required database component fails validation."""
    valid_manifest_dict["artifacts"] = [
        valid_manifest_dict["artifacts"][1]
    ]  # Only uploads
    with pytest.raises(ManifestValidationError, match="required 'database' artifact"):
        validate_manifest(valid_manifest_dict)


# =====================================================================
# 3. Checksum Utility Tests
# =====================================================================


def test_calculate_sha256_correct(tmp_path):
    """Assert SHA-256 calculation matches expected hash."""
    test_file = tmp_path / "test.txt"
    test_file.write_text("Hello TaskSyncEnterprise", encoding="utf-8")

    # Hash of "Hello TaskSyncEnterprise"
    expected = "62ced22443ce4341ad02b5aca7b017551b168f76bb963a6b87c931f26394c197"
    assert calculate_sha256(test_file) == expected


def test_calculate_sha256_empty_file(tmp_path):
    """Assert empty file hashes correctly to empty SHA-256 string."""
    empty_file = tmp_path / "empty.bin"
    empty_file.write_bytes(b"")

    empty_sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert calculate_sha256(empty_file) == empty_sha256


def test_calculate_sha256_large_file_streaming(tmp_path):
    """Assert streaming logic works for larger files (> 1MB)."""
    large_file = tmp_path / "large.bin"
    chunk = b"A" * 65536  # 64 KB
    with open(large_file, "wb") as f:
        for _ in range(20):  # 1.28 MB
            f.write(chunk)

    digest = calculate_sha256(large_file)
    assert len(digest) == 64


def test_checksum_modified_file_fails(tmp_path, valid_manifest_dict):
    """Assert modified file content fails manifest checksum verification."""
    db_dir = tmp_path / "database"
    db_dir.mkdir()
    db_file = db_dir / "TaskSyncEnterprise_20260720_010000.bak"
    db_file.write_bytes(b"Modified content")

    valid_manifest_dict["artifacts"][0]["size_bytes"] = len(b"Modified content")

    with pytest.raises(ChecksumValidationError, match="SHA-256 mismatch"):
        verify_manifest_checksums(tmp_path, valid_manifest_dict)


def test_checksum_missing_file_fails(tmp_path, valid_manifest_dict):
    """Assert missing artifact file fails manifest verification."""
    with pytest.raises(ChecksumValidationError, match="Artifact file missing on disk"):
        verify_manifest_checksums(tmp_path, valid_manifest_dict)


def test_checksum_directory_rejected(tmp_path, valid_manifest_dict):
    """Assert directory at artifact path fails verification."""
    db_dir = tmp_path / "database"
    db_dir.mkdir()
    db_file_dir = db_dir / "TaskSyncEnterprise_20260720_010000.bak"
    db_file_dir.mkdir()

    with pytest.raises(ChecksumValidationError, match="Artifact path is a directory"):
        verify_manifest_checksums(tmp_path, valid_manifest_dict)


def test_verify_checksum_file_success(tmp_path):
    """Assert verify_checksum_file parses and validates sha256sum content."""
    sub_dir = tmp_path / "data"
    sub_dir.mkdir()
    f1 = sub_dir / "file1.txt"
    f1.write_text("Data 1", encoding="utf-8")

    h1 = calculate_sha256(f1)
    checksum_content = generate_checksum_file_content([(h1, "data/file1.txt")])

    checksum_file = tmp_path / "checksums.sha256"
    checksum_file.write_text(checksum_content, encoding="utf-8")

    res = verify_checksum_file(tmp_path, checksum_file)
    assert res["data/file1.txt"] is True


# =====================================================================
# 4. Path Safety Utility Tests
# =====================================================================


def test_safe_relative_path_valid():
    """Assert safe relative paths pass validation."""
    p1 = validate_safe_relative_path("database/file.bak")
    assert str(p1).replace("\\", "/") == "database/file.bak"

    p2 = validate_safe_relative_path("uploads/avatars/image.png")
    assert str(p2).replace("\\", "/") == "uploads/avatars/image.png"


@pytest.mark.parametrize(
    "bad_path",
    [
        "../outside.txt",
        "../../etc/passwd",
        "/etc/passwd",
        "/var/log/app.log",
        "C:\\Windows\\system32",
        "D:\\data\\file.bak",
        "\\\\server\\share\\folder",
        "",
        "   ",
    ],
)
def test_unsafe_paths_raise_error(bad_path):
    """Assert unsafe or malicious path strings raise PathSafetyError."""
    with pytest.raises(PathSafetyError):
        validate_safe_relative_path(bad_path)


def test_verify_within_directory_root_escape(tmp_path):
    """Assert path escaping base root raises PathSafetyError."""
    base_dir = tmp_path / "bundle"
    base_dir.mkdir()

    outside_file = tmp_path / "outside.txt"
    outside_file.write_text("Secret outside", encoding="utf-8")

    with pytest.raises(PathSafetyError, match="escapes base root"):
        verify_within_directory(base_dir, outside_file)
