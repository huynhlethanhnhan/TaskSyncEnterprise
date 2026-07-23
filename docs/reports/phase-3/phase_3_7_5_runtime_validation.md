# Phase 3.7.5 Prometheus Runtime Validation

Validation date: 2026-07-13  
Branch: `develop`  
Platform: Windows 11, Docker Desktop Linux containers  
Final status: **PHASE 3.7.5 COMPLETE**

## Scope and Method

The core and monitoring containers were explicitly stopped before validation.
No previous running state was assumed. Named volumes were retained; no database,
Redis, or Prometheus volume was deleted or reset. Services were then started in
dependency order and every stage was checked before the next stage began.

Initial stopped-state evidence:

| Container | State before validation |
|---|---|
| `tasksync-backend` | Exited |
| `tasksync-redis` | Exited |
| `tasksync-sqlserver` | Exited |
| `tasksync-prometheus` | Exited |

## Stage Results

| Stage | Result | Evidence |
|---|---|---|
| 1. Docker Engine | **PASS** | Client/server `29.6.1`; Docker Desktop `4.81.0`; server OS `linux/amd64`; Compose `v5.2.0` |
| 2. Core Compose render | **PASS** | `docker compose -f docker-compose.yml config` exited successfully |
| 3. Redis and SQL Server startup | **PASS** | Both reached `healthy` within five 5-second polling rounds |
| 4. Database existence | **PASS** | `sys.databases` returned `TaskSyncEnterprise` |
| 5. Migration | **PASS** | `python -m alembic upgrade head` completed; current and head are both `d524f5f3f22d` |
| 6. Backend dependencies | **PASS** | Runtime image imports `email_validator`; `email-validator=2.3.0`, `pydantic=2.13.4`, `fastapi=0.139.0` |
| 7. Backend startup | **PASS** | Reached `running healthy` within three 5-second polling rounds; failing streak `0` |
| 8. Backend API | **PASS** | `/health` and `/metrics` both returned HTTP `200` |
| 9. Prometheus configuration | **PASS** | Pinned v3.13.1 `promtool` returned `SUCCESS` |
| 10. Monitoring startup | **PASS** | Prometheus reached `healthy` within two 5-second polling rounds |
| 11. Prometheus HTTP and target | **PASS** | Ready/healthy returned HTTP `200`; backend target reported `up` with no error |
| 12. PromQL | **PASS** | `up{job="tasksync-backend"}` returned `1` |
| 13. Runtime report | **PASS** | This evidence-backed report was created |

## Docker and Compose Validation

Docker daemon checks:

```text
Docker client:          29.6.1
Docker server:          29.6.1
Docker Desktop:         4.81.0
Container OS/arch:      linux/amd64
Docker Compose:         v5.2.0
Context:                desktop-linux
```

The rendered backend database URL uses the Compose service hostname and target
database:

```text
mssql+pymssql://sa:<local-development-password>@sqlserver:1433/TaskSyncEnterprise
```

The rendered SQL Server healthcheck contains:

```text
/opt/mssql-tools18/bin/sqlcmd
-S localhost
-U sa
-P <local-development-password>
-C
-Q SELECT 1
```

Compose produced no syntax error. Docker CLI emitted a local client warning
that `C:\Users\huynh\.docker\config.json` could not be read inside the managed
workspace sandbox; this did not affect Docker Engine or Compose execution.

## SQL Server and Redis

Only infrastructure services were started first:

```powershell
docker compose -f docker-compose.yml up -d redis sqlserver
```

Observed polling sequence:

```text
poll=1 redis=starting sqlserver=starting
poll=2 redis=starting sqlserver=starting
poll=3 redis=healthy  sqlserver=starting
poll=4 redis=healthy  sqlserver=starting
poll=5 redis=healthy  sqlserver=healthy
```

Final infrastructure state:

| Service | Result |
|---|---|
| Redis | `healthy` |
| SQL Server | `healthy` |

The SQL Server catalog query returned the system databases plus:

```text
TaskSyncEnterprise
```

The database already existed, so no database creation command was run. No table
was created manually.

## Migration Validation

Repository detection found `backend/alembic.ini` and the migration scripts in
`backend/alembic/versions/`. The approved container workflow was executed:

```powershell
docker compose -f docker-compose.yml run --rm backend python -m alembic upgrade head
```

Alembic reported the MSSQL implementation and transactional DDL. Revision
verification returned:

```text
current: d524f5f3f22d (head)
heads:   d524f5f3f22d (head)
```

No invented or manual migration was used.

## Backend Dependency and Startup Validation

`backend/requirements.txt` declares both `email-validator` and
`pydantic[email]`. Runtime imports and installed distribution checks returned:

```text
email-validator=2.3.0
pydantic=2.13.4
fastapi=0.139.0
```

No dependency edit or backend rebuild was required during this validation.

Backend startup logs confirmed:

- Database connectivity passed.
- Redis connectivity passed.
- Startup validation completed.
- Production readiness audit scored `100/100`.
- Uvicorn listened on `0.0.0.0:8000`.
- Docker health status was `healthy`, failing streak `0`.

One non-fatal warning remains: optional HTTPX OpenTelemetry instrumentation
could not load `httpx`. The application explicitly continued, and this did not
affect backend health, database access, `/health`, or `/metrics`.

## API and Metrics Validation

Health endpoint:

```text
URL:    http://localhost:8000/health
Status: 200
Body:   {"status":"healthy"}
```

Metrics endpoint:

```text
URL:          http://localhost:8000/metrics
Status:       200
Content-Type: text/plain; version=1.0.0; charset=utf-8
```

The response contained valid Prometheus exposition text, including
`python_gc_objects_collected_total` HELP, TYPE, and sample lines.

## Prometheus Validation

Semantic validation used the pinned image:

```text
Checking /etc/prometheus/prometheus.yml
 SUCCESS: /etc/prometheus/prometheus.yml is valid prometheus config file syntax
```

Prometheus runtime endpoints:

| URL | Result |
|---|---|
| `http://localhost:9090/-/ready` | HTTP `200` — `Prometheus Server is Ready.` |
| `http://localhost:9090/-/healthy` | HTTP `200` — `Prometheus Server is Healthy.` |
| `http://localhost:9090/targets` | Available locally; API evidence below |

Target API evidence:

```text
API status:  success
Job:         tasksync-backend
Health:      up
Scrape URL:  http://host.docker.internal:8000/metrics
Last error:  <empty>
```

PromQL evidence:

```promql
up{job="tasksync-backend"}
```

```text
API status: success
Job:        tasksync-backend
Value:      1
Timestamp:  1783929718.754
```

No runtime screenshot was captured in this CLI validation. The local URLs and
API responses above are the recorded runtime evidence.

## Remaining Notes

- Docker Compose reported the other TaskSyncEnterprise services as orphans when
  the separate monitoring Compose file was invoked. No `--remove-orphans`
  operation was used, so core containers were preserved.
- The Prometheus UI/API remains bound to `127.0.0.1:9090`.
- Grafana and Phase 3.7.6 were not started.

## Final Status

**PHASE 3.7.5 COMPLETE**
