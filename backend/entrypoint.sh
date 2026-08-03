#!/bin/sh
set -e

echo "[ENTRYPOINT] TaskSyncEnterprise Backend Container Starting..."

# Wait for SQL Server port readiness
MSSQL_HOST="${MSSQL_HOST:-sqlserver}"
MSSQL_PORT="${MSSQL_PORT:-1433}"

echo "[ENTRYPOINT] Waiting for SQL Server at ${MSSQL_HOST}:${MSSQL_PORT}..."

python -c "
import socket
import time
import sys
import os

host = os.environ.get('MSSQL_HOST', 'sqlserver')
port = int(os.environ.get('MSSQL_PORT', '1433'))

max_retries = 60
for i in range(1, max_retries + 1):
    try:
        with socket.create_connection((host, port), timeout=3):
            print(f'[ENTRYPOINT] SQL Server host {host}:{port} is reachable!')
            sys.exit(0)
    except Exception as exc:
        if i % 5 == 0 or i == max_retries:
            print(f'[ENTRYPOINT] Waiting for SQL Server ({i}/{max_retries})... ({exc})')
        time.sleep(2)

print('[ENTRYPOINT] ERROR: Timed out waiting for SQL Server!', file=sys.stderr)
sys.exit(1)
"

echo "[ENTRYPOINT] Executing Alembic database migrations (upgrade head)..."
python -m alembic upgrade head
echo "[ENTRYPOINT] Database migration complete."

RUN_SEED="$(echo "${RUN_DEMO_SEED:-false}" | tr '[:upper:]' '[:lower:]')"
if [ "$RUN_SEED" = "true" ] || [ "$RUN_SEED" = "1" ] || [ "$RUN_SEED" = "yes" ]; then
    echo "[ENTRYPOINT] RUN_DEMO_SEED=${RUN_DEMO_SEED} enabled. Executing seed dataset runner..."
    python -m app.seeds.seed_runner --seed || echo "[ENTRYPOINT] WARNING: Seed runner encountered an issue or data already present."
else
    echo "[ENTRYPOINT] RUN_DEMO_SEED is disabled. Skipping database seed."
fi

echo "[ENTRYPOINT] Starting FastAPI Uvicorn Application..."
exec "$@"
