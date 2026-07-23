"""
Upload Archive Pre-Extraction Security Validator for TaskSyncEnterprise (Phase 3.8.7 Step 4).
Validates tar.gz archives for path traversal, symlink escapes, dangerous special files,
duplicate entries, and archive bomb (compression ratio) limits prior to extraction.
"""

import argparse
import os
import sys
import tarfile
from pathlib import Path

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# fmt: off
from infrastructure.backup.tools.paths import (  # noqa: E402
    PathSafetyError,
    validate_safe_relative_path,
)
# fmt: on

DEFAULT_MAX_FILES = int(os.environ.get("RESTORE_UPLOADS_MAX_FILES", 100000))
DEFAULT_MAX_UNCOMPRESSED_BYTES = int(
    os.environ.get("RESTORE_UPLOADS_MAX_UNCOMPRESSED_BYTES", 10737418240)  # 10 GB
)
DEFAULT_MAX_COMPRESSION_RATIO = int(
    os.environ.get("RESTORE_UPLOADS_MAX_COMPRESSION_RATIO", 100)
)


class ArchiveValidationError(ValueError):
    """Raised when an archive fails security or structural validation."""

    pass


def validate_tar_archive(
    archive_path: Path,
    max_files: int = DEFAULT_MAX_FILES,
    max_uncompressed_bytes: int = DEFAULT_MAX_UNCOMPRESSED_BYTES,
    max_ratio: int = DEFAULT_MAX_COMPRESSION_RATIO,
) -> bool:
    """
    Validate a compressed tarball archive for security hazards and structural integrity.

    Args:
        archive_path: Path to the tar.gz archive file.
        max_files: Maximum allowed total file count.
        max_uncompressed_bytes: Maximum allowed uncompressed byte size.
        max_ratio: Maximum allowed ratio of uncompressed to compressed size.

    Returns:
        True if archive passes all security validations.

    Raises:
        ArchiveValidationError: If any path traversal, symlink escape, or archive bomb limit is triggered.
    """
    if not archive_path.exists():
        raise ArchiveValidationError(f"Archive file missing on disk: '{archive_path}'")

    compressed_size = archive_path.stat().st_size
    if compressed_size == 0:
        raise ArchiveValidationError(
            f"Archive file is empty (0 bytes): '{archive_path}'"
        )

    file_count = 0
    total_uncompressed_size = 0
    seen_paths: set[str] = set()

    try:
        with tarfile.open(archive_path, "r:*") as tar:
            for member in tar.getmembers():
                file_count += 1
                if file_count > max_files:
                    raise ArchiveValidationError(
                        f"Archive exceeds maximum file count limit ({max_files} files)."
                    )

                # 1. Path Safety Check
                member_name = member.name
                try:
                    validate_safe_relative_path(member_name)
                except PathSafetyError as exc:
                    raise ArchiveValidationError(
                        f"Path traversal or invalid path in archive entry '{member_name}': {exc}"
                    ) from exc

                # 2. Check for duplicate paths
                norm_name = member_name.replace("\\", "/").lower()
                if norm_name in seen_paths:
                    raise ArchiveValidationError(
                        f"Duplicate entry path in archive: '{member_name}'"
                    )
                seen_paths.add(norm_name)

                # 3. Reject dangerous special file types (devices, FIFOs, sockets)
                if (
                    member.isdev()
                    or member.isfifo()
                    or member.ischr()
                    or member.isblk()
                ):
                    raise ArchiveValidationError(
                        f"Forbidden special device or FIFO file in archive entry: '{member_name}'"
                    )

                # 4. Check symlinks & hardlinks for escapes
                if member.issym() or member.islnk():
                    link_target = member.linkname
                    try:
                        validate_safe_relative_path(link_target)
                    except PathSafetyError as exc:
                        raise ArchiveValidationError(
                            f"Unsafe symlink target escape in entry '{member_name}' -> '{link_target}': {exc}"
                        ) from exc

                # 5. Accumulate uncompressed size
                total_uncompressed_size += member.size
                if total_uncompressed_size > max_uncompressed_bytes:
                    raise ArchiveValidationError(
                        f"Archive exceeds uncompressed size limit ({max_uncompressed_bytes} bytes)."
                    )

    except tarfile.TarError as exc:
        raise ArchiveValidationError(
            f"Corrupted or invalid tar archive '{archive_path}': {exc}"
        ) from exc

    # 6. Archive bomb ratio check
    ratio = total_uncompressed_size / compressed_size if compressed_size > 0 else 0
    if (
        ratio > max_ratio and compressed_size > 1024
    ):  # Only enforce ratio on non-trivial archives
        raise ArchiveValidationError(
            f"Archive compression ratio ({ratio:.1f}:1) exceeds safety threshold ({max_ratio}:1)."
        )

    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate Uploads Tarball Archive Security"
    )
    parser.add_argument("--archive", required=True, help="Path to tar.gz archive")
    args = parser.parse_args()

    archive_file = Path(args.archive).resolve()
    try:
        validate_tar_archive(archive_file)
        print(f"[INFO] Archive '{archive_file.name}' passed security validation.")
    except Exception as exc:
        print(f"[ERROR] Archive validation failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
