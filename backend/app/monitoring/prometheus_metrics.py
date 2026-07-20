# 📂 FILE: app/monitoring/prometheus_metrics.py
import time
import os
import threading
from prometheus_client import Counter, Histogram, Gauge

from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.task import Task
from app.models.project import Project
from app.models.employee import Employee


class PrometheusMetrics:
    """Manager for all Prometheus metrics collection in TaskSyncEnterprise."""

    def __init__(self):
        self._lock = threading.Lock()

        # 1. HTTP Metrics
        self.http_requests_total = Counter(
            "http_requests_total",
            "Total number of HTTP requests processed",
            ["method", "path", "status_code"],
        )
        self.http_responses_total = Counter(
            "http_responses_total",
            "Total number of HTTP responses returned",
            ["method", "path", "status_code"],
        )
        self.http_request_duration = Histogram(
            "http_request_duration_seconds",
            "HTTP request latency duration in seconds",
            ["method", "path"],
        )
        self.requests_in_progress = Gauge(
            "http_requests_in_progress",
            "Current number of HTTP requests in progress",
            ["method", "path"],
        )

        # 2. Application Uptime Metrics
        self.startup_timestamp = Gauge(
            "app_startup_timestamp_seconds",
            "Application startup timestamp in seconds since epoch",
        )
        self.app_uptime = Gauge(
            "app_uptime_seconds", "Application uptime duration in seconds"
        )
        self.app_running_time = Gauge(
            "app_running_time_seconds",
            "Total running time of the application in seconds",
        )

        # Initialize startup time
        startup_time = time.time()
        self.startup_timestamp.set(startup_time)
        self._startup_time = startup_time

        # 3. Database Metrics
        self.db_requests_total = Counter(
            "db_requests_total", "Total database requests executed", ["statement_type"]
        )
        self.db_queries_successful = Counter(
            "db_queries_successful_total", "Total successful database queries executed"
        )
        self.db_queries_failed = Counter(
            "db_queries_failed_total",
            "Total failed database queries executed",
            ["error_type"],
        )
        self.db_query_duration = Histogram(
            "db_query_duration_seconds",
            "Database query execution latency in seconds",
            ["statement_type"],
        )

        # 4. Redis Metrics
        self.redis_requests_total = Counter(
            "redis_requests_total",
            "Total number of Redis requests executed",
            ["command"],
        )
        self.redis_failures_total = Counter(
            "redis_failures_total",
            "Total number of Redis query failures",
            ["command", "error_type"],
        )
        self.redis_query_duration = Histogram(
            "redis_query_duration_seconds",
            "Redis query execution latency in seconds",
            ["command"],
        )

        # 5. Custom Business Metrics
        self.tasks_created_total = Gauge(
            "tasks_created_total", "Total number of active tasks in the database"
        )
        self.projects_created_total = Gauge(
            "projects_created_total", "Total number of active projects in the database"
        )
        self.active_users_total = Gauge(
            "active_users_total", "Total number of active employees in the database"
        )

        # 6. System Metrics
        self.system_cpu_usage = Gauge(
            "system_cpu_usage_ratio", "System CPU usage ratio"
        )
        self.system_memory_usage = Gauge(
            "system_memory_usage_bytes", "System memory usage in bytes"
        )

        # 7. Application Error & Exception Metrics
        self.app_exceptions_total = Counter(
            "app_exceptions_total",
            "Total number of application exceptions",
            ["exception_type", "path"],
        )
        self.validation_errors_total = Counter(
            "validation_errors_total",
            "Total number of request validation errors",
            ["path"],
        )
        self.auth_errors_total = Counter(
            "auth_errors_total",
            "Total number of authentication/authorization errors",
            ["error_type", "path"],
        )
        self.timeout_errors_total = Counter(
            "timeout_errors_total",
            "Total number of timeout errors",
            ["error_type", "path"],
        )

    def update_system_metrics(self) -> None:
        """Collects operating system CPU and memory metrics."""
        try:
            import psutil

            # CPU and Memory
            self.system_cpu_usage.set(psutil.cpu_percent(interval=None) / 100.0)
            self.system_memory_usage.set(psutil.virtual_memory().used)
        except Exception:
            pass

    def update_business_metrics(self, db: Session) -> None:
        """Queries the repository/service layer to populate custom business metrics."""
        with self._lock:
            try:
                # Query counts from DB
                tasks_count = (
                    db.execute(
                        select(func.count(Task.id)).where(Task.is_deleted == False)
                    ).scalar()
                    or 0
                )
                projects_count = (
                    db.execute(
                        select(func.count(Project.id)).where(
                            Project.is_deleted == False
                        )
                    ).scalar()
                    or 0
                )
                employees_count = (
                    db.execute(
                        select(func.count(Employee.id)).where(
                            Employee.is_deleted == False
                        )
                    ).scalar()
                    or 0
                )

                self.tasks_created_total.set(tasks_count)
                self.projects_created_total.set(projects_count)
                self.active_users_total.set(employees_count)
            except Exception as e:
                from app.core.logger import error_logger

                error_logger.error(f"Failed to update business metrics: {e}")

            # Update uptime and running time
            uptime = time.time() - self._startup_time
            self.app_uptime.set(uptime)
            self.app_running_time.set(uptime)

            # Update system metrics (cpu/memory)
            self.update_system_metrics()


# Global Prometheus metrics collector instance
prometheus_metrics = PrometheusMetrics()
