#!/usr/bin/env bash
# Optional Redis RDB Snapshot Script for TaskSyncEnterprise (Phase 3.8.7 Step 3).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="tasksync-redis-prod"
OUTPUT_DIR=""
BACKUP_ID=""
FAILURE_POLICY="fail"
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --container <name>       Redis container name (default: tasksync-redis-prod)"
    echo "  --output-dir <path>      Host destination directory for dump.rdb file"
    echo "  --failure-policy <fail|warn> Action on BGSAVE error (default: fail)"
    echo "  --backup-id <id>         Backup bundle ID"
    echo "  --dry-run                Sanitized preview mode"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --container) CONTAINER_NAME="$2"; shift 2 ;;
        --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
        --failure-policy) FAILURE_POLICY="$2"; shift 2 ;;
        --backup-id) BACKUP_ID="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')
FILE_NAME="dump_${TIMESTAMP}.rdb"
TARGET_FILE="$OUTPUT_DIR/$FILE_NAME"

if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY-RUN] Would trigger Redis snapshot:"
    log_info "[DRY-RUN] Container: $CONTAINER_NAME"
    log_info "[DRY-RUN] Target File: $TARGET_FILE"
    exit 0
fi

log_info "Triggering Redis BGSAVE inside container '$CONTAINER_NAME'..."

if ! docker exec "$CONTAINER_NAME" redis-cli BGSAVE >/dev/null 2>&1; then
    log_error "Redis BGSAVE command failed."
    if [ "$FAILURE_POLICY" = "fail" ]; then
        exit 1
    else
        log_warn "Redis failure policy is 'warn'. Skipping Redis snapshot."
        exit 0
    fi
fi

# Poll INFO persistence until bgsave completes
MAX_ATTEMPTS=30
ATTEMPT=0
BGSAVE_DONE=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    PERSISTENCE_INFO=$(docker exec "$CONTAINER_NAME" redis-cli INFO persistence)
    IN_PROGRESS=$(echo "$PERSISTENCE_INFO" | grep "rdb_bgsave_in_progress:" | tr -d '\r' | cut -d: -f2)
    LAST_STATUS=$(echo "$PERSISTENCE_INFO" | grep "rdb_last_bgsave_status:" | tr -d '\r' | cut -d: -f2)

    if [ "$IN_PROGRESS" = "0" ] && [ "$LAST_STATUS" = "ok" ]; then
        BGSAVE_DONE=true
        break
    fi

    sleep 1
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "$BGSAVE_DONE" != "true" ]; then
    log_error "Redis BGSAVE timed out or status failed."
    if [ "$FAILURE_POLICY" = "fail" ]; then
        exit 1
    else
        log_warn "Redis failure policy is 'warn'. Skipping Redis snapshot."
        exit 0
    fi
fi

log_info "Copying Redis RDB snapshot to bundle..."
docker cp "$CONTAINER_NAME:/data/dump.rdb" "$TARGET_FILE"
log_info "Redis RDB snapshot completed successfully: $FILE_NAME"
