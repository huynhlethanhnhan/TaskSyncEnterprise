# TaskSyncEnterprise — Nginx & Gateway Configuration

This directory contains the production Nginx reverse proxy configuration for **TaskSyncEnterprise**.

---

## Directory Structure

```
nginx/
├── nginx.conf                 # Main Nginx process and global settings
├── conf.d/
│   └── tasksync.conf          # TaskSync virtual host & reverse proxy routing
├── ssl/                       # Local TLS certificates directory (ignored in Git)
│   ├── .gitkeep               # Preserved directory placeholder
│   └── generate_self_signed_cert.ps1 # Local TLS cert generator script
└── README.md                  # Documentation (this file)
```

---

## Architecture & Routing

Nginx serves as the **single public entry point** for all web traffic in production:

- `http://<host>/` → Reverse proxies to `frontend:8080` (React SPA)
- `http://<host>/api/v1/...` → Reverse proxies to `backend:8000` (FastAPI REST API & WebSockets)
- `http://<host>/docs` → Reverse proxies to `backend:8000/docs` (Swagger UI)
- `http://<host>/health` → Reverse proxies to `backend:8000/health` (SRE Health Probe - requires GET)
- `http://<host>/healthz` → Local Nginx gateway health check

---

## Process & Privilege Model

- **Master Process (PID 1):** Runs as `root` inside the container to bind privileged ports `80` and `443`.
- **Worker Processes:** Automatically drop privileges to run as the restricted unprivileged user `nginx`.
- **Container Hardening:**
  - Hardened with `cap_drop: [ALL]` and explicit capability additions (`NET_BIND_SERVICE`, `CHOWN`, `SETUID`, `SETGID`).
  - Read-only filesystem (`read_only: true`) using `/tmp` temporary paths for buffer files (`client_body_temp_path /tmp/client_temp`).
  - `security_opt: [no-new-privileges:true]` prevents privilege escalation.

---

## Security Hardening Features

1. **Version Suppression:** `server_tokens off;` prevents Nginx version exposure.
2. **Upload Limit:** `client_max_body_size 25M;` limits body size to align with backend max attachment limits (20MB).
3. **Hidden File Protection:** Denies direct access to `/.git`, `/.env`, `*.key`, `*.pem`, `*.sql`, `*.log`, `*.bak`.
4. **Directory Listing Disabled:** `autoindex off;` prevents file indexing.
5. **Sanitized Logs:** Custom `main_secure` log format excludes `Authorization` tokens and sensitive request payload headers.

---

## Local HTTPS Testing (Self-Signed Certificates)

To validate HTTPS locally:

1. Run the PowerShell script to generate local certificates:
   ```powershell
   .\nginx\ssl\generate_self_signed_cert.ps1
   ```
2. Uncomment the `server { listen 443 ssl http2; ... }` block in `nginx/conf.d/tasksync.conf`.
3. Restart Nginx via Docker Compose using secret-safe flags:
   ```powershell
   docker compose --env-file .env.production -f docker-compose.production.yml restart nginx
   ```

---

## Production SSL (Let's Encrypt / Certbot)

For real production deployment:

1. Obtain certificates using Certbot:
   ```bash
   certbot certonly --standalone -d your-domain.com
   ```
2. Mount `/etc/letsencrypt/live/your-domain.com/fullchain.pem` to `/etc/nginx/ssl/server.crt:ro`.
3. Mount `/etc/letsencrypt/live/your-domain.com/privkey.pem` to `/etc/nginx/ssl/server.key:ro`.
4. Enable HTTP-to-HTTPS redirection in `nginx/conf.d/tasksync.conf`.
