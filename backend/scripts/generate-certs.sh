#!/bin/bash
# Script to generate self-signed SSL certificates for local network

# Get IP address from argument or use default
IP_ADDRESS=${1:-192.168.2.38}

echo "🔐 Generating SSL certificates for IP: $IP_ADDRESS"

# Create certs directory if it doesn't exist
mkdir -p "$(dirname "$0")/../certs"

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "$(dirname "$0")/../certs/key.pem" \
  -out "$(dirname "$0")/../certs/cert.pem" \
  -days 365 \
  -subj "/C=PL/ST=Mazowieckie/L=Warszawa/O=DerMag Platform/CN=$IP_ADDRESS" \
  -addext "subjectAltName=IP:$IP_ADDRESS,IP:127.0.0.1,DNS:localhost"

echo "✅ Certificates generated successfully!"
echo "   📄 Certificate: backend/certs/cert.pem"
echo "   🔑 Private key: backend/certs/key.pem"
echo ""
echo "To regenerate for different IP, run:"
echo "   ./scripts/generate-certs.sh <NEW_IP_ADDRESS>"
