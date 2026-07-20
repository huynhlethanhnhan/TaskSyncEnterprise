"""
Path safety validation utilities for TaskSyncEnterprise Backup & Restore.
Prevents path traversal vulnerabilities, root escapes, and invalid absolute/UNC paths.
"""

from pathlib import Path


class PathSafetyError(ValueError):
    """Raised when a path fails safety or traversal checks."""

    pass


FORBIDDEN_SECRET_KEYWORDS = {
    "password",
    "secret",
    "api_key",
    "token",
    "sa_password",
    "connection_string",
    "private_key",
}


def validate_safe_relative_path(path_str: str) -> Path:
    """
    Validate that a given string represents a safe, non-escaping relative path.

    Args:
        path_str: The relative path string to validate.

    Returns:
        A normalized relative Path object.

    Raises:
        PathSafetyError: If path is empty, absolute, UNC, contains '..' traversal,
                         or contains Windows drive letters.
    """
    if not path_str or not isinstance(path_str, str) or not path_str.strip():
        raise PathSafetyError("Path string cannot be empty or non-string.")

    raw_path = path_str.strip()

    # Reject Linux or Windows absolute paths
    if raw_path.startswith("/") or raw_path.startswith("\\"):
        raise PathSafetyError(
            f"Absolute path lead character is not allowed: '{path_str}'"
        )

    # Reject UNC paths (\\server\share)
    if raw_path.startswith("\\\\"):
        raise PathSafetyError(f"UNC paths are strictly forbidden: '{path_str}'")

    # Reject Windows drive letters (C:, D:\)
    if len(raw_path) >= 2 and raw_path[1] == ":":
        raise PathSafetyError(
            f"Windows drive letters are strictly forbidden: '{path_str}'"
        )

    # Normalize backslashes to forward slashes for segment checking
    normalized_str = raw_path.replace("\\", "/")
    parts = [part for part in normalized_str.split("/") if part and part != "."]

    for part in parts:
        if part == "..":
            raise PathSafetyError(
                f"Path traversal segment '..' is forbidden: '{path_str}'"
            )

    if not parts:
        raise PathSafetyError("Path resolves to an empty relative path.")

    return Path(*parts)


def verify_within_directory(
    base_dir: Path, target_path: Path, allow_symlinks: bool = False
) -> Path:
    """
    Verify that target_path resolves to a location strictly inside base_dir.

    Args:
        base_dir: The root directory boundary.
        target_path: The file or directory path to check.
        allow_symlinks: Whether to permit symlinks (defaults to False for security).

    Returns:
        The resolved absolute Path object.

    Raises:
        PathSafetyError: If target_path escapes base_dir or is an unsafe symlink.
    """
    resolved_base = base_dir.resolve()

    if not allow_symlinks:
        # Check if any component of target_path is a symlink
        check_path = target_path
        while check_path != check_path.parent:
            if check_path.is_symlink():
                raise PathSafetyError(
                    f"Symlinks are disabled for backup artifacts: '{target_path}'"
                )
            check_path = check_path.parent

    try:
        resolved_target = target_path.resolve()
    except Exception as exc:
        raise PathSafetyError(f"Failed to resolve path '{target_path}': {exc}") from exc

    try:
        resolved_target.relative_to(resolved_base)
    except ValueError:
        raise PathSafetyError(
            f"Path '{target_path}' (resolved: '{resolved_target}') escapes base root '{resolved_base}'"
        )

    return resolved_target
