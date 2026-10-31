#!/bin/sh
set -eu

host="${SERVER_HOST:-192.168.2.38}"
cert_dir="${CERT_DIR:-/etc/nginx/certs}"
case "$host" in
  *:*) subject_alt_name="IP:$host" ;;
  *[!0-9.]* ) subject_alt_name="DNS:$host" ;;
  *) subject_alt_name="IP:$host" ;;
esac

mkdir -p "$cert_dir"
if [ "$subject_alt_name" = "IP:$host" ]; then
  san_marker="IP Address:$host"
else
  san_marker="$subject_alt_name"
fi

if ! openssl x509 -in "$cert_dir/server.crt" -noout -ext subjectAltName 2>/dev/null \
  | grep -Fq "$san_marker"; then
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$cert_dir/server.key" \
    -out "$cert_dir/server.crt" \
    -subj "/CN=$host" \
    -addext "subjectAltName=$subject_alt_name"
fi
