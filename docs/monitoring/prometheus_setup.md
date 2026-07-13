# Prometheus Monitoring Server

## Purpose and Architecture

Phase 3.7.5 runs Prometheus 3.13.1 as a standalone Docker Compose service and
scrapes the existing FastAPI `/metrics` endpoint every 15 seconds. Application
code is unchanged.

```text
FastAPI /metrics (host port 8000)
              ^
              | scrape every 15 seconds
              |
Prometheus (127.0.0.1:9090, persistent TSDB)
              |
              +-- tasksync-observability network
                  +-- future Grafana
                  +-- future Alertmanager
                  +-- future Loki
                  +-- future Tempo
```

Files and durable resources:

- `monitoring/prometheus/prometheus.yml` defines the global intervals and the
  `tasksync-backend` scrape job.
- `docker-compose.monitoring.yml` defines the pinned Prometheus container,
  health check, persistent storage, and observability network.
- `tasksync-prometheus-data` is the Docker-managed TSDB volume. It survives
  container recreation and ordinary Compose shutdown.

## Prerequisites

- Windows 11 with Docker Desktop, or Linux with Docker Engine.
- Docker Compose v2 (`docker compose`, not legacy `docker-compose`).
- Docker Desktop or Docker Engine must be running. Installing only the Docker
  client does not start the Docker daemon.
- On Windows, Docker Desktop must use Linux containers.
- The TaskSyncEnterprise backend must listen on an interface reachable through
  host port `8000` and expose an enabled `/metrics` endpoint.

Run these checks from the repository root:

```powershell
docker version
docker info
docker compose version
```

Both `docker version` sections and `docker info` must return server details. A
named-pipe or daemon connection error means Docker Desktop/Engine is stopped.

## Start and Inspect the Backend

The project Compose service starts the backend together with its declared Redis
and SQL Server dependencies:

```powershell
docker compose -f docker-compose.yml up -d backend
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail 100 backend
```

The repository also supports a local Python/Uvicorn process when its Python
3.12 virtual environment and external dependencies are configured:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Return to the repository root before running the monitoring commands:

```powershell
Set-Location ..
```

## Verify Backend Metrics

```powershell
$response = Invoke-WebRequest http://localhost:8000/metrics
$response.StatusCode
$response.Content.Substring(0, [Math]::Min(500, $response.Content.Length))
```

Expected status: `200`. The content should use Prometheus exposition format and
include metric names such as `http_requests_total`. Prometheus cannot scrape a
backend that is stopped, has metrics disabled, listens only on an inaccessible
interface, or blocks `/metrics` with authentication/network policy.

## Configuration Defaults

| Setting | Default | Purpose |
|---|---:|---|
| Image | `prom/prometheus:v3.13.1` | Reproducible reviewed BusyBox release |
| Scrape interval | `15s` | Backend metric collection cadence |
| Evaluation interval | `15s` | Future rule evaluation cadence |
| Scrape timeout | `10s` | Prevents overlapping scrapes |
| Host binding | `127.0.0.1:9090` | Local-only UI/API access |
| `PROMETHEUS_RETENTION_TIME` | `15d` | Maximum sample age |
| `PROMETHEUS_RETENTION_SIZE` | `10GB` | Approximate TSDB size ceiling |

To change retention for the current shell:

```powershell
$env:PROMETHEUS_RETENTION_TIME = "30d"
$env:PROMETHEUS_RETENTION_SIZE = "20GB"
```

## Static Docker Compose Validation

```powershell
docker compose -f docker-compose.monitoring.yml config
docker compose -f docker-compose.monitoring.yml config --services
docker compose -f docker-compose.monitoring.yml config --volumes
docker compose -f docker-compose.monitoring.yml config --networks
```

Expected resolved objects:

```text
Service: prometheus
Volume:  prometheus_data
Network: observability
Port:    127.0.0.1:9090 -> 9090/tcp
```

Compose validation verifies the Compose model but does not semantically parse
the bind-mounted Prometheus configuration.

## Prometheus Semantic Validation

From the repository root, use `promtool` bundled at `/bin/promtool` in the exact
pinned image. This creates a temporary checker container and does not start the
Prometheus server:

```powershell
docker run --rm `
  --entrypoint /bin/promtool `
  -v "${PWD}/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro" `
  prom/prometheus:v3.13.1 `
  check config /etc/prometheus/prometheus.yml
```

Expected output includes `SUCCESS`. This command requires a running Docker
daemon and may pull the pinned image if it is not local. It was documented but
not executed during remediation because the Docker daemon was unavailable.

## Start, Restart, and Stop Prometheus

Pull and start:

```powershell
docker compose -f docker-compose.monitoring.yml pull
docker compose -f docker-compose.monitoring.yml up -d
docker compose -f docker-compose.monitoring.yml ps
```

Restart only Prometheus:

```powershell
docker compose -f docker-compose.monitoring.yml restart prometheus
```

Stop while retaining all metric history:

```powershell
docker compose -f docker-compose.monitoring.yml down
```

## Readiness and Health

```powershell
$ready = Invoke-WebRequest http://localhost:9090/-/ready
$healthy = Invoke-WebRequest http://localhost:9090/-/healthy
$ready.StatusCode
$healthy.StatusCode
docker inspect tasksync-prometheus --format "{{json .State.Health}}"
```

Both HTTP status codes should be `200`, and the container health status should
be `healthy` after its start period.

## Logs and Common Errors

```powershell
docker compose -f docker-compose.monitoring.yml logs --tail 100 prometheus
docker compose -f docker-compose.monitoring.yml logs -f prometheus
```

Common failures:

- Configuration parse error: run the pinned-image `promtool` command and fix the
  reported configuration line.
- `unexpected false` during Prometheus startup: do not pass
  `--web.enable-lifecycle=false` to Prometheus v3.13.1. The lifecycle API is
  disabled by default; omit the flag unless an approved deployment explicitly
  enables it with `--web.enable-lifecycle`.
- `permission denied` on `/prometheus`: inspect the named volume and selected
  image; do not override the official image user without evidence.
- Backend `connection refused`: start the backend and verify host port `8000`.
- Target timeout: check backend health, load, firewall, and scrape duration.
- `unknown host`: confirm Docker Desktop/Linux host-gateway behavior below.
- Port 9090 already in use: stop the conflicting process or deployment. The
  documented monitoring contract intentionally uses host port `9090`.

## Verify the Prometheus Target

Open <http://localhost:9090/targets> in a browser.

Expected target:

```text
Job:      tasksync-backend
Endpoint: http://host.docker.internal:8000/metrics
State:    UP
```

`DOWN` is expected when the backend is stopped, `/metrics` is disabled or
unavailable, the target cannot resolve, or the scrape times out.

## PromQL Verification

```powershell
$query = [uri]::EscapeDataString('up{job="tasksync-backend"}')
$result = Invoke-RestMethod "http://localhost:9090/api/v1/query?query=$query"
$result.data.result
```

The `tasksync-backend` sample value should be `1`. Useful starter queries are:

```promql
up
scrape_duration_seconds
scrape_samples_scraped
process_resident_memory_bytes
rate(http_requests_total[5m])
```

`http_requests_total` is defined by the TaskSyncEnterprise metrics middleware;
the other names are standard Prometheus scrape/process metrics present in this
deployment model. Generate backend requests before querying a rate.

## Persistent Data Verification

Inspect the exact named volume:

```powershell
docker volume ls
docker volume inspect tasksync-prometheus-data
```

Persistence test:

1. Start the backend and Prometheus.
2. Generate backend traffic and confirm query data exists.
3. Run `docker compose -f docker-compose.monitoring.yml down`.
4. Run `docker compose -f docker-compose.monitoring.yml up -d`.
5. Run the same query and confirm historical samples remain.

Ordinary `down` removes the container/network but retains the named volume.

## Destructive Reset of Prometheus Data

> **Warning:** This permanently deletes all Prometheus time-series history.
> Verify the exact volume name first. Never delete TaskSyncEnterprise SQL Server
> or Redis volumes, and never use broad cleanup commands such as
> `docker volume prune` for this procedure.

```powershell
docker compose -f docker-compose.monitoring.yml down
docker volume inspect tasksync-prometheus-data
docker volume rm tasksync-prometheus-data
docker compose -f docker-compose.monitoring.yml up -d
```

The explicit `docker volume inspect` step is the operator confirmation point
before deletion. The final command recreates an empty Prometheus TSDB volume.

## Windows and Linux Host Routing

### Windows 11 Docker Desktop

- Docker Desktop must be running Linux containers.
- `host.docker.internal` resolves automatically to the Windows host from the
  Linux container.

### Linux Docker Engine

The Compose file supplies the host route:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

A sufficiently recent Docker Engine with `host-gateway` support is required.
The backend must publish port 8000 on a host interface reachable from Docker.

## Local Versus Production Deployment

### Local

- Keep the default `127.0.0.1:9090` binding.
- Run one Prometheus container with the local named volume.
- Do not expose the web UI/API to other machines.
- Use the truthful `environment="local"` target label.

### Production

- Use a protected private network and managed persistent storage.
- Put Prometheus behind an authenticated reverse proxy, firewall, or equivalent
  network access controls.
- Keep the image tag pinned and preferably promote a locally verified digest.
- Define backup, recovery, capacity, and retention policies.
- Generate or override environment-specific target labels through deployment
  tooling; Prometheus does not expand ordinary shell variables in its YAML.
- Configure alerts and Alertmanager only in their assigned future phase.
- Never expose raw Prometheus publicly.

This task does not configure authentication. For an intentional protected
deployment that must listen beyond localhost, an operator may explicitly set:

```powershell
$env:PROMETHEUS_BIND_ADDRESS = "0.0.0.0"
docker compose -f docker-compose.monitoring.yml up -d
```

Do not use that override without a private network, protected reverse proxy,
firewall, or equivalent access control.

## SQL Server 2022 Healthcheck Troubleshooting

SQL Server 2022 container images provide `sqlcmd` at
`/opt/mssql-tools18/bin/sqlcmd`. The bundled ODBC Driver 18 validates encrypted
connections by default, so a development container using SQL Server's
self-signed certificate fails with `certificate verify failed:self-signed
certificate` unless `sqlcmd` is told to trust that certificate.

Use an exec-form healthcheck and pass `-C` as its own array item:

```yaml
healthcheck:
  test:
    [
      "CMD",
      "/opt/mssql-tools18/bin/sqlcmd",
      "-S",
      "localhost",
      "-U",
      "sa",
      "-P",
      "<existing local development password>",
      "-C",
      "-Q",
      "SELECT 1"
    ]
```

Confirm both the rendered configuration and the effective container setting:

```powershell
docker compose -f docker-compose.yml config
docker inspect tasksync-sqlserver --format "{{json .Config.Healthcheck}}"
docker inspect tasksync-sqlserver --format "{{json .State.Health}}"
```

Do not replace this with a TCP-only probe or disable encryption globally. If
the direct query succeeds but `TaskSyncEnterprise` is absent from
`sys.databases`, stop before backend and Prometheus validation. Use a
repository-approved database creation workflow, then run the documented
`alembic upgrade head` migration step; Alembic migrations do not create the SQL
Server database itself.
