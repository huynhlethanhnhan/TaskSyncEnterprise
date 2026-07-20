"""
SHA-256 Checksum generation and verification utilities for TaskSyncEnterprise Backup & DR.
Streams files in 64KB chunks to maintain a low RAM footprint during processing.
"""

import hashlib
import hmac
from pathlib import Path
from typing import Any

from .paths import validate_safe_relative_path, verify_within_directory

CHUNK_SIZE_BYTES = 65536  # 64 KB streaming buffer


class ChecksumValidationError(ValueError):
    """Raised when checksum verification fails or file attributes are invalid."""

    pass


def calculate_sha256(file_path: Path) -> str:
    """
    Calculate the lowercase hex SHA-256 hash of a file using chunked streaming.

    Args:
        file_path: Absolute or relative Path to the file.

    Returns:
        64-character lowercase hexadecimal SHA-256 string.

    Raises:
        ChecksumValidationError: If file does not exist, is a directory, or is a symlink.
    """
    if not file_path.exists():
        raise ChecksumValidationError(f"File does not exist: '{file_path}'")

    if file_path.is_dir():
        raise ChecksumValidationError(
            f"Path is a directory, not a regular file: '{file_path}'"
        )

    if file_path.is_symlink():
        raise ChecksumValidationError(
            f"Symlink files are not allowed for hashing: '{file_path}'"
        )

    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as file_stream:
            while chunk := file_stream.read(CHUNK_SIZE_BYTES):
                sha256_hash.update(chunk)
    except OSError as exc:
        raise ChecksumValidationError(
            f"Failed to read file '{file_path}': {exc}"
        ) from exc

    return sha256_hash.hexdigest().lower()


def generate_checksum_file_content(artifacts: list[tuple[str, str]]) -> str:
    """
    Generate standard GNU sha256sum formatted content.

    Format: <64-hex-sha256>  <relative_path>

    Args:
        artifacts: List of tuples (sha256_hex, relative_path_string).

    Returns:
        Formatted multi-line text string.
    """
    lines: list[str] = []
    for digest, rel_path in artifacts:
        clean_digest = digest.strip().lower()
        clean_path = rel_path.strip().replace("\\", "/")
        lines.append(f"{clean_digest}  {clean_path}")
    return "\n".join(lines) + "\n"


def verify_checksum_file(
    bundle_root: Path, checksum_file_path: Path
) -> dict[str, bool]:
    """
    Parse a GNU sha256sum checksum file and verify all listed entries against bundle files.

    Args:
        bundle_root: Root directory of the backup bundle.
        checksum_file_path: Path to the checksums.sha256 file.

    Returns:
        Dict mapping relative paths to verification result (True if passed).

    Raises:
        ChecksumValidationError: If checksum file missing, corrupted, or hash mismatch.
    """
    if not checksum_file_path.exists():
        raise ChecksumValidationError(f"Checksum file missing: '{checksum_file_path}'")

    results: dict[str, bool] = {}
    with open(checksum_file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, start=1):
            line_str = line.strip()
            if not line_str or line_str.startswith("#"):
                continue

            # Standard format: "<hash>  <filename>" or "<hash> *<filename>"
            parts = line_str.split(maxsplit=1)
            if len(parts) != 2:
                raise ChecksumValidationError(
                    f"Malformed line {line_num} in '{checksum_file_path}': '{line_str}'"
                )

            expected_hash, rel_path_raw = parts[0].lower(), parts[1].lstrip("*").strip()
            if len(expected_hash) != 64:
                raise ChecksumValidationError(
                    f"Invalid SHA-256 hash length on line {line_num}: '{expected_hash}'"
                )

            safe_rel_path = validate_safe_relative_path(rel_path_raw)
            target_file = bundle_root / safe_rel_path
            verify_within_directory(bundle_root, target_file)

            actual_hash = calculate_sha256(target_file)
            if not hmac.compare_digest(actual_hash, expected_hash):
                raise ChecksumValidationError(
                    f"Checksum mismatch for '{rel_path_raw}': expected {expected_hash}, got {actual_hash}"
                )

            results[rel_path_raw] = True

    return results


def verify_manifest_checksums(bundle_root: Path, manifest: dict[str, Any]) -> bool:
    """
    Verify all artifacts defined in a manifest against physical files in bundle_root.

    Args:
        bundle_root: Base path of the backup bundle.
        manifest: Loaded manifest dictionary.

    Returns:
        True if all artifacts match expected SHA-256 hashes and file sizes.

    Raises:
        ChecksumValidationError: If any artifact is missing, mismatched, or invalid.
    """
    artifacts = manifest.get("artifacts", [])
    if not artifacts:
        raise ChecksumValidationError("Manifest contains no artifacts to verify.")

    for artifact in artifacts:
        rel_path_str = artifact["relative_path"]
        expected_hash = artifact["sha256"].lower()
        expected_size = artifact["size_bytes"]

        safe_rel_path = validate_safe_relative_path(rel_path_str)
        target_file = bundle_root / safe_rel_path
        verify_within_directory(bundle_root, target_file)

        if not target_file.exists():
            raise ChecksumValidationError(
                f"Artifact file missing on disk: '{rel_path_str}'"
            )

        if target_file.is_dir():
            raise ChecksumValidationError(
                f"Artifact path is a directory: '{rel_path_str}'"
            )

        actual_size = target_file.stat().st_size
        if actual_size != expected_size:
            raise ChecksumValidationError(
                f"File size mismatch for '{rel_path_str}': expected {expected_size} bytes, got {actual_size} bytes"
            )

        actual_hash = calculate_sha256(target_file)
        if not hmac.compare_digest(actual_hash, expected_hash):
            raise ChecksumValidationError(
                f"SHA-256 mismatch for '{rel_path_str}': expected {expected_hash}, got {actual_hash}"
            )

    return True
