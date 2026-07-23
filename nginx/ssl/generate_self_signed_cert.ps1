# PowerShell script to generate self-signed TLS certificates for local Nginx HTTPS testing.
# WARNING: Do NOT use self-signed certificates in production!

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$CertPath = Join-Path $ScriptDir "server.crt"
$KeyPath = Join-Path $ScriptDir "server.key"

Write-Host "[+] Generating local self-signed TLS certificate for TaskSyncEnterprise..." -ForegroundColor Cyan

# Check if openssl is available
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $KeyPath `
        -out $CertPath `
        -subj "/CN=localhost/O=TaskSyncEnterprise/C=VN"
    Write-Host "[+] Certificate and Private Key generated via OpenSSL:" -ForegroundColor Green
    Write-Host "    - Certificate: $CertPath"
    Write-Host "    - Private Key: $KeyPath"
} else {
    Write-Host "[!] OpenSSL not found. Attempting PowerShell New-SelfSignedCertificate fallback..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate -DnsName "localhost", "127.0.0.1" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(1)
    
    # Export certificate
    [System.IO.File]::WriteAllBytes($CertPath, $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    Write-Host "[+] Certificate exported to $CertPath" -ForegroundColor Green
    Write-Host "[!] Note: Exporting RSA Private Key requires OpenSSL or certutil. Please install OpenSSL for full Nginx key export." -ForegroundColor Yellow
}
