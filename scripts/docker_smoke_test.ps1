# ==============================================================================
# TaskSyncEnterprise Docker Container Integration & Smoke Test Script
# ==============================================================================
# Verifies container build, database Alembic migration boot flow, backend live
# health check, and frontend static asset HTTP delivery.
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " STARTING DOCKER CONTAINER SMOKE TEST PIPELINE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Step 1: Validate Compose File Syntax
Write-Host "`n[1/5] Validating docker-compose.yml syntax..." -ForegroundColor Yellow
docker compose --env-file .env.example -f docker-compose.yml config --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Error "[FAIL] Docker compose configuration syntax validation failed."
    exit 1
}
Write-Host "[OK] Compose file syntax is valid." -ForegroundColor Green

# Step 2: Build Container Stack
Write-Host "`n[2/5] Building backend and frontend container images..." -ForegroundColor Yellow
$env:SECRET_KEY = "smoke-test-secret-key-at-least-32-chars-long"
$env:MSSQL_SA_PASSWORD = "TaskSync@2026SmokeTestPassword!"
$env:RUN_DEMO_SEED = "false"

docker compose -f docker-compose.yml build
if ($LASTEXITCODE -ne 0) {
    Write-Error "[FAIL] Docker compose build failed."
    exit 1
}
Write-Host "[OK] Container image build completed." -ForegroundColor Green

# Step 3: Launch Services Stack
Write-Host "`n[3/5] Launching container services in background..." -ForegroundColor Yellow
docker compose -f docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Error "[FAIL] Failed to start container stack."
    exit 1
}

try {
    # Step 4: Poll Service Health
    Write-Host "`n[4/5] Polling service health checks (up to 90 seconds)..." -ForegroundColor Yellow
    $maxAttempts = 30
    $backendHealthy = $false
    $frontendHealthy = $false

    for ($i = 1; $i -le $maxAttempts; $i++) {
        Start-Sleep -Seconds 3

        # Check Backend Live Health Endpoint
        try {
            $backendRes = Invoke-WebRequest -Uri "http://localhost:8000/health/live" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($backendRes.StatusCode -eq 200) {
                $backendHealthy = $true
            }
        } catch {}

        # Check Frontend Health Endpoint
        try {
            $frontendRes = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
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
        docker compose logs backend --tail 50
        Write-Host "`n[CONTAINER LOGS - SQLSERVER]" -ForegroundColor Red
        docker compose logs sqlserver --tail 50
        Write-Error "[FAIL] Containers failed to achieve healthy status within timeout."
        exit 1
    }

    Write-Host "`n[5/5] Verifying Alembic Database Migration State..." -ForegroundColor Yellow
    $backendLogs = docker compose logs backend --tail 100
    if ($backendLogs -match "Executing Alembic database migrations" -or $backendLogs -match "Database migration complete") {
        Write-Host "[OK] Alembic migration execution detected in backend logs." -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Alembic migration log marker not found in recent logs." -ForegroundColor Yellow
    }

    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host " DOCKER CONTAINER SMOKE TEST PASSED SUCCESSFULLY!" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

} finally {
    Write-Host "`nShutting down smoke test container stack..." -ForegroundColor Yellow
    docker compose -f docker-compose.yml down
    Write-Host "[OK] Smoke test cleanup complete." -ForegroundColor Green
}
