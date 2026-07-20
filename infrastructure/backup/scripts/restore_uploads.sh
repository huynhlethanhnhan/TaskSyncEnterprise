#!/usr/bin/env bash
# Safe Uploads Restore & Atomic Rollback Script for TaskSyncEnterprise (Phase 3.8.7 Step 4).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="tasksync-backend-prod"
BUNDLE_DIR=""
TARGET_UPLOADS_PATH="/app/uploads"
REPLACE_EXISTING="false"
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --bundle <path>          Path to backup bundle directory"
    echo "  --container <name>       Backend container name (default: tasksync-backend-prod)"
    echo "  --target-path <path>     Target uploads path inside container (default: /app/uploads)"
    echo "  --replace-existing-uploads Allow replacing existing uploads directory"
    echo "  --dry-run                Sanitized preview mode"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bundle) BUNDLE_DIR="$2"; shift 2 ;;
        --container) CONTAINER_NAME="$2"; shift 2 ;;
        --target-path) TARGET_UPLOADS_PATH="$2"; shift 2 ;;
        --replace-existing-uploads) REPLACE_EXISTING="true"; shift ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

if [ -z "$BUNDLE_DIR" ] || [ ! -d "$BUNDLE_DIR" ]; then
    log_error "Backup bundle directory missing or invalid: '$BUNDLE_DIR'"
    exit 1
fi

UPLOADS_TARBALL=$(ls "$BUNDLE_DIR/uploads/"*.tar.gz 2>/dev/null | head -n 1 || true)
if [ -z "$UPLOADS_TARBALL" ] || [ ! -f "$UPLOADS_TARBALL" ]; then
    log_error "Uploads tarball missing in bundle '$BUNDLE_DIR/uploads/'"
    exit 1
fi

log_info "Validating archive security prior to extraction..."
python "$SCRIPT_DIR/validate_archive.py" --archive "$UPLOADS_TARBALL"

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')
STAGING_PATH="/app/uploads_staging_$TIMESTAMP"
ROLLBACK_PATH="/app/uploads_rollback_$TIMESTAMP"

if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY-RUN] Would execute uploads restore:"
    log_info "[DRY-RUN] Tarball:       $UPLOADS_TARBALL"
    log_info "[DRY-RUN] Staging Path:  $STAGING_PATH"
    log_info "[DRY-RUN] Target Path:   $TARGET_UPLOADS_PATH"
    exit 0
fi

log_info "Copying archive to container '$CONTAINER_NAME' and extracting to isolated staging path '$STAGING_PATH'..."
CONTAINER_TARBALL="/tmp/uploads_restore_$TIMESTAMP.tar.gz"
docker cp "$UPLOADS_TARBALL" "$CONTAINER_NAME:$CONTAINER_TARBALL"

# Extract to staging directory inside container
docker exec "$CONTAINER_NAME" mkdir -p "$STAGING_PATH"
docker exec "$CONTAINER_NAME" tar -xzpf "$CONTAINER_TARBALL" -C "$STAGING_PATH"
docker exec "$CONTAINER_NAME" rm -f "$CONTAINER_TARBALL"

# Atomic replace with rollback protection
log_info "Performing atomic uploads replacement..."
docker exec "$CONTAINER_NAME" bash -c "
    set -e
    if [ -d '$TARGET_UPLOADS_PATH' ]; then
        if [ '$REPLACE_EXISTING' != 'true' ]; then
            echo '[ERROR] Target uploads directory exists. Pass --replace-existing-uploads to overwrite.' >&2
            rm -rf '$STAGING_PATH'
            exit 1
        fi
        mv '$TARGET_UPLOADS_PATH' '$ROLLBACK_PATH'
    fi

    if mv '$STAGING_PATH' '$TARGET_UPLOADS_PATH'; then
        [ -d '$ROLLBACK_PATH' ] && rm -rf '$ROLLBACK_PATH'
        echo '[INFO] Uploads directory replaced successfully.'
    else
        echo '[ERROR] Move failed. Restoring rollback directory...' >&2
        [ -d '$ROLLBACK_PATH' ] && mv '$ROLLBACK_PATH' '$TARGET_UPLOADS_PATH'
        exit 1
    fi
"

log_info "Uploads restore completed successfully."
