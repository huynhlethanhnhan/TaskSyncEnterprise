#!/usr/bin/env bash
# User Uploads Archive Script for TaskSyncEnterprise (Phase 3.8.7 Step 3).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="tasksync-backend-prod"
UPLOADS_PATH="/app/uploads"
OUTPUT_DIR=""
BACKUP_ID=""
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --container <name>       Backend container name (default: tasksync-backend-prod)"
    echo "  --uploads-path <path>    Path to uploads directory inside container (default: /app/uploads)"
    echo "  --output-dir <path>      Host destination directory for tar.gz file"
    echo "  --backup-id <id>         Backup bundle ID"
    echo "  --dry-run                Sanitized preview mode"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --container) CONTAINER_NAME="$2"; shift 2 ;;
        --uploads-path) UPLOADS_PATH="$2"; shift 2 ;;
        --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
        --backup-id) BACKUP_ID="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')
FILE_NAME="uploads_${TIMESTAMP}.tar.gz"
TARGET_FILE="$OUTPUT_DIR/$FILE_NAME"

if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY-RUN] Would create uploads archive:"
    log_info "[DRY-RUN] Container: $CONTAINER_NAME"
    log_info "[DRY-RUN] Source Path: $UPLOADS_PATH"
    log_info "[DRY-RUN] Target File: $TARGET_FILE"
    exit 0
fi

log_info "Archiving user uploads from container '$CONTAINER_NAME:$UPLOADS_PATH'..."

# Create temporary tarball on host or inside container
TMP_TARBALL="/tmp/$FILE_NAME"

# Archive inside backend container or via tar stream
docker exec "$CONTAINER_NAME" tar -czpf "$TMP_TARBALL" -C "$UPLOADS_PATH" .
docker cp "$CONTAINER_NAME:$TMP_TARBALL" "$TARGET_FILE"
docker exec "$CONTAINER_NAME" rm -f "$TMP_TARBALL"

# Inspect archive entries for path safety
log_info "Inspecting uploads archive entries for path safety..."
ARCHIVE_ENTRIES=$(tar -tzf "$TARGET_FILE")

while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    # Reject absolute path leading slashes
    if [[ "$entry" =~ ^/ ]]; then
        log_error "Path traversal violation in uploads archive: absolute path '$entry'"
        rm -f "$TARGET_FILE"
        exit 1
    fi
    # Reject parent traversal segments
    if [[ "$entry" =~ \.\. ]]; then
        log_error "Path traversal violation in uploads archive: '..' segment in '$entry'"
        rm -f "$TARGET_FILE"
        exit 1
    fi
    # Reject Windows drive letters
    if [[ "$entry" =~ ^[A-Za-z]: ]]; then
        log_error "Path traversal violation in uploads archive: Windows drive letter in '$entry'"
        rm -f "$TARGET_FILE"
        exit 1
    fi
done <<< "$ARCHIVE_ENTRIES"

log_info "Uploads archive created and validated successfully: $FILE_NAME"
