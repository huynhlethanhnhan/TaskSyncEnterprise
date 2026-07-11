# Production Deployment Checklist (Milestone M3)

This checklist provides a structured guide to successfully deploy `TaskSyncEnterprise` to a production environment.

---

## 🔑 1. Environment & Secret Keys Configuration
* [ ] **`SECRET_KEY`**: Set a cryptographically secure 256-bit random string.
* [ ] **`ENVIRONMENT`**: Set to `"production"`.
* [ ] **`SQL_ECHO`**: Set to `False` to prevent query traces from leaking into production stdout.
* [ ] **`DATABASE_URL`**: Point to the secure, production MS SQL Server instance.
* [ ] **`REDIS_URL`**: Point to the secure, production Redis instance.
* [ ] **`ALLOWED_HOSTS`**: Explicitly set to the production domain name list (no wildcards `*`).

---

## 🔒 2. Security Hardening
* [ ] **HTTPS Enforced**: Ensure TLS 1.3 is configured at the load balancer / Nginx proxy.
* [ ] **Secure Cookie parameters**: Validate CORS origins and ensure tokens are not readable by client-side scripts.
* [ ] **Redis Auth**: Ensure the production Redis instance requires passwords and has `protected-mode` active.

---

## 📁 3. Storage & Logs setup
* [ ] **Write Permissions**: Ensure the runner process has write access to the configured uploads folder path (`/app/uploads`).
* [ ] **Log Rotation**: Configure a system daemon or syslog aggregator (like Fluentd / Elasticsearch) to capture rotation log files from `backend/logs/`.

---

## 🚀 4. Deployment Launch Steps
1. Deploy containers using docker-compose or Kubernetes:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```
2. Run database migrations:
   ```bash
   docker exec tasksync-backend alembic upgrade head
   ```
3. Seed default system roles (Admin, Manager, Employee) if database is blank:
   ```bash
   docker exec tasksync-backend python seed_v2.py
   ```
4. Verify server availability:
   ```bash
   curl -i https://<your-domain>/health/ready
   ```
