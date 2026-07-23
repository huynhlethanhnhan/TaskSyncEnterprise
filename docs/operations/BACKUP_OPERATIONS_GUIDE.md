# TaskSyncEnterprise Backup Operations & Disaster Recovery Guide

**Version:** 1.0.0 (Phase 3.8.7)  
**Target Architecture:** Docker Compose Orchestrated Production Stack  

---

## 1. Overview & Architecture

TaskSyncEnterprise implements an automated, non-destructive, and testable backup orchestration system. 

```text
Host Backup Orchestrator (backup.sh)
        │
        ├──> SQL Server Backup (backup_database.sh) ──> Native SQL .bak
        ├──> Uploads Archiver  (backup_uploads.sh)  ──> Tarball (.tar.gz)
        ├──> Redis Snapshot    (backup_redis.sh)    ──> RDB Snapshot (.rdb)
        │
        ├──> Bundle Finalizer  (finalize_backup.py)  ──> manifest.json & checksums.sha256
        └──> Bundle Verifier   (verify_backup.py)   ──> Integrity Sign-off
```

---

## 2. Command Reference

### Single-Command Full Backup
```bash
./infrastructure/backup/scripts/backup.sh --type full
```

### Manual Copy-Only Full Backup (Does not reset differential base)
```bash
./infrastructure/backup/scripts/backup.sh --type full --copy-only
```

### Differential Backup
```bash
./infrastructure/backup/scripts/backup.sh --type differential
```

### Preview Dry-Run Mode
```bash
./infrastructure/backup/scripts/backup.sh --type full --dry-run
```

### Verify Backup Bundle Integrity
```bash
python infrastructure/backup/scripts/verify_backup.py --bundle backups/<backup-id>
```

---

## 3. Backup Bundle Anatomy

Published backup bundles are stored in `./backups/<backup-id>/`:

```text
backups/
└── backup_20260720T130501Z_a1b2c3d4/
    ├── database/
    │   └── TaskSyncEnterprise_full_20260720T130501Z.bak
    ├── uploads/
    │   └── uploads_20260720T130501Z.tar.gz
    ├── redis/                         # (Optional: present when BACKUP_INCLUDE_REDIS=true)
    │   └── dump_20260720T130501Z.rdb
    ├── manifest.json                  # Draft 2020-12 Metadata Contract
    └── checksums.sha256               # Streaming SHA-256 Checksums
```

---

## 4. Secret Handling Rules

- **Zero Plain Passwords:** Passwords must **NEVER** be passed as plain command line arguments (e.g. `sqlcmd -P ...` is strictly forbidden).
- **Environment Secret Injection:** Production credentials are passed internally via `SQLCMDPASSWORD` environment variable injection.
- **Manifest Protection:** `manifest.json` automatically rejects secret-like keys (`password`, `secret`, `api_key`, `token`).

---

## 5. What Step 3 Covers vs Step 4 (Restore)

- **Step 3 (Current):** Automated full & differential SQL Server backup generation, uploads archiving, optional Redis snapshot, manifest generation, checksum verification, and dry-run execution.
- **Step 4 (Upcoming):** Database restoration using dynamic `RESTORE FILELISTONLY` logical file mapping, and safe uploads tarball extraction.

> [!NOTE]
> Target RPO of 1 hour is a design target for Phase 3.8.7 and will be validated upon completion of automated schedulers and DR drills.
