#!/usr/bin/env bash
# Main Restore Orchestrator Script for TaskSyncEnterprise (Phase 3.8.7 Step 4).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

BUNDLE_DIR=""
BASE_BUNDLE_DIR=""
TARGET_DB="TaskSyncEnterprise_restore_test"
RESTORE_DATABASE="true"
RESTORE_UPLOADS="false"
RESTORE_REDIS="false"
FORCE_PRODUCTION="false"
CONFIRM_PRODUCTION=""
REPLACE_TEST_DB="false"
REPLACE_UPLOADS="false"
CONFIRM_REDIS=""
DRY_RUN="false"

usage() {
    echo "Usage: $0 --bundle <backup-bundle> [options]"
    echo "  --bundle <path>          Path to backup bundle directory (Required)"
    echo "  --base-bundle <path>     Path to full base backup bundle for differential restore"
    echo "  --target-db <name>       Target database name (default: TaskSyncEnterprise_restore_test)"
    echo "  --restore-database <bool> Restore SQL database (default: true)"
    echo "  --restore-uploads <bool> Restore user uploads (default: false)"
    echo "  --restore-redis <bool>   Restore Redis RDB snapshot (default: false)"
    echo "  --force-production       Required for production database overwrite"
    echo "  --confirm-production <str> Must match 'RESTORE_TASKSYNCENTERPRISE_PRODUCTION'"
    echo "  --replace-test-db        Allow overwriting existing test DB"
    echo "  --replace-existing-uploads Allow replacing existing uploads directory"
    echo "  --confirm-redis-restore <str> Must match 'RESTORE_REDIS_STATE'"
    echo "  --dry-run                Sanitized preview mode"
    echo "  --help                   Display this help message"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bundle) BUNDLE_DIR="$2"; shift 2 ;;
        --base-bundle) BASE_BUNDLE_DIR="$2"; shift 2 ;;
        --target-db) TARGET_DB="$2"; shift 2 ;;
        --restore-database) RESTORE_DATABASE="$2"; shift 2 ;;
        --restore-uploads) RESTORE_UPLOADS="$2"; shift 2 ;;
        --restore-redis) RESTORE_REDIS="$2"; shift 2 ;;
        --force-production) FORCE_PRODUCTION="true"; shift ;;
        --confirm-production) CONFIRM_PRODUCTION="$2"; shift 2 ;;
        --replace-test-db) REPLACE_TEST_DB="true"; shift ;;
        --replace-existing-uploads) REPLACE_UPLOADS="true"; shift ;;
        --confirm-redis-restore) CONFIRM_REDIS="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        --help) usage ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

if [ -z "$BUNDLE_DIR" ] || [ ! -d "$BUNDLE_DIR" ]; then
    log_error "Backup bundle directory missing or invalid: '$BUNDLE_DIR'"
    exit 1
fi

validate_db_identifier "$TARGET_DB"

# Production Overwrite Safeguard Check
if [ "$TARGET_DB" = "TaskSyncEnterprise" ]; then
    if [ "$FORCE_PRODUCTION" != "true" ] || [ "$CONFIRM_PRODUCTION" != "RESTORE_TASKSYNCENTERPRISE_PRODUCTION" ]; then
        log_error "========================================================================="
        log_error "CRITICAL SAFETY ABORT: Production database overwrite requested without controls!"
        log_error "Production overwrite requires BOTH:"
        log_error "  1) --force-production"
        log_error "  2) --confirm-production RESTORE_TASKSYNCENTERPRISE_PRODUCTION"
        log_error "========================================================================="
        exit 1
    fi
fi

if [ "$DRY_RUN" = "true" ]; then
    log_info "========================================================"
    log_info "[DRY-RUN] TaskSyncEnterprise Restore Execution Plan"
    log_info "========================================================"
    log_info "[DRY-RUN] Bundle Dir:        $BUNDLE_DIR"
    log_info "[DRY-RUN] Target Database:   $TARGET_DB"
    log_info "[DRY-RUN] Restore DB:        $RESTORE_DATABASE"
    log_info "[DRY-RUN] Restore Uploads:   $RESTORE_UPLOADS"
    log_info "[DRY-RUN] Restore Redis:     $RESTORE_REDIS"
    log_info "[DRY-RUN] Force Production:  $FORCE_PRODUCTION"
    log_info "========================================================"
    log_info "[DRY-RUN] Plan validated successfully. No database or filesystem mutation performed."
    exit 0
fi

# Step 1: Verify Backup Bundle Integrity First
log_info "Verifying backup bundle integrity prior to restore..."
python "$SCRIPT_DIR/verify_backup.py" --bundle "$BUNDLE_DIR"

RESTORE_ID="restore_$(date -u +'%Y%m%dT%H%M%SZ')_$(openssl rand -hex 4 2>/dev/null || printf '%08x' "$RANDOM")"
STARTED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Step 2: Database Restore
DB_STATUS="skipped"
if [ "$RESTORE_DATABASE" = "true" ]; then
    DB_CMD=("$SCRIPT_DIR/restore_database.sh" --bundle "$BUNDLE_DIR" --target-db "$TARGET_DB")
    [ -n "$BASE_BUNDLE_DIR" ] && DB_CMD+=(--base-bundle "$BASE_BUNDLE_DIR")
    [ "$REPLACE_TEST_DB" = "true" ] && DB_CMD+=(--replace-test-db)
    [ "$FORCE_PRODUCTION" = "true" ] && DB_CMD+=(--force-production --confirm-production "$CONFIRM_PRODUCTION")

    "${DB_CMD[@]}"
    DB_STATUS="completed"
fi

# Step 3: Uploads Restore
UPLOADS_STATUS="skipped"
if [ "$RESTORE_UPLOADS" = "true" ]; then
    UPLOADS_CMD=("$SCRIPT_DIR/restore_uploads.sh" --bundle "$BUNDLE_DIR")
    [ "$REPLACE_UPLOADS" = "true" ] && UPLOADS_CMD+=(--replace-existing-uploads)

    "${UPLOADS_CMD[@]}"
    UPLOADS_STATUS="completed"
fi

# Step 4: Redis Restore
REDIS_STATUS="skipped"
if [ "$RESTORE_REDIS" = "true" ]; then
    "$SCRIPT_DIR/restore_redis.sh" --bundle "$BUNDLE_DIR" --confirm-redis-restore "$CONFIRM_REDIS"
    REDIS_STATUS="completed"
fi

COMPLETED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Step 5: Generate Sanitized Restore Report
REPORT_PATH="$BUNDLE_DIR/restore-report.json"
cat <<EOF > "$REPORT_PATH"
{
  "restore_id": "$RESTORE_ID",
  "source_backup_id": "$(basename "$BUNDLE_DIR")",
  "target_database": "$TARGET_DB",
  "production_overwrite": $([ "$TARGET_DB" = "TaskSyncEnterprise" ] && echo "true" || echo "false"),
  "components": {
    "database": {
      "status": "$DB_STATUS"
    },
    "uploads": {
      "status": "$UPLOADS_STATUS"
    },
    "redis": {
      "status": "$REDIS_STATUS"
    }
  },
  "timestamps": {
    "started_at": "$STARTED_AT",
    "completed_at": "$COMPLETED_AT"
  },
  "status": "completed"
}
EOF

log_info "========================================================"
log_info "TaskSyncEnterprise Restore Completed Successfully!"
log_info "Target Database: $TARGET_DB"
log_info "Restore Report:  $REPORT_PATH"
log_info "========================================================"
