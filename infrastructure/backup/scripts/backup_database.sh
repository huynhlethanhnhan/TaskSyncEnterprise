#!/usr/bin/env bash
# SQL Server Native Backup script for TaskSyncEnterprise (Phase 3.8.7 Step 3).

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

CONTAINER_NAME="tasksync-sqlserver-prod"
DB_NAME="TaskSyncEnterprise"
BACKUP_TYPE="full"
COPY_ONLY="false"
OUTPUT_DIR=""
BACKUP_ID=""
DRY_RUN="false"

usage() {
    echo "Usage: $0 [options]"
    echo "  --container <name>       SQL Server container name (default: tasksync-sqlserver-prod)"
    echo "  --db <name>              Database name (default: TaskSyncEnterprise)"
    echo "  --type <full|differential> Backup type (default: full)"
    echo "  --copy-only              Use COPY_ONLY for full backup"
    echo "  --output-dir <path>      Host destination directory for .bak file"
    echo "  --backup-id <id>         Backup bundle ID"
    echo "  --dry-run                Sanitized preview mode"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --container) CONTAINER_NAME="$2"; shift 2 ;;
        --db) DB_NAME="$2"; shift 2 ;;
        --type) BACKUP_TYPE="$2"; shift 2 ;;
        --copy-only) COPY_ONLY="true"; shift ;;
        --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
        --backup-id) BACKUP_ID="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) log_error "Unknown argument: $1"; usage ;;
    esac
done

validate_db_identifier "$DB_NAME"

if [ "$BACKUP_TYPE" != "full" ] && [ "$BACKUP_TYPE" != "differential" ]; then
    log_error "Invalid backup type: '$BACKUP_TYPE'. Must be 'full' or 'differential'."
    exit 1
fi

if [ "$COPY_ONLY" = "true" ] && [ "$BACKUP_TYPE" = "differential" ]; then
    log_error "--copy-only flag is only valid for full backups, not differential backups."
    exit 1
fi

TIMESTAMP=$(date -u +'%Y%m%dT%H%M%SZ')
FILE_NAME="${DB_NAME}_${BACKUP_TYPE}_${TIMESTAMP}.bak"
CONTAINER_BAK_PATH="/var/opt/mssql/backup/$FILE_NAME"

# Build SQL Command
WITH_CLAUSES="COMPRESSION, CHECKSUM, INIT, STATS = 10"

if [ "$BACKUP_TYPE" = "differential" ]; then
    WITH_CLAUSES="DIFFERENTIAL, $WITH_CLAUSES"
elif [ "$COPY_ONLY" = "true" ]; then
    WITH_CLAUSES="COPY_ONLY, $WITH_CLAUSES"
fi

BACKUP_SQL="BACKUP DATABASE [$DB_NAME] TO DISK = N'$CONTAINER_BAK_PATH' WITH $WITH_CLAUSES;"
VERIFY_SQL="RESTORE VERIFYONLY FROM DISK = N'$CONTAINER_BAK_PATH' WITH CHECKSUM;"

if [ "$DRY_RUN" = "true" ]; then
    log_info "[DRY-RUN] Would execute SQL Server backup:"
    log_info "[DRY-RUN] Container: $CONTAINER_NAME"
    log_info "[DRY-RUN] SQL: $BACKUP_SQL"
    log_info "[DRY-RUN] Verify SQL: $VERIFY_SQL"
    exit 0
fi

log_info "Executing $BACKUP_TYPE backup for database '$DB_NAME' inside container '$CONTAINER_NAME'..."

# Execute SQL Backup using SQLCMDPASSWORD environment variable (No plain password in CLI parameters)
docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "$BACKUP_SQL"

log_info "Verifying backup integrity with RESTORE VERIFYONLY..."
docker exec -e SQLCMDPASSWORD="${MSSQL_SA_PASSWORD:-}" "$CONTAINER_NAME" \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -Q "$VERIFY_SQL"

# Move/Copy generated .bak file to host output directory if specified
if [ -n "$OUTPUT_DIR" ] && [ -d "$OUTPUT_DIR" ]; then
    # Since /var/opt/mssql/backup is mounted to host ./backups, copy to bundle directory if different
    HOST_MOUNT_FILE="./backups/$FILE_NAME"
    TARGET_FILE="$OUTPUT_DIR/$FILE_NAME"
    if [ -f "$HOST_MOUNT_FILE" ] && [ "$HOST_MOUNT_FILE" != "$TARGET_FILE" ]; then
        mv "$HOST_MOUNT_FILE" "$TARGET_FILE"
    fi
fi

log_info "SQL Server $BACKUP_TYPE backup completed successfully: $FILE_NAME"
