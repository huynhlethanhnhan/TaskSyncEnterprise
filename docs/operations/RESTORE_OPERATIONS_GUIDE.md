# TaskSyncEnterprise Restore Operations & Safety Controls Guide

**Version:** 1.0.0 (Phase 3.8.7 Step 4)  
**Target Architecture:** Docker Compose Orchestrated Production Stack  

---

## 1. Overview & Isolation Philosophy

TaskSyncEnterprise implements isolated, non-destructive, and testable database, upload, and state restore mechanisms.

- **Default Isolated Target:** By default, database restores target `TaskSyncEnterprise_restore_test` to prevent unintended production database overwrites.
- **Production Safeguards:** Production database overwrite (`TaskSyncEnterprise`) requires explicit CLI flags and strict confirmation strings.
- **Dynamic File Mapping:** Logical file paths are parsed dynamically from `RESTORE FILELISTONLY` to construct `WITH MOVE` clauses. Hard-coded `.mdf` / `.ldf` paths are strictly avoided.

---

## 2. Command Reference

### Isolated Test Restore (Default)
```bash
./infrastructure/backup/scripts/restore.sh \
  --bundle backups/<backup-bundle> \
  --target-db TaskSyncEnterprise_restore_test
```

### Production Database Overwrite (Requires Dual Controls)
```bash
./infrastructure/backup/scripts/restore.sh \
  --bundle backups/<backup-bundle> \
  --target-db TaskSyncEnterprise \
  --force-production \
  --confirm-production RESTORE_TASKSYNCENTERPRISE_PRODUCTION
```

### Differential Backup Chain Restore
```bash
./infrastructure/backup/scripts/restore.sh \
  --bundle backups/<differential-backup-bundle> \
  --base-bundle backups/<full-base-backup-bundle> \
  --target-db TaskSyncEnterprise_restore_test
```

### Uploads Restore with Rollback Protection
```bash
./infrastructure/backup/scripts/restore.sh \
  --bundle backups/<backup-bundle> \
  --restore-uploads true \
  --replace-existing-uploads
```

### Optional Redis RDB Restore
```bash
./infrastructure/backup/scripts/restore.sh \
  --bundle backups/<backup-bundle> \
  --restore-redis true \
  --confirm-redis-restore RESTORE_REDIS_STATE
```

### Preview Dry-Run Mode
```bash
./infrastructure/backup/scripts/restore.sh \
  --bundle backups/<backup-bundle> \
  --dry-run
```

---

## 3. Production Overwrite Protection Protocol

Restoring over the live production database (`TaskSyncEnterprise`) requires **BOTH**:

1. `--force-production`
2. `--confirm-production RESTORE_TASKSYNCENTERPRISE_PRODUCTION` (case-sensitive)

If either flag is omitted or incorrect, the orchestrator immediately aborts without connecting, executing SQL statements, or altering database state.

---

## 4. Single-User Mode Recovery Guarantee

When performing an approved production overwrite, the database is switched to single-user mode:

```sql
ALTER DATABASE [TaskSyncEnterprise] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
```

A shell trap guarantees that `ALTER DATABASE [TaskSyncEnterprise] SET MULTI_USER;` is executed even if the restore process encounters an unhandled exception or terminates prematurely.

---

## 5. Upload Archive Security & Staging

1. **Pre-Extraction Audit (`validate_archive.py`):** Checks for path traversal (`..`), absolute paths (`/`), Windows drive letters (`C:\`), symlink escapes, special devices/FIFOs, duplicate entries, file limits (100,000 files), size limits (10 GB), and archive bomb compression ratios (< 100:1).
2. **Isolated Staging:** Extracted into `/app/uploads_staging_<timestamp>`.
3. **Atomic Rollback:** If replacing existing uploads, live uploads are renamed to `/app/uploads_rollback_<timestamp>`. If verification fails, the rollback directory is automatically restored.

---

## 6. Limitations & Scope

- **Step 4 (Current):** Implements safe database inspection, `RESTORE FILELISTONLY` dynamic mapping, production safeguards, differential restore chain, upload staging & rollback, and Redis controls.
- **Step 5 (Upcoming):** End-to-end disaster recovery drill execution, automated scheduling, and RPO/RTO validation.
