# This script generates JWT keys and SSL certificates on Windows.
# It requires OpenSSL (Standard in Git Bash, or install via 'winget install openssl').

$ErrorActionPreference = "Stop"

if (!(Get-Command openssl -ErrorAction SilentlyContinue)) {
    Write-Host "OpenSSL was not found in your PATH." -ForegroundColor Red
    Write-Host "To fix this, install OpenSSL using winget:"
    Write-Host "  winget install openssl"
    Write-Host "Then restart your terminal."
    return
}

$OutputDir = if ($env:OUTPUT_DIR) { $env:OUTPUT_DIR } else { "." }
New-Item -ItemType Directory -Force -Path "$OutputDir/keys", "$OutputDir/certs"

Write-Host "Generating JWT RSA key pair..."
openssl genrsa -out "$OutputDir/keys/privateKey.pem" 2048
openssl rsa -pubout -in "$OutputDir/keys/privateKey.pem" -out "$OutputDir/keys/publicKey.pem"

Write-Host "Generating self-signed SSL certificate..."
$Subject = "/C=US/ST=State/L=City/O=Resonant/OU=Development/CN=ResonantSelfSigned"
# Adding basicConstraints=CA:TRUE and subjectAltName for Windows/Browser compatibility
openssl req -new -x509 -nodes -days 365 `
    -keyout "$OutputDir/certs/server.key" `
    -out "$OutputDir/certs/server.crt" `
    -subj $Subject `
    -addext "basicConstraints=CA:TRUE" `
    -addext "subjectAltName = DNS:localhost, IP:127.0.0.1"


Write-Host "Done! Keys and certificates generated in $OutputDir"
Write-Host "---"
Write-Host "Note: These are self-signed for development. Use Let's Encrypt for production."