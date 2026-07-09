# Phase 3.1: Health Checks & Runtime Diagnostics (P3-INF-004)

## Overview
This document explains the health checks and monitoring architecture of the TaskSyncEnterprise backend. It discusses the differences between liveness and readiness probes, modular dependency check patterns, and the integration of lightweight telemetry metrics to prepare the application for Kubernetes, Docker, and cloud deployments.

---

## Learning Objectives
By the end of this guide, you will be able to:
1. Differentiate between Liveness and Readiness probes.
2. Structure custom, modular checkers for dependencies.
3. Configure connection timeouts for SRE checks.
4. Implement metrics tracking for application uptime and requests.

---

## Concepts Explained

### 1. Liveness vs. Readiness Probes
In production container environments (like Kubernetes or AWS ECS):
- **Liveness Probe**: Asks, "*Is the application alive?*" If the liveness check fails (e.g. because of a deadlock), the orchestrator restarts the container. This check should be fast and avoid external calls like database queries.
- **Readiness Probe**: Asks, "*Is the application ready to handle user requests?*" If the readiness check fails (e.g., due to database connectivity issues), the load balancer stops routing traffic to the container. The container is *not* restarted; traffic is simply redirected until the dependency recovers.

### 2. Metrics Telemetry
Telemetry metrics track the health of an active service, measuring properties such as request counts, startup durations, and health check latencies. Collecting these metrics helps operators set up alerts before service degradation occurs.

---

## Why this Architecture was Chosen
- **Zero-Downtime Deployments**: By separating liveness and readiness probes, load balancers can route traffic away from degrading nodes without trigger-happy restarts.
- **Isolated Pings**: Checks are executed with short timeouts to prevent the health check itself from hanging the application process.
- **Self-Healing Infrastructure**: Orchestrators use liveness probes to recover from application deadlocks automatically.

---

## Project Implementation
In `backend/app/services/health_service.py`, health checks are structured as modular components:

```python
class DatabaseHealthChecker(HealthChecker):
    def name(self) -> str:
        return "database"

    def check(self) -> tuple[bool, str]:
        # Connects with short timeout limit to prevent hanging threads
        val_engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            connect_args={"login_timeout": settings.HEALTH_TIMEOUT}
        )
        try:
            with val_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True, "Database is healthy."
        except Exception as e:
            return False, str(e)
```

In `backend/app/routers/v1/health.py`, status codes map directly to check results:

```python
@router.get("/ready")
def readiness_check(response: Response):
    is_ready, report = health_service.get_readiness_status()
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return report
```

---

## Real-world Examples
In a cloud auto-scaling group, as traffic spikes, new virtual machines are initialized. The load balancer polls `/health/ready` every 5 seconds. The database migration script takes 30 seconds to finish. During this time, `/health/ready` returns `503`, preventing users from hitting the uninitialized container. Once migration succeeds, the probe returns `200`, and the load balancer begins routing user requests.

---

## Best Practices
- **Do Not Poll DB in Liveness Probes**: Liveness checks should be lightweight. Poll the database only in readiness probes.
- **Enforce Connection Timeouts**: Set short timeouts on pings to avoid locking the application thread pool.
- **Include Correlation IDs**: Log correlation IDs in check failures to aid troubleshooting.

---

## Common Mistakes
- **Database in Liveness**: Checking database health inside `/health/live`. If the database lags temporarily, the orchestrator will restart all container instances simultaneously, causing a complete system outage.

---

## Interview Questions
1. **What happens if a readiness probe returns a 503 status code in Kubernetes?**
   *Answer*: Kubernetes removes the container's IP from the corresponding Service endpoints, preventing the load balancer from routing new traffic to it. The container continues running.
2. **Why do we use timeouts on database health checks?**
   *Answer*: If database connectivity is blocked by a firewall, a check without a timeout might block the network thread indefinitely, exhausting server resources.

---

## References
- [Kubernetes Liveness, Readiness and Startups Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [FastAPI: Response Status Codes](https://fastapi.tiangolo.com/tutorial/response-status-code/)
