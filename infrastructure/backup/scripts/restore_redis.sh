#!/usr/bin/env bash
# Optional Redis RDB Restore Script for TaskSyncEnterprise (Phase 3.8.7 Step 4).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="tasksync-redis-prod"
BUNDLE_DIR=""
CONFIRM_REDIS=""
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --bundle <path>          Path to backup bundle directory"
    echo "  --container <name>       Redis container name (default: tasksync-redis-prod)"
    echo "  --confirm-redis-restore Must match 'RESTORE_REDIS_STATE'"
    echo "  --dry-run                Sanitized preview mode"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bundle) BUNDLE_DIR="$2"; shift 2 ;;
        --container) CONTAINER_NAME="$2"; shift 2 ;;
        --confirm-redis-restore) CONFIRM_REDIS="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

if [ -z "$BUNDLE_DIR" ] || [ ! -d "$BUNDLE_DIR" ]; then
    log_error "Backup bundle directory missing or invalid: '$BUNDLE_DIR'"
    exit 1
fi

if [ "$CONFIRM_REDIS" != "RESTORE_REDIS_STATE" ]; then
    log_error "========================================================================="
    log_error "CRITICAL SAFETY ABORT: Redis restore mutates active session & security state!"
    log_error "Requires explicit flag: --confirm-redis-restore RESTORE_REDIS_STATE"
    log_error "========================================================================="
    exit 1
fi

REDIS_RDB=$(ls "$BUNDLE_DIR/redis/"*.rdb 2>/dev/null | head -n 1 || true)
if [ -z "$REDIS_RDB" ] || [ ! -f "$REDIS_RDB" ]; then
    log_error "Redis RDB snapshot missing in bundle '$BUNDLE_DIR/redis/'"
    exit 1
fi

if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY-RUN] Would execute Redis RDB restore:"
    log_info "[DRY-RUN] Container: $CONTAINER_NAME"
    log_info "[DRY-RUN] RDB File:  $REDIS_RDB"
    exit 0
fi

log_info "Stopping Redis container '$CONTAINER_NAME'..."
docker stop "$CONTAINER_NAME"

log_info "Backing up current RDB and applying restored snapshot..."
docker cp "$CONTAINER_NAME:/data/dump.rdb" "/tmp/dump.rdb.rollback" 2>/dev/null || true
docker cp "$REDIS_RDB" "$CONTAINER_NAME:/data/dump.rdb"

log_info "Starting Redis container '$CONTAINER_NAME'..."
docker start "$CONTAINER_NAME"

# Verify Redis ping
if docker exec "$CONTAINER_NAME" redis-cli ping >/dev/null 2>&1; then
    log_info "Redis container started and healthy."
    rm -f "/tmp/dump.rdb.rollback"
else
    log_error "Redis container failed to start after RDB restore! Rolling back..."
    docker stop "$CONTAINER_NAME"
    if [ -f "/tmp/dump.rdb.rollback" ]; then
        docker cp "/tmp/dump.rdb.rollback" "$CONTAINER_NAME:/data/dump.rdb"
        docker start "$CONTAINER_NAME"
    fi
    exit 1
fi

log_info "Redis RDB restore completed successfully."
