#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Generating JWT RSA key pair and self-signed SSL certificate..."

# Create directories if they don't exist
mkdir -p keys
mkdir -p certs

# --- Generate JWT RSA Key Pair (RS256) ---
echo "Generating JWT RSA private and public keys..."
openssl genpkey -algorithm RSA -out keys/privateKey.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in keys/privateKey.pem -out keys/publicKey.pem
echo "JWT keys generated: keys/privateKey.pem, keys/publicKey.pem"

# --- Generate Self-Signed SSL Certificate ---
echo "Generating self-signed SSL certificate and private key..."
openssl genpkey -algorithm RSA -out certs/server.key -pkeyopt rsa_keygen_bits:2048
openssl req -new -x509 -nodes -days 365 -keyout certs/server.key -out certs/server.crt -subj "/C=US/ST=State/L=City/O=Resonant/OU=Development/CN=localhost"
echo "SSL certificate generated: certs/server.crt, certs/server.key"
echo "Generation complete. Remember to replace these with production-ready keys and certificates!"
