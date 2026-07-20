"""
Backup Verification CLI Utility for TaskSyncEnterprise (Phase 3.8.7 Step 3).
Validates manifest schema, path safety, file sizes, and streaming SHA-256 checksums.
"""

import argparse
import sys
from pathlib import Path

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# fmt: off
from infrastructure.backup.tools.checksums import (  # noqa: E402
    verify_checksum_file,
    verify_manifest_checksums,
)
from infrastructure.backup.tools.manifest import load_manifest, validate_manifest  # noqa: E402
# fmt: on


def verify_backup_bundle(bundle_dir: Path) -> bool:
    """
    Verify a published backup bundle for schema compliance, file integrity, and checksum matches.

    Args:
        bundle_dir: Path to the backup bundle directory.

    Returns:
        True if backup bundle is completely valid.
    """
    manifest_path = bundle_dir / "manifest.json"
    checksum_path = bundle_dir / "checksums.sha256"

    if not manifest_path.exists():
        print(f"[ERROR] manifest.json missing in '{bundle_dir}'", file=sys.stderr)
        return False

    if not checksum_path.exists():
        print(f"[ERROR] checksums.sha256 missing in '{bundle_dir}'", file=sys.stderr)
        return False

    try:
        manifest = load_manifest(manifest_path)
        validate_manifest(manifest)

        status = manifest.get("status")
        if status != "completed":
            print(
                f"[ERROR] Backup status is '{status}', expected 'completed'",
                file=sys.stderr,
            )
            return False

        verify_manifest_checksums(bundle_dir, manifest)
        verify_checksum_file(bundle_dir, checksum_path)

    except Exception as exc:
        print(
            f"[ERROR] Backup verification failed for '{bundle_dir.name}': {exc}",
            file=sys.stderr,
        )
        return False

    print(f"[INFO] Backup bundle '{bundle_dir.name}' is VALID.")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify TaskSyncEnterprise Backup Bundle Integrity"
    )
    parser.add_argument(
        "--bundle", required=True, help="Path to backup bundle directory"
    )
    args = parser.parse_args()

    bundle_path = Path(args.bundle).resolve()
    if not bundle_path.exists():
        print(f"[ERROR] Bundle directory missing: '{bundle_path}'", file=sys.stderr)
        sys.exit(1)

    success = verify_backup_bundle(bundle_path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
