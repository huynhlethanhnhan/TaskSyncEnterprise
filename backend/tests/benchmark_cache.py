# 📂 FILE: backend/tests/benchmark_cache.py
import sys
import os
import time
from fastapi.testclient import TestClient
from sqlalchemy import event

# Adjust path to find app package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal, engine
from app.models.employee import Employee
from app.models.department import Department
from app.models.project import Project
from app.models.task import Task
from app.cache import RedisClient, cache_service

# Track SQL statements executed by SQLAlchemy
sql_query_count = 0

@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    global sql_query_count
    sql_query_count += 1


def reset_sql_query_count():
    global sql_query_count
    sql_query_count = 0


def get_sql_query_count():
    global sql_query_count
    return sql_query_count


# Fetch mock entities for dynamic path parameters
db = SessionLocal()
admin_user = db.query(Employee).filter(Employee.role_id == 1).first()
if not admin_user:
    admin_user = db.query(Employee).first()

employee_id = db.query(Employee.id).first()[0]
department_id = db.query(Department.id).first()[0]
project_id = db.query(Project.id).first()[0]
task_id = db.query(Task.id).first()[0]
db.close()

# Mock FastAPI user dependency override
app.dependency_overrides[app.dependency_overrides.get(Employee, lambda: admin_user)] = lambda: admin_user
from app.core.deps import get_current_user
app.dependency_overrides[get_current_user] = lambda: admin_user

client = TestClient(app)


def flush_redis():
    """Flushes the local Redis cache."""
    try:
        r_client = RedisClient().client
        r_client.flushdb()
        return True
    except Exception as e:
        print(f"Failed to flush Redis: {e}")
        return False


def run_benchmarks():
    print("==========================================================")
    print("STARTING TASK_SYNC_ENTERPRISE CACHE PERFORMANCE BENCHMARK")
    print("==========================================================\n")

    endpoints = [
        {"name": "Dashboard Overview", "path": "/api/v1/dashboard/overview"},
        {"name": "Dashboard Analytics", "path": "/api/v1/dashboard/analytics"},
        {"name": "Employee List", "path": "/api/v1/employees"},
        {"name": "Employee Details", "path": f"/api/v1/employees/{employee_id}"},
        {"name": "Department List", "path": "/api/v1/departments"},
        {"name": "Department Details", "path": f"/api/v1/departments/{department_id}"},
        {"name": "Project List", "path": "/api/v1/projects"},
        {"name": "Project Details", "path": f"/api/v1/projects/{project_id}"},
        {"name": "Task List", "path": "/api/v1/tasks"},
        {"name": "Task Details", "path": f"/api/v1/tasks/{task_id}"},
        {"name": "Roles List", "path": "/api/v1/roles"},
    ]

    report = []
    
    for ep in endpoints:
        name = ep["name"]
        path = ep["path"]
        
        print(f"Benchmarking {name} ({path})...")
        
        # --- 1. COLD CACHE ---
        flush_redis()
        reset_sql_query_count()
        
        t0 = time.perf_counter()
        res_cold = client.get(path)
        cold_time = (time.perf_counter() - t0) * 1000
        cold_sql = get_sql_query_count()
        
        assert res_cold.status_code == 200, f"Cold request failed: {res_cold.status_code}"
        
        # --- 2. WARM CACHE (Repeated Latency Stats) ---
        warm_latencies = []
        warm_sqls = []
        
        # Warm run to populate and record multiple requests
        for _ in range(50):
            reset_sql_query_count()
            t0 = time.perf_counter()
            res_warm = client.get(path)
            warm_time = (time.perf_counter() - t0) * 1000
            
            warm_latencies.append(warm_time)
            warm_sqls.append(get_sql_query_count())
            
            assert res_warm.status_code == 200
        
        # Compute Stats in Pure Python
        sorted_warm = sorted(warm_latencies)
        n = len(sorted_warm)
        
        avg_warm = sum(warm_latencies) / n
        min_warm = sorted_warm[0]
        max_warm = sorted_warm[-1]
        median_warm = sorted_warm[n // 2]
        p95_warm = sorted_warm[int(n * 0.95)]
        p99_warm = sorted_warm[int(n * 0.99)]
        warm_sql = int(sum(warm_sqls) / len(warm_sqls))
        
        # Verification: Check that data is identical
        cold_data = res_cold.json()
        warm_data = res_warm.json()
        data_match = "YES" if cold_data == warm_data else "NO"
        
        # Speedup Ratio
        speedup = cold_time / avg_warm if avg_warm > 0 else 0
        
        # Calculate stats for reporting
        ep_stats = {
            "name": name,
            "path": path,
            "cold_time": cold_time,
            "cold_sql": cold_sql,
            "avg_warm": avg_warm,
            "min_warm": min_warm,
            "max_warm": max_warm,
            "median_warm": median_warm,
            "p95_warm": p95_warm,
            "p99_warm": p99_warm,
            "warm_sql": warm_sql,
            "data_match": data_match,
            "speedup": speedup
        }
        report.append(ep_stats)
        print(f"  -> Cold: {cold_time:.2f}ms (SQL queries: {cold_sql})")
        print(f"  -> Warm Avg: {avg_warm:.2f}ms (SQL queries: {warm_sql}) [Speedup: {speedup:.1f}x]")

    # --- 3. REDIS OUTAGE SIMULATION ---
    print("\nSimulating Redis Outage (Bypass / Fail-Silent)...")
    # We patch RedisClient to raise connection errors to force DB fallback
    from unittest.mock import patch, MagicMock, PropertyMock
    outage_report = []
    
    with patch("app.cache.redis_client.RedisClient.client", new_callable=PropertyMock) as mock_client_prop:
        mock_client = MagicMock()
        mock_client.get.side_effect = Exception("Connection Refused")
        mock_client.set.side_effect = Exception("Connection Refused")
        mock_client.setex.side_effect = Exception("Connection Refused")
        mock_client.ping.side_effect = Exception("Connection Refused")
        mock_client_prop.return_value = mock_client
        
        for ep in endpoints:
            reset_sql_query_count()
            t0 = time.perf_counter()
            res_fallback = client.get(ep["path"])
            fallback_time = (time.perf_counter() - t0) * 1000
            fallback_sql = get_sql_query_count()
            
            assert res_fallback.status_code == 200, f"Fallback failed: {res_fallback.status_code}"
            
            outage_report.append({
                "name": ep["name"],
                "fallback_time": fallback_time,
                "fallback_sql": fallback_sql
            })
            print(f"  -> {ep['name']}: {fallback_time:.2f}ms (SQL queries: {fallback_sql}) [FALLBACK SUCCESS]")

    # Redis info memory
    redis_mem = "N/A"
    try:
        r_client = RedisClient().client
        info = r_client.info("memory")
        redis_mem = info.get("used_memory_human", "N/A")
    except Exception:
        pass

    # --- 4. PRINT REPORT ---
    print("\n==========================================================")
    print("FINAL BENCHMARK PERFORMANCE REPORT")
    print("==========================================================\n")
    
    print(f"Redis Used Memory: {redis_mem}\n")
    
    # Markdown Table Output
    print("| Endpoint | Cold Cache (ms) | SQL (Cold) | Warm Cache (ms) | SQL (Warm) | P95 (ms) | Speedup | Data Match |")
    print("| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")
    for r in report:
        print(f"| {r['name']} | {r['cold_time']:.2f} | {r['cold_sql']} | {r['avg_warm']:.2f} | {r['warm_sql']} | {r['p95_warm']:.2f} | {r['speedup']:.1f}x | {r['data_match']} |")
        
    print("\n### Redis Outage Fallback Metrics")
    print("| Endpoint | Fallback Time (ms) | Fallback SQL Queries | Status |")
    print("| :--- | :---: | :---: | :---: |")
    for o in outage_report:
        print(f"| {o['name']} | {o['fallback_time']:.2f} | {o['fallback_sql']} | Bypassed / UP |")


if __name__ == "__main__":
    run_benchmarks()
