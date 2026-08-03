# =========================================================================
# Local Alembic Migration Test Script for TaskSyncEnterprise (Windows PowerShell)
# Validates clean MSSQL migration execution and checks alembic current == heads.
# =========================================================================

$ErrorActionPreference = "Stop"

Write-Host "==> TaskSyncEnterprise Alembic Migration Validation" -ForegroundColor Cyan

# 1. Environment Verification
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Resolve-Path "$ScriptDir\.."

Set-Location $BackendDir

$VenvPython = "$BackendDir\.venv\Scripts\python.exe"
$VenvAlembic = "$BackendDir\.venv\Scripts\alembic.exe"

if (Test-Path $VenvAlembic) {
    $AlembicCmd = $VenvAlembic
} else {
    $AlembicCmd = "alembic"
}

Write-Host "--> Running Alembic Upgrade Head..." -ForegroundColor Yellow
& $AlembicCmd upgrade head
if ($LASTEXITCODE -ne 0) {
    Write-Error "Alembic upgrade head failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "--> Checking Alembic Current Revision..." -ForegroundColor Yellow
$CurrentOutput = (& $AlembicCmd current) | Out-String
$HeadsOutput   = (& $AlembicCmd heads)   | Out-String

Write-Host "Current: $CurrentOutput" -ForegroundColor Gray
Write-Host "Heads:   $HeadsOutput"   -ForegroundColor Gray

$CurrentRev = ($CurrentOutput.Trim() -split '\s+')[0]
$HeadRev    = ($HeadsOutput.Trim()   -split '\s+')[0]

if ($CurrentRev -eq $HeadRev) {
    Write-Host "SUCCESS: Database schema is at head ($HeadRev)." -ForegroundColor Green
    exit 0
} else {
    Write-Error "MISMATCH: Current revision ($CurrentRev) does not match head ($HeadRev)!"
    exit 1
}
