# Script to generate self-signed SSL certificates for local network (Windows)
param(
    [string]$IpAddress = "192.168.2.38"
)

Write-Host "🔐 Generating SSL certificates for IP: $IpAddress" -ForegroundColor Green

# Create certs directory if it doesn't exist
$certsDir = Join-Path $PSScriptRoot "..\certs"
if (!(Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
}

$certPath = Join-Path $certsDir "cert.pem"
$keyPath = Join-Path $certsDir "key.pem"

# Check if OpenSSL is available
if (!(Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ OpenSSL not found. Please install OpenSSL first." -ForegroundColor Red
    Write-Host "   Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    exit 1
}

# Generate certificate
$subjectAltName = "IP:$IpAddress,IP:127.0.0.1,DNS:localhost"
openssl req -x509 -newkey rsa:4096 -nodes `
  -keyout $keyPath `
  -out $certPath `
  -days 365 `
  -subj "/C=PL/ST=Mazowieckie/L=Warszawa/O=DerMag Platform/CN=$IpAddress" `
  -addext "subjectAltName=$subjectAltName"

Write-Host "✅ Certificates generated successfully!" -ForegroundColor Green
Write-Host "   📄 Certificate: $certPath"
Write-Host "   🔑 Private key: $keyPath"
Write-Host ""
Write-Host "To regenerate for different IP, run:" -ForegroundColor Yellow
Write-Host "   .\scripts\generate-certs.ps1 -IpAddress <NEW_IP_ADDRESS>"
