# TaskSyncEnterprise — Phase 3.7.7 Grafana Observability Architecture Plan

This document establishes the architecture, standards, and implementation roadmap for **Phase 3.7.7 (Observability Standardization)**. It provides a formal design for Grafana folders, dashboards, variables, provisioning setups, and drill-down links. Additionally, it audits the current repository implementation, noting strengths, weaknesses, and maintenance risks.

---

## 1. Dashboard Folder & File Hierarchy

To ensure production-grade usability, Grafana dashboards are organized hierarchically matching administrative concerns. We leverage Grafana's file system structure scanning to dynamically map folders.

### Folder Structure Configuration
```
monitoring/grafana/dashboards/
├── Executive/
│   └── executive-overview.json
├── Backend/
│   └── backend-overview.json
├── Infrastructure/
│   └── infrastructure-overview.json
├── Database/
│   └── database-overview.json
├── Redis/
│   └── redis-overview.json
├── Docker/
│   └── docker-overview.json
└── Development/
    └── prometheus-diagnostics.json
```

### Folder Allocation and Dashboard Specifications

| Folder Name | Dashboard Name | Dashboard UID | Target Audience | Primary Monitored Metrics |
|---|---|---|---|---|
| **Executive** | `TaskSyncEnterprise Executive Overview` | `tasksync-executive-overview` | Leadership, Product Owners | System Availability, API Success Rate, 95th Latency, Database & Redis overall health, high-level business indicators (active tasks, projects, users). |
| **Backend** | `TaskSyncEnterprise Backend Overview` | `tasksync-backend-overview` | Backend Engineers, QA | HTTP Request Rates, HTTP Response Codes (2xx, 3xx, 4xx, 5xx), Endpoint Latency Percentiles (p50, p95, p99), Active Connections, Error Rates per Route. |
| **Infrastructure** | `TaskSyncEnterprise Infrastructure Overview` | `tasksync-infrastructure-overview` | DevOps, System Admins | Process CPU usage, Process Memory Resident Set Size (RSS) and Virtual Memory Size (VMS), Python Garbage Collection (GC) stats, Open File Descriptors (FDs). |
| **Database** | `TaskSyncEnterprise Database Overview` | `tasksync-database-overview` | DBAs, Backend Engineers | SQL Server transaction rate, SQL statement type breakdown (SELECT, INSERT, etc.), Query success vs failure rates, DB query durations (latencies). |
| **Redis** | `TaskSyncEnterprise Redis Overview` | `tasksync-redis-overview` | DevOps, Backend Engineers | Redis request rate, Redis errors by command/type, Redis command latency, cache success/hit-ratio, Cache-to-HTTP request correlation. |
| **Docker** | `TaskSyncEnterprise Docker Overview` | `tasksync-docker-overview` | DevOps | Container resource consumption (CPU, Memory, Network, Disk I/O) collected via cAdvisor. |
| **Development** | `TaskSyncEnterprise Prometheus Diagnostics` | `tasksync-development-diagnostics` | DevOps, Observability Specialists | Scraping jobs health (UP/DOWN states), scrape durations, samples scraped per target, scrape series added, TSDB storage performance metrics. |

---

## 2. Dashboard & Panel Naming Conventions

Consistent, unambiguous naming patterns are required for panels, variables, and titles.

### Dashboard Naming Pattern
- **Format:** `TaskSyncEnterprise [Folder Name] Overview` (except for Development which uses specific diagnostics names).
- **Example:** `TaskSyncEnterprise Database Overview`

### Dashboard UID Naming Pattern
- **Format:** `tasksync-[folder-lowercase]-[dashboard-lowercase]`
- **Examples:**
  - Executive: `tasksync-executive-overview`
  - Backend: `tasksync-backend-overview`
  - Database: `tasksync-database-overview`
  - Prometheus Diagnostics: `tasksync-development-diagnostics`

### Panel Naming Conventions
Panels must use a structured prefix representing the context, followed by the metric detail and units in the subtitle or visual configuration.
- **Pattern:** `[Context] - [Metric Name]`
- **Examples:**
  - `FastAPI - HTTP Request Rate`
  - `Host - CPU Usage %`
  - `SQL Server - Query Execution Duration`
  - `Redis - Cache Success Ratio %`
  - `Garbage Collector - GC Collections Rate`

---

## 3. Variables & Parameter Sharing Strategy

Variables allow operators to filter all dashboards consistently. A core architecture requirement is **state preservation during cross-dashboard navigation**.

### Standardized Global Variables
Every dashboard must declare these core variables in their `templating` list:

1. **`datasource`**
   - **Type:** `datasource`
   - **Query:** `prometheus`
   - **Label:** Data Source (typically hidden in production if only one Prometheus source exists).
2. **`environment`**
   - **Type:** `query`
   - **Query:** `label_values(up, environment)`
   - **Label:** Environment (e.g., local, staging, production).
3. **`job`**
   - **Type:** `query`
   - **Query:** `label_values(up{environment=~"$environment"}, job)`
   - **Label:** Job
4. **`instance`**
   - **Type:** `query`
   - **Query:** `label_values(up{environment=~"$environment", job=~"$job"}, instance)`
   - **Label:** Instance
5. **`interval`**
   - **Type:** `interval`
   - **Query:** `10s,30s,1m,5m,15m,30m,1h,2h,1d`
   - **Label:** Interval
6. **`rate_interval`**
   - **Type:** `interval`
   - **Query:** `1m,5m,10m,15m`
   - **Label:** Rate Interval (used inside PromQL `rate()` functions to prevent alignment and sampling issues).

### Context-Specific Variables
Defined only on their respective dashboards:
- **`statement_type`** (Database Dashboard): `label_values(db_requests_total, statement_type)`
- **`redis_command`** (Redis Dashboard): `label_values(redis_requests_total, command)`

---

## 4. Dashboard Link & Drill-Down Strategy

Seamless drill-down is critical for debugging issues fast. We implement a two-layered navigation strategy:

### A. Global Navigation Links (Header Menu)
Every dashboard must include a list of dashboard links in the top-right corner to allow switching folders while preserving the target environment, time-range, and variables:
- **Configure links in JSON under `links`:**
```json
"links": [
  {
    "asDropdown": true,
    "icon": "dashboard",
    "includeVars": true,
    "keepTime": true,
    "tags": ["tasksync"],
    "targetBlank": false,
    "title": "TaskSync Navigation Menu",
    "type": "dashboards"
  }
]
```

### B. Interactive Drill-Down Links (Panel Click-Throughs)
High-level cards in the Executive and Backend dashboards should feature data links pointing to low-level dashboards:
- **From Executive (Database Query Time) -> Database Overview:**
  - Path: `/d/tasksync-database-overview?var-environment=$environment&var-job=$job&var-instance=$instance`
- **From Executive (Redis Error Rate) -> Redis Overview:**
  - Path: `/d/tasksync-redis-overview?var-environment=$environment&var-job=$job&var-instance=$instance`
- **From Backend (HTTP Endpoint Path) -> Trace Aggregates (OTel/Tempo in future phases):**
  - Deep link to Tempo traces filtering by path.

---

## 5. Provisioning Structure (Infrastructure as Code)

To enforce reproducible dashboards across environments, Grafana’s file provisioning provider must scan folders recursively.

### Standardized `dashboards.yml`
We configure Grafana to read all directories under `/etc/grafana/dashboards` and dynamically construct folders matching the disk structure by enabling `foldersFromFilesStructure: true`.

```yaml
apiVersion: 1

providers:
  - name: 'TaskSyncEnterprise'
    orgId: 1
    folder: '' # Handled dynamically by foldersFromFilesStructure
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/dashboards
      foldersFromFilesStructure: true
```

---

## 6. Audit of the Current Grafana Implementation

We reviewed the current JSON files in `monitoring/grafana/dashboards/tasksync/` and the backend metrics exporter in `app/monitoring/prometheus_metrics.py`.

### Strengths
- **Provisioning Foundation:** Datasources and dashboards are loaded via declarative YAML files, preventing database configuration drift.
- **Detailed Scrapes:** Custom metrics capture command-specific Redis states (`redis_requests_total{command="..."}`) and database action categories (`db_requests_total{statement_type="..."}`).
- **Environment Isolation:** Every query incorporates the `environment` label (defaults to `local`), allowing dashboards to easily split dev, staging, and prod telemetry.

### Weaknesses
- **No Folder Hierarchy:** Currently, all dashboards are grouped under the single folder `TaskSyncEnterprise` via `dashboards.yml`.
- **False Docker Dashboard:** `docker-overview.json` does not monitor container states. It queries Python process statistics (`process_cpu_seconds_total`, `process_resident_memory_bytes`, `process_open_fds`) from the backend application container. No container-level metrics (e.g. SQL Server container resources, Redis container memory) exist.
- **High Panel Duplication:** Process CPU, process memory, and host-level CPU metrics are duplicated identically across the `backend-overview`, `infrastructure-overview`, and `docker-overview` dashboards, causing layout noise and redundant Prometheus database hits.
- **Prometheus Scrape Leakage:** Scrape diagnostic metrics (`scrape_duration_seconds`, `scrape_samples_scraped`, etc.) are mixed directly into resource monitoring dashboards, which belongs in diagnostics.
- **Metric Implementation Bug (Critical):** In `app/monitoring/prometheus_metrics.py`, the gauge `system_memory_usage_bytes` is updated using `process.memory_info().rss`. This registers the **FastAPI process RSS memory** under a metric labeled as system-wide memory, causing misleading dashboards.
- **Static Dashboard Links:** Cross-linking is based on generic tags rather than precise drill-downs passing state variables.

### Future Maintenance Risks
- **JSON Drift:** If dashboards are edited manually via the UI, changes are lost on container restart. Developers must export and check in updated JSON configs.
- **Missing Container Observability:** Without cAdvisor or Docker socket exporter, system failures in secondary containers (e.g. MS SQL Server container or Redis container crashing due to out-of-memory errors) will not show up on the Docker or Infrastructure dashboards.
- **PromQL Aggregation Inconsistencies:** PromQL queries contain hardcoded scrape intervals (e.g. `[5m]`) instead of dynamically referencing `$rate_interval`, leading to sub-optimal rates depending on selected ranges.

---

## 7. Reusable Panel Philosophy

To minimize dashboard JSON maintenance, we establish a design rule for **Single Source of Truth** metrics:
1. **Host & OS Metrics:** Placed exclusively in `Infrastructure`.
2. **FastAPI Process Metrics:** Placed in `Backend`.
3. **Internal Prometheus Logs:** Placed in `Development`.
4. **Executive Dashboard:** Uses *only* aggregate indicators (`sum(rate(...))`, `histogram_quantile(...)`). It should not show raw timeline process gauges.

If panels must be replicated (e.g., status check indicators), we document their structure as standard code snippets. In future phases, we will explore Grafana **Library Panels** once Grafana persistence databases are backed up.

---

## 8. Future Scalability (Phase 3.7.8+ Integration)

1. **Loki for Logs Aggregation:** Stream JSON structured logs from containers directly into Loki and add a dashboard logs panel next to latency metrics.
2. **Tempo for Trace Visualizations:** Leverage OpenTelemetry tracing span ids. Add a panel link that extracts the `trace_id` from logs and routes the operator directly to Tempo trace view in Grafana.
3. **Alertmanager Integration:** Define Prometheus rules in `monitoring/prometheus/alert_rules.yml` and connect Alertmanager to fire Slack alerts on service downtimes or high error rates.
4. **cAdvisor deployment:** Introduce cAdvisor to the `docker-compose.monitoring.yml` file to expose actual container statistics, completing the `Docker Overview` dashboard correctly.
