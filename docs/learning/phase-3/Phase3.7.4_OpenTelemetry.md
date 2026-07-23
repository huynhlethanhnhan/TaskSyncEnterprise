# Phase 3.7.4: OpenTelemetry Integration

## Purpose

TaskSyncEnterprise uses OpenTelemetry to provide distributed traces for inbound
FastAPI requests, SQLAlchemy queries, Redis commands, and outbound HTTPX calls.
Tracing is optional and does not change application behavior when disabled.

## Architecture

`app.tracing.config` owns the global `TracerProvider`, Resource, sampler,
exporter, logging bridge, and provider shutdown. `app.tracing.instrumentation`
owns idempotent auto-instrumentation. `app.logging.context` reads the active
span and the Phase 3.7.3 structured formatter writes `trace_id` and `span_id`
alongside request and correlation identifiers.

The public package API is intentionally limited to `setup_tracing`,
`instrument_app`, and `get_tracer`.

## Startup Flow

The application startup sequence is:

1. Load settings and run `run_startup()` validation.
2. Call `setup_tracing()` exactly once.
3. Create `FastAPI`.
4. Call `instrument_app(app)`.
5. Register middleware and routers.

On FastAPI lifespan shutdown, `run_shutdown()` force-flushes and shuts down the
SDK provider before process logging is shut down. No-op providers are left
alone.

## Tracer Provider and Resource

The SDK provider uses a `BatchSpanProcessor` and a Resource containing:

- `service.name` from `OTEL_SERVICE_NAME`
- `service.version` (`1.0.0`)
- `service.namespace` (`TaskSyncEnterprise`)
- `deployment.environment` from `OTEL_ENVIRONMENT`
- OpenTelemetry SDK name and language attributes

`ENABLE_TRACING=false` and `OTEL_EXPORTER_TYPE=none` install a
`NoOpTracerProvider`, so callers can keep using `get_tracer()` with minimal
overhead and no exports.

## Sampling

`OTEL_SAMPLING_RATE` is validated from `0.0` through `1.0`.

- `0.0`: always off
- `0.0 < rate < 1.0`: parent-based trace ID ratio sampling
- `1.0`: always on

## Exporters

Development defaults to `console`, which emits spans locally.

- `console`: local `ConsoleSpanExporter`
- `otlp_http`: OTLP HTTP; `/v1/traces` is appended once when absent
- `otlp_grpc`: OTLP gRPC; development may use insecure transport, while
  production defaults to TLS
- `none`: discard spans through the no-op provider

Production should use an OTLP collector endpoint and TLS. For gRPC, use a
collector host and port such as `otel-collector.example:4317`; for HTTP, use an
HTTPS collector base URL such as `https://otel-collector.example:4318`.

Example Docker environment configuration:

```yaml
environment:
  - ENABLE_TRACING=true
  - OTEL_SERVICE_NAME=TaskSyncEnterprise
  - OTEL_ENVIRONMENT=production
  - OTEL_EXPORTER_TYPE=otlp_http
  - OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example:4318
  - OTEL_SAMPLING_RATE=0.25
```

Do not put collector credentials in compose files. Provide credentials through
the deployment secret mechanism supported by the target platform.

## Instrumentation

FastAPI, SQLAlchemy, Redis, and HTTPX are instrumented once per process. Module
guards prevent repeated instrumentation during ordinary startup or hot reload.
SQLAlchemy instruments the application engine and does not add trace context to
SQL comments. Request instrumentation captures only request/correlation IDs and
User-Agent; it does not capture Authorization, cookies, Redis keys, or response
secrets.

## Excluded Paths

The default exclusions cover `/metrics`, `/health`, `/health/live`,
`/health/ready`, `/health/details`, `/docs`, `/redoc`, and `/openapi.json`.
The generated regex configuration supports optional trailing slashes, query
strings, and URL prefixes.

## Logging Bridge

No logging middleware or formatter is added by tracing. The existing structured
formatter obtains the active span from `app.logging.context`, so `trace_id` and
`span_id` coexist with `request_id` and `correlation_id`. When no span is
active, both trace fields are `null` in JSON logs.

## Development

Use the default console exporter and full sampling for local inspection. If
noise is excessive, reduce `OTEL_SAMPLING_RATE`; keep health and metrics paths
excluded.

## Production

Use an authenticated OTLP collector, TLS, a conservative sampling rate, and a
network policy that restricts egress to the collector. Monitor batch processor
queue pressure and collector availability. Review custom span attributes before
adding user or business data.

## Troubleshooting

- No spans: verify `ENABLE_TRACING`, exporter type, endpoint reachability, and
  collector TLS configuration.
- Logs have null trace IDs: verify the log was written while an active request
  or manual span existed.
- Repeated spans: confirm there is only one application process startup path
  and do not call `instrument_app()` from routers or request middleware.
- Missing exports on shutdown: ensure the FastAPI lifespan completes so
  `run_shutdown()` can flush the provider.

## Testing

Run from `backend` using the project interpreter:

```powershell
python -m pytest tests/test_tracing.py -q
python -m pytest tests/test_health.py tests/test_metrics.py tests/test_structured_logging.py tests/test_logging_e2e.py -q
python -m pytest -q
python -m compileall app
```

The tracing suite does not require a live collector. It covers provider setup,
NoOp mode, console mode, sampling, logging fields, exclusions, instrumentation
idempotency, reset helpers, and shutdown flushing.

## Known Limitations

The current version does not configure collector authentication headers or
certificate paths directly. Supply those through deployment-level OpenTelemetry
configuration or extend the settings only when the deployment contract requires
it.
