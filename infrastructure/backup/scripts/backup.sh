#!/usr/bin/env bash
# Main Orchestrator Script for TaskSyncEnterprise Automated Backup (Phase 3.8.7 Step 3).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Default Parameters
CONFIG_FILE=""
BACKUP_TYPE="full"
COPY_ONLY="false"
BACKUP_ROOT="./backups"
INCLUDE_UPLOADS="true"
INCLUDE_REDIS="false"
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --type <full|differential> Backup type (default: full)"
    echo "  --config <file>          Optional path to backup.env config file"
    echo "  --backup-root <path>     Target root directory for backups (default: ./backups)"
    echo "  --include-uploads <bool> Include user uploaded files (default: true)"
    echo "  --include-redis <bool>   Include Redis RDB snapshot (default: false)"
    echo "  --copy-only              Use COPY_ONLY for manual full backup"
    echo "  --dry-run                Sanitized execution plan preview"
    echo "  --help                   Display this help message"
    exit 1
}

# Parse Arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --type) BACKUP_TYPE="$2"; shift 2 ;;
        --config) CONFIG_FILE="$2"; shift 2 ;;
        --backup-root) BACKUP_ROOT="$2"; shift 2 ;;
        --include-uploads) INCLUDE_UPLOADS="$2"; shift 2 ;;
        --include-redis) INCLUDE_REDIS="$2"; shift 2 ;;
        --copy-only) COPY_ONLY="true"; shift ;;
        --dry-run) DRY_RUN="true"; shift ;;
        --help) usage ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

# Load Config File if provided
if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
    log_info "Loading configuration from '$CONFIG_FILE'..."
    set -a
    source "$CONFIG_FILE"
    set +a
fi

# Validation Checks
validate_backup_root "$BACKUP_ROOT"

if [ "$BACKUP_TYPE" != "full" ] && [ "$BACKUP_TYPE" != "differential" ]; then
    log_error "Invalid backup type '$BACKUP_TYPE'. Must be 'full' or 'differential'."
    exit 1
fi

if [ "$COPY_ONLY" = "true" ] && [ "$BACKUP_TYPE" = "differential" ]; then
    log_error "--copy-only is only permitted for full backups."
    exit 1
fi

BACKUP_ID=$(generate_backup_id)
STARTED_AT=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

TMP_BUNDLE_DIR="$BACKUP_ROOT/.tmp/$BACKUP_ID"
FINAL_BUNDLE_DIR="$BACKUP_ROOT/$BACKUP_ID"

if [ "$DRY_RUN" = "true" ]; then
    log_info "========================================================"
    log_info "[DRY-RUN] TaskSyncEnterprise Backup Execution Plan"
    log_info "========================================================"
    log_info "[DRY-RUN] Backup ID:         $BACKUP_ID"
    log_info "[DRY-RUN] Backup Type:       $BACKUP_TYPE (Copy-Only: $COPY_ONLY)"
    log_info "[DRY-RUN] Target Root:       $BACKUP_ROOT"
    log_info "[DRY-RUN] Include Uploads:   $INCLUDE_UPLOADS"
    log_info "[DRY-RUN] Include Redis:     $INCLUDE_REDIS"
    log_info "[DRY-RUN] Temp Bundle Dir:   $TMP_BUNDLE_DIR"
    log_info "[DRY-RUN] Final Bundle Dir:  $FINAL_BUNDLE_DIR"
    log_info "========================================================"
    log_info "[DRY-RUN] Plan validated successfully. No real files created."
    exit 0
fi

# Error Cleanup Trap
cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Backup process encountered an error (exit code $exit_code)."
        if [ -d "$TMP_BUNDLE_DIR" ]; then
            log_warn "Cleaning up unfinalized temporary backup directory '$TMP_BUNDLE_DIR'..."
            python "$SCRIPT_DIR/finalize_backup.py" --bundle "$TMP_BUNDLE_DIR" --failure-message "Process failed with exit code $exit_code" || true
            rm -rf "$TMP_BUNDLE_DIR"
        fi
    fi
}
trap cleanup_on_error ERR INT TERM EXIT

log_info "Starting TaskSyncEnterprise backup process (ID: $BACKUP_ID, Type: $BACKUP_TYPE)..."

# Create Temporary Bundle Directory Structure
mkdir -p "$TMP_BUNDLE_DIR/database"
mkdir -p "$TMP_BUNDLE_DIR/uploads"
mkdir -p "$TMP_BUNDLE_DIR/redis"

# Initialize manifest.json with status in_progress
cat <<EOF > "$TMP_BUNDLE_DIR/manifest.json"
{
  "manifest_version": "1.0",
  "backup_id": "$BACKUP_ID",
  "application": {
    "name": "TaskSyncEnterprise",
    "version": "1.0.0",
    "git_commit": "$GIT_COMMIT"
  },
  "environment": "${BACKUP_ENVIRONMENT:-production}",
  "timestamps": {
    "started_at": "$STARTED_AT",
    "completed_at": null,
    "duration_seconds": null
  },
  "backup_type": "$BACKUP_TYPE",
  "status": "in_progress",
  "artifacts": [],
  "integrity": {
    "algorithm": "sha256",
    "checksum_file": "checksums.sha256",
    "verified": false
  },
  "encryption": {
    "enabled": false,
    "provider": "${BACKUP_ENCRYPTION_PROVIDER:-none}",
    "algorithm": null
  },
  "compatibility": {
    "database_engine": "Microsoft SQL Server",
    "database_major_version": "16",
    "notes": ["Backup orchestrated by backup.sh"]
  }
}
EOF

# 1. SQL Server Database Backup
DB_CMD=("$SCRIPT_DIR/backup_database.sh" --type "$BACKUP_TYPE" --output-dir "$TMP_BUNDLE_DIR/database" --backup-id "$BACKUP_ID")
if [ "$COPY_ONLY" = "true" ]; then
    DB_CMD+=(--copy-only)
fi
"${DB_CMD[@]}"

# 2. User Uploads Archiving (Optional)
if [ "$INCLUDE_UPLOADS" = "true" ]; then
    "$SCRIPT_DIR/backup_uploads.sh" --output-dir "$TMP_BUNDLE_DIR/uploads" --backup-id "$BACKUP_ID"
fi

# 3. Redis Snapshot (Optional)
if [ "$INCLUDE_REDIS" = "true" ]; then
    "$SCRIPT_DIR/backup_redis.sh" --output-dir "$TMP_BUNDLE_DIR/redis" --backup-id "$BACKUP_ID" --failure-policy "${BACKUP_REDIS_FAILURE_POLICY:-fail}"
fi

# 4. Finalize Manifest & Calculate Checksums
log_info "Finalizing manifest and generating SHA-256 checksums..."
python "$SCRIPT_DIR/finalize_backup.py" --bundle "$TMP_BUNDLE_DIR"

# 5. Verify Backup Bundle Integrity
log_info "Verifying backup bundle integrity prior to publishing..."
python "$SCRIPT_DIR/verify_backup.py" --bundle "$TMP_BUNDLE_DIR"

# 6. Publish Bundle Atomically to Final Directory
mkdir -p "$BACKUP_ROOT"
mv "$TMP_BUNDLE_DIR" "$FINAL_BUNDLE_DIR"

# Reset trap so cleanup doesn't delete final directory
trap - ERR INT TERM EXIT

log_info "========================================================"
log_info "TaskSyncEnterprise Backup Published Successfully!"
log_info "Bundle Path: $FINAL_BUNDLE_DIR"
log_info "Backup ID:   $BACKUP_ID"
log_info "========================================================"
