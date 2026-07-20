"""
Backup Manifest loading, validation, and semantic verification utilities for TaskSyncEnterprise.
Validates manifest structure using JSON Schema Draft 2020-12 and enforces strict security rules.
"""

import json
from pathlib import Path
from typing import Any

import jsonschema

from .paths import (
    FORBIDDEN_SECRET_KEYWORDS,
    PathSafetyError,
    validate_safe_relative_path,
)

SCHEMA_PATH = (
    Path(__file__).parent.parent / "schemas" / "backup-manifest-v1.schema.json"
)


class ManifestValidationError(ValueError):
    """Raised when manifest JSON fails schema or semantic validation."""

    pass


def _load_schema() -> dict[str, Any]:
    """Load the JSON Schema from disk."""
    if not SCHEMA_PATH.exists():
        raise ManifestValidationError(
            f"Manifest schema file missing at '{SCHEMA_PATH}'"
        )
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise ManifestValidationError(f"Failed to load JSON schema: {exc}") from exc


def _check_forbidden_keys(data: Any, current_path: str = "") -> None:
    """Recursively check for forbidden secret-like keys in manifest data."""
    if isinstance(data, dict):
        for key, value in data.items():
            key_lower = str(key).lower()
            if any(forbidden in key_lower for forbidden in FORBIDDEN_SECRET_KEYWORDS):
                raise ManifestValidationError(
                    f"Forbidden secret-like key detected in manifest: '{current_path}.{key}'"
                )
            _check_forbidden_keys(value, f"{current_path}.{key}")
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            _check_forbidden_keys(item, f"{current_path}[{idx}]")


def load_manifest(manifest_path: Path) -> dict[str, Any]:
    """
    Load a manifest JSON file from disk.

    Args:
        manifest_path: Path to manifest.json file.

    Returns:
        Parsed dictionary of manifest data.

    Raises:
        ManifestValidationError: If file missing, unreadable, or invalid JSON.
    """
    if not manifest_path.exists():
        raise ManifestValidationError(f"Manifest file missing: '{manifest_path}'")

    if manifest_path.is_dir():
        raise ManifestValidationError(
            f"Manifest path is a directory: '{manifest_path}'"
        )

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise ManifestValidationError(
            f"Invalid JSON in manifest file '{manifest_path}': {exc}"
        ) from exc
    except OSError as exc:
        raise ManifestValidationError(
            f"Failed to read manifest file '{manifest_path}': {exc}"
        ) from exc

    return data


def validate_manifest(
    manifest_data: dict[str, Any], schema_data: dict[str, Any] | None = None
) -> bool:
    """
    Validate manifest dictionary against JSON Schema and semantic security rules.

    Args:
        manifest_data: Manifest dictionary to validate.
        schema_data: Optional pre-loaded schema dictionary.

    Returns:
        True if manifest is completely valid.

    Raises:
        ManifestValidationError: If schema or semantic validation fails.
    """
    # 1. Check for forbidden secret-like keys first
    _check_forbidden_keys(manifest_data)

    # 2. Structural validation via jsonschema
    schema = schema_data or _load_schema()
    try:
        jsonschema.validate(instance=manifest_data, schema=schema)
    except jsonschema.ValidationError as exc:
        # Sanitize error message to avoid reflecting secret inputs
        error_field = ".".join(str(p) for p in exc.path) or "root"
        raise ManifestValidationError(
            f"Manifest schema validation failed at '{error_field}': {exc.message}"
        ) from exc
    except jsonschema.SchemaError as exc:
        raise ManifestValidationError(
            f"Internal JSON schema definition error: {exc.message}"
        ) from exc

    # 3. Semantic Path Safety & Duplicate Path Checks
    artifacts = manifest_data.get("artifacts", [])
    seen_paths: set[str] = set()
    seen_components: set[str] = set()
    has_database_artifact = False

    for idx, artifact in enumerate(artifacts):
        rel_path_str = artifact["relative_path"]
        component = artifact["component"]

        # Validate relative path safety rules (no '..', no absolute, no drive letters)
        try:
            validate_safe_relative_path(rel_path_str)
        except PathSafetyError as exc:
            raise ManifestValidationError(
                f"Artifact [{idx}] path safety violation: {exc}"
            ) from exc

        # Check for duplicate paths
        normalized_path = rel_path_str.replace("\\", "/").lower()
        if normalized_path in seen_paths:
            raise ManifestValidationError(
                f"Duplicate relative path detected in manifest artifacts: '{rel_path_str}'"
            )
        seen_paths.add(normalized_path)

        # Check for duplicate single-instance components (e.g. database, uploads, redis)
        if component in seen_components:
            raise ManifestValidationError(
                f"Multiple artifacts defined for single-instance component: '{component}'"
            )
        seen_components.add(component)

        if component == "database":
            has_database_artifact = True

    # 4. Enforce mandatory database artifact for completed backups
    status = manifest_data.get("status")
    if status == "completed" and not has_database_artifact:
        raise ManifestValidationError(
            "Completed backup manifest must include a required 'database' artifact."
        )

    return True
