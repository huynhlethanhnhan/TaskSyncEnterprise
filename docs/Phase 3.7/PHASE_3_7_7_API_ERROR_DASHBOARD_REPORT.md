# TaskSyncEnterprise — Phase 3.7.7 Observability Report (API & Error Dashboards)

This report documents the architectural design, implementation details, metrics mappings, and validation results of the two new dashboards: the **API Overview Dashboard** and the **Error Overview Dashboard**, created in Phase 3.7.7.

---

## 1. Mapped Dashboards & Folder Locations

To maintain consistency with the standardized Observability Folder Hierarchy, both dashboards have been provisioned under the `Backend` directory:

1. **`monitoring/grafana/dashboards/Backend/api-overview.json`**
   - **Title:** `TaskSyncEnterprise API Overview`
   - **UID:** `tasksync-api-overview`
2. **`monitoring/grafana/dashboards/Backend/error-overview.json`**
   - **Title:** `TaskSyncEnterprise Error Overview`
   - **UID:** `tasksync-error-overview`

---

## 2. Telemetry Metrics Integration (FastAPI Backend)

To support the exact requirements of the dashboards without duplicate instrumentation, we extended the core exporter and unified exception handling framework.

### Standardized Prometheus Metrics List
We added 4 new counters to [prometheus_metrics.py](file:///e:/TaskSyncEnterprise/backend/app/monitoring/prometheus_metrics.py):

| Metric Name | Type | Labels | Description |
|---|---|---|---|
| `app_exceptions_total` | Counter | `exception_type`, `path` | Cumulative count of unhandled or mapped application exceptions. |
| `validation_errors_total` | Counter | `path` | Cumulative count of Pydantic and request validation failures. |
| `auth_errors_total` | Counter | `error_type`, `path` | Cumulative count of authentication or authorization errors (`error_type=authentication` or `error_type=authorization`). |
| `timeout_errors_total` | Counter | `error_type`, `path` | Cumulative count of timeout-related errors (e.g. socket, asyncio, or DB timeouts). |

### Non-Intrusive Instrumentation Hooking
Rather than scattering metrics increment logic across functional endpoint handlers, we hooked the metrics updates directly into [exception_handler.py](file:///e:/TaskSyncEnterprise/backend/app/handlers/exception_handler.py):
- Hitting unhandled or mapped exceptions automatically updates `app_exceptions_total`.
- The mapper determines if the exception matches `ValidationException` (or standard Pydantic validation errors) and increments `validation_errors_total`.
- Mappings to `AuthenticationException` or `AuthorizationException` increment `auth_errors_total`.
- Class-level matching for `asyncio.TimeoutError`, `TimeoutError`, or exceptions containing `"timeout"` increments `timeout_errors_total`.

### Metrics Path Exclusions
To maintain strict test isolation and prevent noise, system diagnostics routes are excluded from exceptions telemetry metrics matching the HTTP middleware rules:
```python
excluded_paths = ["/metrics", "/docs", "/redoc", "/openapi.json"]
```

---

## 3. Visual Layouts & Panel Design

Both dashboards share standard global variables (`datasource`, `environment`, `job`, `instance`, `interval`, `rate_interval`) and feature dynamic header drop-down links for switching contexts.

### A. API Overview Panel Specifications

- **Overall API Performance Row:**
  - **HTTP Requests/sec (Stat):** Current aggregate request rate.
  - **Total Requests (Stat):** Cumulative processed requests since boot.
  - **Active Requests (Stat):** In-progress requests.
  - **Average Latency (Stat):** System-wide average response time.
- **Traffic & Volumetric Row:**
  - **Request Rate Trend (Timeseries):** Rates of requests split by API paths.
  - **Requests by Method (Bar Gauge):** Volumetric distribution (GET, POST, PUT, DELETE).
  - **Requests by Status Code (Bar Gauge):** Status response distributions (2xx, 3xx, 4xx, 5xx).
  - **Top Endpoints (Bar Gauge):** Endpoint throughput ordered by volume.
- **Latency & Response Times Row:**
  - **Response Time Trend (Timeseries):** Average execution time per endpoint path.
  - **Latency Percentiles (Timeseries):** `p50`, `p95`, and `p99` response percentiles.
  - **Slowest Endpoints (Bar Gauge):** Routes sorted by highest average response latency.

### B. Error Overview Panel Specifications

- **Overall Error Status Row:**
  - **Total HTTP Errors (Stat):** Cumulative count of 4xx and 5xx response codes.
  - **HTTP Error Percentage (Stat):** The ratio of failed HTTP requests to total requests.
  - **Unhandled Exceptions (Stat):** Total system exceptions.
  - **Validation Failures (Stat):** User payload input errors.
  - **Authentication Failures (Stat):** Access attempt errors.
  - **Timeout Errors (Stat):** Process timeouts.
- **Error Trends Row:**
  - **HTTP Error Rates Trend (Timeseries):** Splitting client errors (4xx) and server errors (5xx).
  - **Exception Occurrence Trend (Timeseries):** Exception frequencies by class name.
- **Breakdowns Row:**
  - **Top Failing Endpoints (Bar Gauge):** Paths causing the most errors.
  - **Top Exception Types (Bar Gauge):** Most frequent exception classes.

---

## 4. Executive Dashboard Drill-Down Integration

We updated the Executive Dashboard (`monitoring/grafana/dashboards/Executive/executive-overview.json`) by converting card elements into direct drill-downs:
- **HTTP Success Ratio card** links directly to **Error Overview** passing environmental state variables.
- **API p95 Latency card** links directly to **API Overview** passing variables.
- Cleaned up legacy duplicated paths to ensure relative URLs resolve correctly.

---

## 5. Verification & Test Suite Runs

1. **Dashboard Validation:** Checked all JSON configurations for schema validity and dynamic variable consistency.
2. **Backend Unit Testing:** Executed the pytest runner:
   - **Command:** `python -m pytest tests/`
   - **Result:** **180/180 passed successfully**. This guarantees exception hooks and metrics counters do not introduce regressions on FastAPI routes.
3. **Alembic Check:** Validated database schema migrations consistency.

---

## 6. Screenshots Placeholders

Below are placeholders to record visualizations in the target environment:

### API Overview Dashboard
```
[==============================================================================]
[                      TaskSyncEnterprise - API Overview                       ]
[==============================================================================]
[ Requests/sec: 4.2 pps  | Total Requests: 1.2k | Avg Latency: 0.12s            ]
[------------------------------------------------------------------------------]
[ Request Rate by Path (Timeseries)       | Top Endpoints (Bar Gauge)          ]
[ /api/v1/tasks ~~~~~~~~~~~~~~~~~~~       | /api/v1/tasks   ================== ]
[ /api/v1/auth  ~~~~~~~~~~~~~~~~~~~       | /api/v1/auth    ==========         ]
[------------------------------------------------------------------------------]
[ Latency Percentiles (p50, p95, p99)     | Slowest Endpoints (Bar Gauge)      ]
[ p99 -------------------                 | /api/v1/reports ================== ]
[ p95 ---------                           | /api/v1/tasks   ====               ]
[==============================================================================]
```

### Error Overview Dashboard
```
[==============================================================================]
[                     TaskSyncEnterprise - Error Overview                      ]
[==============================================================================]
[ Total Errors: 12      | Error %: 1.02%       | Exceptions: 2                 ]
[ Validation: 8         | Auth Failures: 3     | Timeouts: 1                   ]
[------------------------------------------------------------------------------]
[ HTTP Error Rates (4xx vs 5xx Trend)     | Top Failing Routes (Bar Gauge)     ]
[ 4xx ~~~~~~~~~~~~~~~~~~~~~~~~~~          | /api/v1/auth/login  ============== ]
[ 5xx ~~~~~~                              | /api/v1/tasks       ===            ]
[==============================================================================]
```
