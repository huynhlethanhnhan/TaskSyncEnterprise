# TaskSyncEnterprise Backup & Restore Executable Scripts

This directory contains executable shell and Python scripts for TaskSyncEnterprise Backup, Restore, and Disaster Recovery.

## Implemented Scripts

- **`backup.sh`**: Main backup orchestrator. Supports full, copy-only, and differential backups, dry-runs, and atomic bundle publishing.
- **`backup_database.sh`**: Executes native SQL Server full & differential backups inside container using `SQLCMDPASSWORD`.
- **`backup_uploads.sh`**: Archives `/app/uploads` to `.tar.gz` with POSIX permissions and path traversal inspection.
- **`backup_redis.sh`**: Triggers Redis `BGSAVE` and copies `dump.rdb`.
- **`finalize_backup.py`**: Calculates SHA-256 digests, generates `checksums.sha256`, and updates `manifest.json`.
- **`verify_backup.py`**: Validates backup bundle schema, path safety, and checksum integrity.
- **`restore.sh`**: Main restore orchestrator. Enforces production overwrite dual controls, isolated test target DB, and report generation.
- **`restore_database.sh`**: Performs safe database restore using dynamic `RESTORE FILELISTONLY` mapping, single-user mode traps, and `DBCC CHECKDB`.
- **`restore_uploads.sh`**: Validates archive security, extracts to isolated staging, and performs atomic replacement with rollback protection.
- **`restore_redis.sh`**: Restores Redis RDB snapshot with explicit confirmation string.
- **`inspect_database_backup.py`**: Dynamic SQL Server file list and LSN inspection utility.
- **`validate_archive.py`**: Upload archive pre-extraction security validator.
- **`common.sh`**: Shared utility functions and path validation helpers.

