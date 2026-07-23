#!/usr/bin/env bash
# SQL Server Database Restore Script for TaskSyncEnterprise (Phase 3.8.7 Step 4).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="tasksync-sqlserver-prod"
TARGET_DB="TaskSyncEnterprise_restore_test"
BUNDLE_DIR=""
BASE_BUNDLE_DIR=""
REPLACE_TEST_DB="false"
FORCE_PRODUCTION="false"
CONFIRM_PRODUCTION=""
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --bundle <path>          Path to backup bundle directory"
    echo "  --base-bundle <path>     Optional full base backup bundle for differential restore"
    echo "  --target-db <name>       Target database name (default: TaskSyncEnterprise_restore_test)"
    echo "  --replace-test-db        Allow overwriting an existing test target database"
    echo "  --force-production       Required for production database overwrite"
    echo "  --confirm-production <str> Must match 'RESTORE_TASKSYNCENTERPRISE_PRODUCTION'"
    echo "  --dry-run                Sanitized preview mode"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --bundle) BUNDLE_DIR="$2"; shift 2 ;;
        --base-bundle) BASE_BUNDLE_DIR="$2"; shift 2 ;;
        --target-db) TARGET_DB="$2"; shift 2 ;;
        --replace-test-db) REPLACE_TEST_DB="true"; shift ;;
        --force-production) FORCE_PRODUCTION="true"; shift ;;
        --confirm-production) CONFIRM_PRODUCTION="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

if [ -z "$BUNDLE_DIR" ] || [ ! -d "$BUNDLE_DIR" ]; then
    log_error "Backup bundle directory missing or invalid: '$BUNDLE_DIR'"
    exit 1
fi

validate_db_identifier "$TARGET_DB"

# Production Overwrite Protection
PROD_DB_NAME="TaskSyncEnterprise"
if [ "$TARGET_DB" = "$PROD_DB_NAME" ]; then
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

# Cleanup Trap for Single-User Mode (Ensures DB is returned to MULTI_USER even on failure)
SINGLE_USER_ACTIVATED=false
cleanup_single_user() {
    if [ "$SINGLE_USER_ACTIVATED" = "true" ]; then
        log_warn "Ensuring database '$TARGET_DB' is set back to MULTI_USER mode..."
        docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
            /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C \
            -Q "ALTER DATABASE [$TARGET_DB] SET MULTI_USER;" || true
    fi
}
trap cleanup_single_user EXIT ERR INT TERM

# Run inspection to get metadata
INSPECTION_JSON=$(python "$SCRIPT_DIR/inspect_database_backup.py" --bundle "$BUNDLE_DIR")
BAK_FILE_PATH=$(echo "$INSPECTION_JSON" | grep -o '"bak_file_path": "[^"]*"' | cut -d'"' -f4)
BACKUP_TYPE=$(echo "$INSPECTION_JSON" | grep -o '"backup_type": "[^"]*"' | cut -d'"' -f4)
BAK_FILENAME=$(basename "$BAK_FILE_PATH")
CONTAINER_BAK_PATH="/var/opt/mssql/backup/$BAK_FILENAME"

log_info "Inspecting database backup file list dynamically..."
FILELIST_RAW=$(docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "RESTORE FILELISTONLY FROM DISK = N'$CONTAINER_BAK_PATH';")

# Extract logical names and build WITH MOVE clauses
# (Simple parsing fallback for shell; full dynamic parsing handled in python tools)
LOGICAL_DATA=$(echo "$FILELIST_RAW" | grep -E " (D|0) " | awk '{print $1}' | head -n 1 || echo "${TARGET_DB}_Data")
LOGICAL_LOG=$(echo "$FILELIST_RAW" | grep -E " (L|1) " | awk '{print $1}' | head -n 1 || echo "${TARGET_DB}_Log")

MOVE_CLAUSES="MOVE N'$LOGICAL_DATA' TO N'/var/opt/mssql/data/${TARGET_DB}.mdf', MOVE N'$LOGICAL_LOG' TO N'/var/opt/mssql/data/${TARGET_DB}_log.ldf'"
WITH_CLAUSES="$MOVE_CLAUSES, CHECKSUM, STATS = 10"

if [ "$TARGET_DB" = "$PROD_DB_NAME" ]; then
    WITH_CLAUSES="$WITH_CLAUSES, REPLACE"
fi

if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY-RUN] Would execute database restore:"
    log_info "[DRY-RUN] Target DB:       $TARGET_DB"
    log_info "[DRY-RUN] Backup Type:     $BACKUP_TYPE"
    log_info "[DRY-RUN] MOVE Clauses:    $MOVE_CLAUSES"
    log_info "[DRY-RUN] SQL Preview:     RESTORE DATABASE [$TARGET_DB] FROM DISK = N'$CONTAINER_BAK_PATH' WITH $WITH_CLAUSES, RECOVERY;"
    exit 0
fi

# Differential Chain Restore Execution
if [ "$BACKUP_TYPE" = "differential" ]; then
    if [ -z "$BASE_BUNDLE_DIR" ] || [ ! -d "$BASE_BUNDLE_DIR" ]; then
        log_error "Differential restore requires a valid full base bundle (--base-bundle)."
        exit 1
    fi
    log_info "Step 1/2: Restoring Full Base Backup with NORECOVERY..."
    BASE_INSPECTION=$(python "$SCRIPT_DIR/inspect_database_backup.py" --bundle "$BASE_BUNDLE_DIR")
    BASE_BAK_PATH=$(echo "$BASE_INSPECTION" | grep -o '"bak_file_path": "[^"]*"' | cut -d'"' -f4)
    BASE_FILENAME=$(basename "$BASE_BAK_PATH")
    BASE_CONTAINER_BAK_PATH="/var/opt/mssql/backup/$BASE_FILENAME"

    RESTORE_BASE_SQL="RESTORE DATABASE [$TARGET_DB] FROM DISK = N'$BASE_CONTAINER_BAK_PATH' WITH $WITH_CLAUSES, NORECOVERY;"
    docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "$RESTORE_BASE_SQL"

    log_info "Step 2/2: Applying Differential Backup with RECOVERY..."
    RESTORE_DIFF_SQL="RESTORE DATABASE [$TARGET_DB] FROM DISK = N'$CONTAINER_BAK_PATH' WITH CHECKSUM, RECOVERY;"
    docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "$RESTORE_DIFF_SQL"
else
    # Full Backup Restore
    if [ "$TARGET_DB" = "$PROD_DB_NAME" ]; then
        log_warn "Setting database '$TARGET_DB' to SINGLE_USER mode for overwrite..."
        docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
            /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C \
            -Q "ALTER DATABASE [$TARGET_DB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;"
        SINGLE_USER_ACTIVATED=true
    fi

    log_info "Executing Full Database Restore for '$TARGET_DB'..."
    RESTORE_FULL_SQL="RESTORE DATABASE [$TARGET_DB] FROM DISK = N'$CONTAINER_BAK_PATH' WITH $WITH_CLAUSES, RECOVERY;"
    docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "$RESTORE_FULL_SQL"
fi

# Return to Multi-User mode if activated
if [ "$SINGLE_USER_ACTIVATED" = "true" ]; then
    log_info "Restoring database '$TARGET_DB' to MULTI_USER mode..."
    docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
        /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "ALTER DATABASE [$TARGET_DB] SET MULTI_USER;"
    SINGLE_USER_ACTIVATED=false
fi

# Post-Restore DBCC CHECKDB Verification
log_info "Running post-restore integrity check DBCC CHECKDB on '$TARGET_DB'..."
docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "DBCC CHECKDB ([$TARGET_DB]) WITH NO_INFOMSGS;"

log_info "Database restore for '$TARGET_DB' completed successfully."
