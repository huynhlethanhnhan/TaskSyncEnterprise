# TaskSyncEnterprise Backup & Disaster Recovery Infrastructure

## 1. Overview & Purpose

This directory contains the core infrastructure, configuration contracts, JSON schemas, and Python validation tools for **TaskSyncEnterprise Backup, Restore, and Disaster Recovery (DR)**.

Phase 3.8.7 establishes a secure, non-destructive, and testable backup foundation for production deployments.

---

## 2. Scope & Capabilities

- **Step 2 (Foundation):** Manifest JSON Schema (`schemas/backup-manifest-v1.schema.json`), Path Security (`tools/paths.py`), Checksum Utility (`tools/checksums.py`), and Manifest Validator (`tools/manifest.py`).
- **Step 3 (Backup Execution):** Automated SQL Server full & differential backup generation (`scripts/backup_database.sh`), upload archiver (`scripts/backup_uploads.sh`), optional Redis snapshot (`scripts/backup_redis.sh`), manifest finalizer (`scripts/finalize_backup.py`), verifier (`scripts/verify_backup.py`), and orchestrator (`scripts/backup.sh`).
- **Step 4 (Restore Orchestration):** Dynamic `RESTORE FILELISTONLY` database restore (`scripts/restore_database.sh`), production overwrite dual controls, differential chain restore, upload archive security validation (`scripts/validate_archive.py`), upload staging & atomic rollback (`scripts/restore_uploads.sh`), optional Redis restore (`scripts/restore_redis.sh`), and restore orchestrator (`scripts/restore.sh`).


---

## 3. Directory Layout

```text
infrastructure/
└── backup/
    ├── README.md                           # Operational documentation (this file)
    ├── config/
    │   └── backup.env.example              # Non-sensitive configuration template
    ├── schemas/
    │   └── backup-manifest-v1.schema.json  # Draft 2020-12 JSON schema for manifest.json
    ├── scripts/
    │   └── README.md                       # Roadmap for backup & restore shell scripts
    └── tools/
        ├── __init__.py                     # Python package initialization
        ├── manifest.py                     # Manifest JSON loading and validation
        ├── checksums.py                    # Chunked SHA-256 calculation & verification
        └── paths.py                        # Path safety and traversal prevention checks
```

---

## 4. Security Controls & Secret Handling Rules

1. **Zero Secrets in Manifests or Log Files:** Manifest JSON files, checksum digests, and stdout logs must **NEVER** contain passwords, tokens, API keys, connection strings, or private keys.
2. **Environment Secret Injection:** Production credentials (e.g. `MSSQL_SA_PASSWORD`) must be injected at runtime using environment variables (`SQLCMDPASSWORD`), Docker secrets, or cloud key vaults. Command line strings must never expose plain passwords (`sqlcmd -P ...` is forbidden).
3. **Authenticated Encryption:** Offsite backup archives require authenticated encryption (`AES-256-GCM`, `age`, or cloud server-side encryption). Unauthenticated OpenSSL mode is excluded.
4. **Git Isolation:** Local runtime backup directories (`/backups/`, `/infrastructure/backup/runtime/`, `*.bak`, `*.rdb`) are strictly ignored in `.gitignore`.

---

## 5. Unimplemented Features & Future Steps

The following features are **not yet implemented in Step 2** and are scheduled for subsequent steps:
- **Step 3:** Full & Differential SQL Server database backup scripts (`backup_full.sh`), upload archiving scripts (`backup_uploads.sh`), and bundle packing.
- **Step 4:** Database restore (`restore_database.sh`) with `RESTORE FILELISTONLY` dynamic logical file mapping, and upload extraction with path safety verification.
- **Step 5:** Automated Pytest integration tests and DR verification procedures.

---

## 6. Recovery Objectives Note

- **Target RPO (Recovery Point Objective):** **1 Hour** (via daily full + hourly differential backups).
- **Target RTO (Recovery Time Objective):** **30 Minutes**.

> [!IMPORTANT]
> The RPO of 1 hour is a design target for the completion of Phase 3.8.7. Step 2 establishes the foundation only; RPO is not yet claimed or active at runtime.
