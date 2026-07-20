#!/usr/bin/env bash
# Common environment setup and utility functions for TaskSyncEnterprise Backup Scripts.

set -Eeuo pipefail

log_info() {
    echo "[INFO] $(date -u +'%Y-%m-%dT%H:%M:%SZ') - $*"
}

log_warn() {
    echo "[WARN] $(date -u +'%Y-%m-%dT%H:%M:%SZ') - $*" >&2
}

log_error() {
    echo "[ERROR] $(date -u +'%Y-%m-%dT%H:%M:%SZ') - $*" >&2
}

generate_backup_id() {
    local timestamp
    timestamp=$(date -u +'%Y%m%dT%H%M%SZ')
    local rand_suffix
    if command -v openssl >/dev/null 2>&1; then
        rand_suffix=$(openssl rand -hex 4)
    else
        rand_suffix=$(printf '%08x' "$RANDOM$RANDOM")
    fi
    echo "backup_${timestamp}_${rand_suffix}"
}

validate_backup_root() {
    local root_path="$1"

    if [ -z "$root_path" ]; then
        log_error "Backup root path cannot be empty."
        return 1
    fi

    # Reject system root '/'
    if [ "$root_path" = "/" ] || [ "$root_path" = "\\" ]; then
        log_error "Backup root cannot be system root directory."
        return 1
    fi

    # Reject Windows drive root (e.g. C:\ or C:)
    if [[ "$root_path" =~ ^[A-Za-z]:[/\\]*$ ]]; then
        log_error "Backup root cannot be a Windows drive root directory."
        return 1
    fi

    # Reject path traversal segments
    if [[ "$root_path" =~ \.\. ]]; then
        log_error "Backup root path cannot contain '..' traversal segments."
        return 1
    fi

    # Normalize check: reject if pointing directly to uploads
    if [[ "$root_path" =~ uploads/?$ ]]; then
        log_error "Backup root cannot be the uploads directory itself."
        return 1
    fi

    return 0
}

validate_db_identifier() {
    local db_name="$1"
    # Allow alphanumeric, underscore, hyphen
    if [[ ! "$db_name" =~ ^[A-Za-z0-9_-]+$ ]]; then
        log_error "Invalid database identifier: '$db_name'"
        return 1
    fi
    return 0
}
