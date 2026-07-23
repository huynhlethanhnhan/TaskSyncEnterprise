# Production Docker Image Build and Usage Guide

This guide provides operating instructions for building, running, and validating the hardened production Docker image for the `TaskSyncEnterprise` backend.

---

## 🐋 1. Overview

The production Docker image is built using a multi-stage architecture to ensure maximum security, minimal footprint, and reproducibility.

- **Developer Environment:** Runs with source bind-mounting, debug logging, and local databases.
- **Production Environment:** Runs as an unprivileged user (`tasksync:10001`) with dropped kernel capabilities, read-only optimizations, locked packages, and hidden database ports.

---

## 🏗️ 2. Build Commands

To build the hardened production Docker image from a clean state (without cache):
```bash
docker build --no-cache -t tasksync-backend:prod ./backend
```

To build using Docker layer caching:
```bash
docker build -t tasksync-backend:prod ./backend
```

---

## 🚀 3. Run and Deploy Commands

### Standalone Run
To run the production image as a standalone container:
```bash
docker run -d \
  --name tasksync-backend-prod \
  -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e SECRET_KEY=your_secure_random_production_key_here \
  -e DATABASE_URL=mssql+pymssql://sa:YourPassword@sqlserver-host:1433/TaskSyncEnterprise \
  -e REDIS_URL=redis://redis-host:6379/0 \
  tasksync-backend:prod
```

### Production Docker Compose Run
To launch the production stack (Backend + Redis + SQL Server) with resource limits, security profiles, and hidden ports:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ⚙️ 4. Required Environment Configurations

Make sure to supply the following environment variables during production launch:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enables strict security checks (validates strong keys). |
| `SECRET_KEY` | Cryptographically random string (min 32 chars) | Signs and verifies JWT authorization tokens. |
| `DATABASE_URL` | `mssql+pymssql://sa:password@sqlserver:1433/db` | Connection target for SQL Server database. |
| `REDIS_URL` | `redis://redis:6379/0` | Connection target for Redis caching service. |
| `SQL_ECHO` | `False` | Disables verbose query logging in stdout. |

---

## 🩺 5. SRE Health Checks

The SRE Live Health check runs every 30s inside the container using Python's standard library to query the root `/health/live` path.

To manually inspect the container health status from the host:
```bash
docker inspect --format='{{json .State.Health}}' tasksync-backend-prod
```

---

## 🔒 6. Non-Root Execution Verification

Verify that the process executes under the unprivileged tasksync user:
```bash
docker exec tasksync-backend-prod id
```
*Expected Output:*
```json
uid=10001(tasksync) gid=10001(tasksync) groups=10001(tasksync)
```

---

## 📁 7. Writable Directory Explanations

The container root filesystem is highly locked down. Write permissions are granted strictly to the following directories:

1.  `/app/uploads`: Required for storing task attachments and user avatar pictures.
2.  `/app/logs`: Required for writing rotating diagnostic logs (`tasksync.log`).
3.  `/tmp`: Standard system temp folder for temporary files.

---

## 🔍 8. Image Inspection and Security Scanning

To inspect the history and size of image layers:
```bash
docker history tasksync-backend:prod
```

To run a vulnerability scan on the image using Docker Scout:
```bash
docker scout cves tasksync-backend:prod
```
