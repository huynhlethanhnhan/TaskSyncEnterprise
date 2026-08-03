#!/bin/sh
set -e

echo "[ENTRYPOINT] TaskSyncEnterprise Backend Container Starting..."

# Wait for an authenticated SQL Server connection and bootstrap the database.
MSSQL_HOST="${MSSQL_HOST:-sqlserver}"
MSSQL_PORT="${MSSQL_PORT:-1433}"

echo "[ENTRYPOINT] Waiting for SQL Server at ${MSSQL_HOST}:${MSSQL_PORT}..."

python - <<'PY'
import os
import re
import sys
import time

import pymssql

host = os.environ.get('MSSQL_HOST', 'sqlserver')
port = int(os.environ.get('MSSQL_PORT', '1433'))
user = os.environ.get('MSSQL_USER', 'sa')
password = os.environ.get('MSSQL_PASSWORD') or os.environ.get('MSSQL_SA_PASSWORD')
database = os.environ.get('MSSQL_DATABASE', 'TaskSyncEnterprise')

if not password:
    print('[ENTRYPOINT] ERROR: MSSQL password is required.', file=sys.stderr)
    sys.exit(1)
if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', database):
    print('[ENTRYPOINT] ERROR: MSSQL_DATABASE contains unsupported characters.', file=sys.stderr)
    sys.exit(1)

max_retries = 60
for i in range(1, max_retries + 1):
    try:
        connection = pymssql.connect(
            server=host,
            port=port,
            user=user,
            password=password,
            database='master',
            login_timeout=3,
            autocommit=True,
        )
        cursor = connection.cursor()
        cursor.execute('SELECT DB_ID(%s)', (database,))
        if cursor.fetchone()[0] is None:
            cursor.execute(f'CREATE DATABASE [{database}]')
            print(f'[ENTRYPOINT] Created database {database}.')
        connection.close()
        print(f'[ENTRYPOINT] SQL Server login and database {database} are ready!')
        sys.exit(0)
    except Exception as exc:
        if i % 5 == 0 or i == max_retries:
            print(f'[ENTRYPOINT] Waiting for SQL Server ({i}/{max_retries})... ({exc})')
        time.sleep(2)

print('[ENTRYPOINT] ERROR: Timed out waiting for SQL Server!', file=sys.stderr)
sys.exit(1)
PY

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
