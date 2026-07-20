import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Any

# Ensure infrastructure package is importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# fmt: off
from infrastructure.backup.tools.checksums import (  # noqa: E402
    calculate_sha256,
    generate_checksum_file_content,
    verify_manifest_checksums,
)
from infrastructure.backup.tools.manifest import load_manifest, validate_manifest  # noqa: E402
# fmt: on


def finalize_backup_bundle(
    bundle_dir: Path, failure_message: str | None = None
) -> bool:
    """
    Finalize an in-progress backup bundle by updating manifest.json and checksums.sha256.

    Args:
        bundle_dir: Path to the working backup bundle directory.
        failure_message: Optional error message if backup failed.

    Returns:
        True if bundle finalization and verification succeeded.
    """
    manifest_path = bundle_dir / "manifest.json"
    if not manifest_path.exists():
        print(f"[ERROR] manifest.json missing in '{bundle_dir}'", file=sys.stderr)
        return False

    manifest = load_manifest(manifest_path)
    now_utc = datetime.now(timezone.utc)
    completed_at_str = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    if failure_message:
        manifest["status"] = "failed"
        manifest["timestamps"]["completed_at"] = completed_at_str
        manifest["failure"] = {
            "stage": "backup_execution",
            "message": failure_message,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"[INFO] Manifest marked as failed: {failure_message}")
        return False

    # Scan bundle directory for physical artifact files
    artifacts: list[dict[str, Any]] = []
    checksum_tuples: list[tuple[str, str]] = []

    # Expected component directories
    component_dirs = {
        "database": ("application/octet-stream", True),
        "uploads": ("application/gzip", False),
        "redis": ("application/x-redis-rdb", False),
    }

    for comp_name, (media_type, req_flag) in component_dirs.items():
        comp_path = bundle_dir / comp_name
        if comp_path.exists() and comp_path.is_dir():
            for artifact_file in sorted(comp_path.glob("*")):
                if artifact_file.is_file():
                    rel_path = f"{comp_name}/{artifact_file.name}"
                    file_size = artifact_file.stat().st_size
                    file_sha256 = calculate_sha256(artifact_file)

                    artifacts.append(
                        {
                            "component": comp_name,
                            "relative_path": rel_path,
                            "media_type": media_type,
                            "size_bytes": file_size,
                            "sha256": file_sha256,
                            "required": req_flag,
                        }
                    )
                    checksum_tuples.append((file_sha256, rel_path))

    # Calculate started_at vs completed_at duration
    started_at_str = manifest["timestamps"]["started_at"]
    try:
        started_dt = datetime.strptime(started_at_str, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        duration = int((now_utc - started_dt).total_seconds())
    except ValueError:
        duration = 0

    manifest["artifacts"] = artifacts
    manifest["timestamps"]["completed_at"] = completed_at_str
    manifest["timestamps"]["duration_seconds"] = max(0, duration)
    manifest["status"] = "completed"
    manifest["integrity"]["verified"] = True

    # Write updated manifest.json
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Calculate sha256 for manifest.json itself and add to checksum list
    manifest_sha256 = calculate_sha256(manifest_path)
    checksum_tuples.append((manifest_sha256, "manifest.json"))

    # Sort checksum entries deterministically by relative path
    checksum_tuples.sort(key=lambda x: x[1])

    # Write checksums.sha256
    checksum_file_path = bundle_dir / "checksums.sha256"
    checksum_content = generate_checksum_file_content(checksum_tuples)
    with open(checksum_file_path, "w", encoding="utf-8") as f:
        f.write(checksum_content)

    # Validate resulting manifest against schema & check manifest integrity
    validate_manifest(manifest)
    verify_manifest_checksums(bundle_dir, manifest)

    print(f"[INFO] Backup bundle finalization successful: '{bundle_dir.name}'")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Finalize TaskSyncEnterprise Backup Bundle"
    )
    parser.add_argument(
        "--bundle", required=True, help="Path to temporary bundle directory"
    )
    parser.add_argument("--failure-message", help="Optional failure error message")
    args = parser.parse_args()

    bundle_path = Path(args.bundle).resolve()
    if not bundle_path.exists():
        print(f"[ERROR] Bundle directory missing: '{bundle_path}'", file=sys.stderr)
        sys.exit(1)

    success = finalize_backup_bundle(bundle_path, failure_message=args.failure_message)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
