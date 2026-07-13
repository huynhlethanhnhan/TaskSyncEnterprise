# Phase 3.7.5 Prometheus Remediation Completion

## 1. Executive Summary

The required Phase 3.7.5 review findings have been remediated. Prometheus now
uses a pinned image, exposes its unauthenticated UI/API only on localhost by
default, labels local metrics truthfully, and uses a non-attachable dedicated
Compose network. The operating guide now provides an exact Windows PowerShell
workflow from prerequisites through persistence verification and safe reset.

Static Docker Compose validation and all required runtime checks passed on
Windows 11 Docker Desktop. The pinned image pull, `promtool`, container health,
backend scrape, PromQL, and persistence tests are now verified. No application,
frontend, or database business-logic code was changed.

## 2. Original Review Findings

| Finding | Severity | Original issue | Resolution |
|---|---|---|---|
| F-01 | HIGH | Floating Prometheus image tag | Resolved |
| F-02 | MEDIUM | UI/API public on all interfaces by default | Resolved |
| F-03 | MEDIUM | Incomplete manual-test documentation | Resolved |
| F-04 | LOW | Local samples labeled as production | Resolved |
| F-05 | LOW | Unnecessary attachable network | Resolved |
| F-06 | INFORMATIONAL | Optional read-only root filesystem | Deferred pending runtime evidence |
| F-07 | INFORMATIONAL | Optional measured resource limits | Deferred pending measurements |
| F-08 | INFORMATIONAL | Runtime validation unavailable | Resolved by live Docker Desktop validation |

## 3. Remediation Applied

- Pinned `prom/prometheus:v3.13.1`; no unverified digest was added.
- Defaulted the published address to `127.0.0.1:9090`.
- Kept an explicit, documented `PROMETHEUS_BIND_ADDRESS` override for protected
  deployments only.
- Changed the static target label to `environment: local` and documented why
  shell interpolation is not used in `prometheus.yml`.
- Removed `attachable: true` while retaining the named observability bridge.
- Preserved persistence, retention, health check, host-gateway, read-only config
  mount, restart policy, and privilege reduction.
- Added complete PowerShell instructions and explicit local/production guidance.
- Updated the formal review without erasing its original findings.

## 4. Files Modified

- `docker-compose.yml`
- `monitoring/prometheus/prometheus.yml`
- `docker-compose.monitoring.yml`
- `docs/monitoring/prometheus_setup.md`
- `docs/reports/phase_3_7_5_prometheus_review.md`

File created:

- `docs/reports/phase_3_7_5_prometheus_completion.md`

Application, frontend, database, Grafana, Alertmanager, Loki, and Tempo files
were not modified or created.

## 5. Final Prometheus Configuration

The final configuration provides:

- Global `scrape_interval: 15s`.
- Global `evaluation_interval: 15s`.
- Bounded `scrape_timeout: 10s`.
- One job: `tasksync-backend`.
- Explicit `scheme: http` and `metrics_path: /metrics`.
- Target `host.docker.internal:8000`.
- Stable `service: tasksync-backend` and truthful `environment: local` labels.
- No additional scrape endpoints, credentials, or unsupported environment
  interpolation.

## 6. Final Docker Compose Configuration

The final Compose model resolves:

```text
Image:         prom/prometheus:v3.13.1
Container:     tasksync-prometheus
Published:     127.0.0.1:9090 -> 9090/tcp
Volume:        tasksync-prometheus-data -> /prometheus
Network:       tasksync-observability (bridge)
Restart:       unless-stopped
Retention:     15d and 10GB
Configuration: read-only bind mount
```

The service retains its readiness health check, `no-new-privileges`, and Linux
`host-gateway` mapping. It has no privileged mode, host network, Docker socket,
explicit user override, guessed resource limit, or untested root-filesystem
read-only setting.

## 7. Documentation Improvements

The setup guide now documents:

- Windows 11/Linux prerequisites and Docker daemon checks.
- Docker Desktop Linux-container mode.
- Compose and supported local Python backend startup.
- `/metrics` status/content inspection.
- All Compose static views and expected resolved objects.
- Pinned-image `/bin/promtool` semantic validation.
- Start, restart, stop, readiness, health, inspect, and log commands.
- Expected target and evidence-based PromQL queries.
- Volume inspection and persistence testing.
- Explicit destructive reset with volume-name confirmation.
- Windows Docker Desktop and Linux host-gateway behavior.
- Secure local versus protected production operation.

## 8. Static Validation Results

| Validation | Result |
|---|---|
| Branch is `develop` | PASS |
| Scope contains no tracked/staged unrelated changes | PASS |
| Compose full render | PASS |
| Compose service list | PASS — `prometheus` |
| Compose volume list | PASS — `prometheus_data` |
| Compose network list | PASS — `observability` |
| Resolved image | PASS — `prom/prometheus:v3.13.1` |
| Resolved port | PASS — host `127.0.0.1`, published `9090` |
| Required Prometheus settings | PASS |
| Required documentation coverage | PASS |

## 9. Runtime Validation Results

**PASS — validated on Windows 11 Docker Desktop on 2026-07-13**

| Runtime check | Status |
|---|---|
| Pull pinned image | PASS — `prom/prometheus:v3.13.1` |
| Pulled image digest | PASS — `sha256:3c42b892cf723fa54d2f262c37a0e1f80aa8c8ddb1da7b9b0df9455a35a7f893` |
| `promtool check config` | PASS — valid Prometheus config syntax |
| Start Prometheus container | PASS |
| Readiness/health | PASS — both HTTP endpoints returned `200`; container `healthy` |
| Backend `/metrics` | PASS — HTTP `200`, Prometheus text exposition |
| Target state `UP` | PASS — `tasksync-backend`, no scrape error |
| PromQL sample value `1` | PASS |
| Persistence across recreation | PASS — four historical samples retained with original timestamps |

The first Prometheus start exposed an invalid command-line argument:
`--web.enable-lifecycle=false` caused `unexpected false` with v3.13.1. Because
the lifecycle API is disabled by default, the false-valued flag was removed.
The recreated container then became healthy without enabling the lifecycle API.

## 10. Manual Testing Commands

Run from the repository root in Windows PowerShell after starting Docker
Desktop in Linux-container mode.

```powershell
docker version
docker info
docker compose version

docker compose -f docker-compose.yml up -d backend
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail 100 backend

$response = Invoke-WebRequest http://localhost:8000/metrics
$response.StatusCode
$response.Content.Substring(0, [Math]::Min(500, $response.Content.Length))

docker compose -f docker-compose.monitoring.yml config
docker compose -f docker-compose.monitoring.yml config --services
docker compose -f docker-compose.monitoring.yml config --volumes
docker compose -f docker-compose.monitoring.yml config --networks

docker pull prom/prometheus:v3.13.1
docker run --rm `
  --entrypoint /bin/promtool `
  -v "${PWD}/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro" `
  prom/prometheus:v3.13.1 `
  check config /etc/prometheus/prometheus.yml

docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.monitoring.yml ps
Invoke-WebRequest http://localhost:9090/-/ready
Invoke-WebRequest http://localhost:9090/-/healthy
docker inspect tasksync-prometheus --format "{{json .State.Health}}"
docker compose -f docker-compose.monitoring.yml logs --tail 100 prometheus

$query = [uri]::EscapeDataString('up{job="tasksync-backend"}')
$result = Invoke-RestMethod "http://localhost:9090/api/v1/query?query=$query"
$result.data.result

docker volume inspect tasksync-prometheus-data
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.monitoring.yml up -d
$result = Invoke-RestMethod "http://localhost:9090/api/v1/query?query=$query"
$result.data.result
```

Also open <http://localhost:9090/targets> and confirm:

```text
Job:      tasksync-backend
Endpoint: http://host.docker.internal:8000/metrics
State:    UP
```

Detailed troubleshooting and the intentional destructive reset procedure are in
`docs/monitoring/prometheus_setup.md`.

## 11. Remaining Risks

- Backend/database readiness remains a runtime dependency for successful
  scraping, although both were healthy during this validation.
- Prometheus has no built-in authentication in this stack; the localhost default
  must not be overridden without compensating access controls.
- A production digest, resource limits, backup policy, and managed storage must
  be based on verified deployment evidence.

## 12. Final Status

**PHASE 3.7.5 COMPLETE**

All required static and runtime checks passed, including persistence across a
non-destructive monitoring-stack recreation.

## 13. Readiness for Phase 3.7.6

**Ready, but not started.** The manual workflow confirmed all of the following:

- `promtool check config` succeeds.
- Prometheus starts and becomes healthy.
- The backend target reports `UP`.
- `up{job="tasksync-backend"}` returns `1`.
- Historical samples survive `down` and `up -d`.

Evidence for all five checks is recorded. Phase 3.7.6 and Grafana were not
started by this task.

## 14. SQL Server Healthcheck Retest (2026-07-13)

### Original failure and root cause

The running SQL Server accepted connections but Docker reported it unhealthy.
Its ODBC Driver 18 healthcheck rejected SQL Server's self-signed development
certificate. The Compose healthcheck already used the current SQL Server 2022
path, `/opt/mssql-tools18/bin/sqlcmd`, but its effective exec-form argument list
did not include `-C`.

### Configuration fix

- Removed the obsolete top-level Compose `version` key.
- Preserved the corrected backend URL using the `sqlserver` service hostname
  and the `TaskSyncEnterprise` database name.
- Added `-C` as a separate healthcheck array item between the password and
  query arguments.
- Recreated only `tasksync-sqlserver`; the SQL Server named volume was not
  deleted or reset.

### Commands executed

```powershell
git branch --show-current
git status --short
git diff -- docker-compose.yml
docker compose -f docker-compose.yml config
docker compose -f docker-compose.yml config --services
docker inspect tasksync-sqlserver --format "{{json .Config.Healthcheck}}"
docker compose -f docker-compose.yml up -d --force-recreate sqlserver
docker inspect tasksync-sqlserver --format "{{json .State.Health}}"
docker logs tasksync-sqlserver --tail 100
docker exec tasksync-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "<existing local development password>" -C -Q "SELECT 1 AS health_check"
docker exec tasksync-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "<existing local development password>" -C -Q "SELECT name FROM sys.databases WHERE name = 'TaskSyncEnterprise'"
```

### Verified results

| Check | Result |
|---|---|
| Branch | PASS - `develop` |
| Compose render | PASS - tools18 path, separate `-C`, and `TaskSyncEnterprise` present; no obsolete `version` warning |
| Effective container healthcheck | PASS - exact exec array contains `/opt/mssql-tools18/bin/sqlcmd` and `-C` |
| Direct `SELECT 1 AS health_check` | PASS - returned `1` |
| SQL Server Docker health | PASS - `healthy`, failing streak `0`, healthcheck exit code `0` |
| `TaskSyncEnterprise` database | **MISSING** - catalog query returned `0 rows affected` |
| Backend startup | Not attempted because the configured database is missing |
| Backend health and `/metrics` | Not attempted |
| Promtool and Prometheus runtime | Not attempted |

Repository inspection found Alembic migrations and the documented
`docker exec tasksync-backend alembic upgrade head` workflow, but no approved
script or command that creates the `TaskSyncEnterprise` database. The checked-in
`DB_V2.sql` and `DB_V2_utf8.sql` files begin with `USE [TaskSyncEnterprise]` and
also require the database to exist already. No schema was invented and no
database was created automatically.

### Retest status

**BLOCKED - DATABASE MISSING**

Phase 3.7.5 remains incomplete. Backend, `/metrics`, Prometheus, and PromQL
validation must resume only after an approved database-creation workflow has
created `TaskSyncEnterprise`; Phase 3.7.6 and Grafana were not started.

## 15. Final Runtime Validation (2026-07-13)

This later retest supersedes the blocker status in Section 14 while preserving
that section as historical evidence. The database catalog now returned one row
for `TaskSyncEnterprise`; this task did not infer or document how it was created.

### Backend and database

| Check | Result |
|---|---|
| SQL Server container | `healthy` |
| `TaskSyncEnterprise` catalog query | PASS — one row returned |
| Backend container | `running healthy` |
| Backend startup validations | PASS — database and Redis connectivity verified |
| Backend log review | PASS — no login, database-open, connection, import, Redis, or SQLAlchemy startup errors |
| Non-fatal backend warning | HTTPX tracing instrumentation unavailable because `httpx` is not installed |
| `GET /health` | PASS — HTTP `200`, `{"status":"healthy"}` |
| `GET /metrics` | PASS — HTTP `200`, Prometheus text exposition |

### Prometheus

| Check | Result |
|---|---|
| Image | `prom/prometheus:v3.13.1` |
| Pulled digest | `sha256:3c42b892cf723fa54d2f262c37a0e1f80aa8c8ddb1da7b9b0df9455a35a7f893` |
| `promtool check config` | `SUCCESS` |
| Initial container start | Failed — `--web.enable-lifecycle=false` produced `unexpected false` |
| Command-line remediation | Removed the invalid false-valued flag; lifecycle API remains disabled by default |
| `GET /-/ready` | PASS — HTTP `200` |
| `GET /-/healthy` | PASS — HTTP `200` |
| Docker health | `healthy`, failing streak `0` |
| Target API | `tasksync-backend`, health `up`, empty `lastError` |
| Target URL | `http://host.docker.internal:8000/metrics` |
| PromQL `up{job="tasksync-backend"}` | `1` |
| Persistence | PASS — four samples with timestamps `1783929232` through `1783929277` remained after `down` and `up -d` |

### Final status

**PHASE 3.7.5 COMPLETE**

Grafana and Phase 3.7.6 were not started.
