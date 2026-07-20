# 📂 FILE: app/monitoring/metrics.py
import threading
import time
from typing import Dict, Any


class PerformanceMetrics:
    """Thread-safe statistics collector for request latencies and error counters."""

    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.response_durations = []
        self._lock = threading.Lock()
        self.startup_timestamp = time.time()

    def record_request(self, duration: float, is_error: bool = False) -> None:
        """Atomically records request metrics and keeps bounds on durations history size."""
        with self._lock:
            self.request_count += 1
            if is_error:
                self.error_count += 1
            self.response_durations.append(duration)
            # Limit memory size to last 1000 requests
            if len(self.response_durations) > 1000:
                self.response_durations.pop(0)

    def get_metrics_report(self) -> Dict[str, Any]:
        """Summarizes request telemetry stats including min/max/average processing times."""
        with self._lock:
            durations = self.response_durations
            count = len(durations)
            avg_time = sum(durations) / count if count > 0 else 0.0
            max_time = max(durations) if count > 0 else 0.0
            min_time = min(durations) if count > 0 else 0.0
            uptime = time.time() - self.startup_timestamp

            return {
                "request_count": self.request_count,
                "error_count": self.error_count,
                "avg_response_time_seconds": round(avg_time, 4),
                "max_response_time_seconds": round(max_time, 4),
                "min_response_time_seconds": round(min_time, 4),
                "uptime_seconds": round(uptime, 2),
            }


# Global metrics collector instance
metrics = PerformanceMetrics()
