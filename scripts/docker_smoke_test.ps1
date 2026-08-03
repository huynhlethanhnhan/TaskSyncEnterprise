# ==============================================================================
# TaskSyncEnterprise Docker Container Integration & Smoke Test Script
# ==============================================================================
# Verifies container build, database Alembic migration boot flow, backend live
# health check, and frontend static asset HTTP delivery.
# ==============================================================================

$ErrorActionPreference = "Stop"
$composeArgs = @("--project-name", "tasksync-smoke", "-f", "docker-compose.yml")

# Keep smoke containers isolated from local MSSQL, Redis, and development servers.
$env:SECRET_KEY = "smoke-test-secret-key-at-least-32-chars-long"
$env:MSSQL_SA_PASSWORD = "TaskSync@2026SmokeTestPassword!"
$env:RUN_DEMO_SEED = "false"
$env:ALLOW_DESTRUCTIVE_RESET = "false"
$env:MSSQL_HOST_PORT = "11433"
$env:REDIS_HOST_PORT = "16379"
$env:BACKEND_HOST_PORT = "18000"
$env:FRONTEND_HOST_PORT = "18080"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " STARTING DOCKER CONTAINER SMOKE TEST PIPELINE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Step 1: Validate Compose File Syntax
Write-Host "`n[1/5] Validating docker-compose.yml syntax..." -ForegroundColor Yellow
docker compose @composeArgs config --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Error "[FAIL] Docker compose configuration syntax validation failed."
    exit 1
}
Write-Host "[OK] Compose file syntax is valid." -ForegroundColor Green

# Step 2: Build Container Stack
Write-Host "`n[2/5] Building backend and frontend container images..." -ForegroundColor Yellow
docker compose @composeArgs build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[FAIL] Docker compose build failed."
    exit 1
}
Write-Host "[OK] Container image build completed." -ForegroundColor Green

# Step 3: Launch Services Stack
Write-Host "`n[3/5] Launching container services in background..." -ForegroundColor Yellow
try {
    docker compose @composeArgs up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[CONTAINER STATUS]" -ForegroundColor Red
        docker compose @composeArgs ps --all
        Write-Host "`n[CONTAINER LOGS - BACKEND]" -ForegroundColor Red
        docker compose @composeArgs logs backend --tail 100
        throw "[FAIL] Failed to start container stack."
    }

    # Step 4: Poll Service Health
    Write-Host "`n[4/5] Polling service health checks (up to 180 seconds)..." -ForegroundColor Yellow
    $maxAttempts = 60
    $backendHealthy = $false
    $frontendHealthy = $false

    for ($i = 1; $i -le $maxAttempts; $i++) {
        Start-Sleep -Seconds 3

        # Check Backend Live Health Endpoint
        try {
            $backendRes = Invoke-WebRequest -Uri "http://localhost:$($env:BACKEND_HOST_PORT)/health/live" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($backendRes.StatusCode -eq 200) {
                $backendHealthy = $true
            }
        } catch {}

        # Check Frontend Health Endpoint
        try {
            $frontendRes = Invoke-WebRequest -Uri "http://localhost:$($env:FRONTEND_HOST_PORT)/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($frontendRes.StatusCode -eq 200) {
                $frontendHealthy = $true
            }
        } catch {}

        if ($backendHealthy -and $frontendHealthy) {
            Write-Host "[OK] Backend health check: 200 OK (Attempt $i)" -ForegroundColor Green
            Write-Host "[OK] Frontend health check: 200 OK (Attempt $i)" -ForegroundColor Green
            break
        } else {
            Write-Host "Waiting for containers to initialize... ($i/$maxAttempts)" -ForegroundColor Gray
        }
    }

    if (-not ($backendHealthy -and $frontendHealthy)) {
        Write-Host "`n[CONTAINER LOGS - BACKEND]" -ForegroundColor Red
        docker compose @composeArgs logs backend --tail 50
        Write-Host "`n[CONTAINER LOGS - SQLSERVER]" -ForegroundColor Red
        docker compose @composeArgs logs sqlserver --tail 50
        Write-Error "[FAIL] Containers failed to achieve healthy status within timeout."
        exit 1
    }

    Write-Host "`n[5/5] Verifying Alembic Database Migration State..." -ForegroundColor Yellow
    docker compose @composeArgs exec -T backend alembic current
    if ($LASTEXITCODE -ne 0) {
        throw "[FAIL] Alembic could not read the current database migration state."
    }
    Write-Host "[OK] Alembic migration state is readable inside the backend container." -ForegroundColor Green

    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host " DOCKER CONTAINER SMOKE TEST PASSED SUCCESSFULLY!" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

} finally {
    Write-Host "`nShutting down smoke test container stack..." -ForegroundColor Yellow
    docker compose @composeArgs down --volumes --remove-orphans
    Write-Host "[OK] Smoke test cleanup complete." -ForegroundColor Green
}
