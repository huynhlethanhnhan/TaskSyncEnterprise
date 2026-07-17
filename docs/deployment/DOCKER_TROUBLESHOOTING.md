# Production Container Troubleshooting Guide

This document outlines diagnostic steps and remediation procedures for common issues encountered when building, deploying, or running the hardened backend Docker image.

---

## 🚨 1. Container Crashes Immediately (CrashLoopBackOff)

### Symptoms
The container exits shortly after starting, or Docker Compose restarts it continuously.

### Diagnosis
Run `docker logs <container-name>` to inspect the startup exceptions.

### Common Causes & Fixes
1.  **Database Connection Failure:**
    *   *Cause:* The database server (SQL Server) is not ready, has incorrect credentials, or the host address is unreachable.
    *   *Fix:* Verify your database container status and parameters. Check that the port is accessible. If using Compose, ensure `sqlserver` healthcheck is successfully reporting `healthy` before the backend launches.
2.  **Weak SECRET_KEY in Production:**
    *   *Cause:* The backend is running with `ENVIRONMENT=production` but uses the default fallback `SECRET_KEY` or a key under 32 characters.
    *   *Fix:* Change the environment variable `SECRET_KEY` to a cryptographically strong random string (minimum 32 characters).
3.  **Missing or Unwritable Folders:**
    *   *Cause:* The non-root tasksync user (UID 10001) does not have write access to `/app/uploads` or `/app/logs`.
    *   *Fix:* In the Dockerfile, ensure ownership is assigned correctly:
        ```dockerfile
        RUN mkdir -p /app/uploads/avatars /app/uploads/attachments /app/logs \
            && chown -R tasksync:tasksync /app
        ```

---

## 📁 2. Permissions & Volume Mount Errors (Windows/Docker Desktop)

### Symptoms
Errors claiming directories are not writable, or SQLite database locking exceptions on Windows host mounts.

### Diagnosis
Run `docker inspect <container-name>` and look at the `Mounts` section.

### Cause
Docker Desktop for Windows uses a virtualized Linux filesystem. Sometimes file ownerships on host-mounted folders default to `root` or mapping is blocked, preventing the unprivileged `tasksync` user (UID 10001) from writing files.

### Fix
- Avoid bind-mounting code folders in production. Use the baked code inside the image.
- When mapping uploads folders, use named Docker volumes instead of host paths (e.g. `tasksync-uploads:/app/uploads`). Named volumes are managed directly by the Linux kernel VM, guaranteeing that the ownership assigned during image build (`chown -R tasksync:tasksync`) is preserved correctly.

---

## 🩺 3. Health Probe Fails (ExitCode 1)

### Symptoms
The container runs but is marked as `unhealthy` by Docker.

### Diagnosis
Verify the logs for health probe requests:
```bash
docker inspect --format='{{json .State.Health}}' <container-name>
```

### Cause & Fix
- Check that the server is listening on port 8000. If you changed the port via environment variables or startup arguments, update the Dockerfile `HEALTHCHECK` url to match the new port.
- Check if rate-limiting middleware is blocking the health check loop. The health check url path `/health/live` is bypassed from rate limiting and tracing by default, but if you introduce new custom middlewares, make sure they ignore the `/health` paths.
