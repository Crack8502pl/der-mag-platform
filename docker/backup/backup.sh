#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_TIME="${BACKUP_TIME:-02:00}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [[ ! "$BACKUP_TIME" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]]; then
  echo "BACKUP_TIME must use 24-hour HH:MM format (UTC)." >&2
  exit 2
fi

if [[ ! "$BACKUP_RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_RETENTION_DAYS must be a positive integer." >&2
  exit 2
fi

create_backup() {
  local timestamp backup_file temporary_file
  timestamp="$(date -u +%Y%m%d_%H%M%S)"
  backup_file="$BACKUP_DIR/grover_backup_${timestamp}.sql.gz"
  temporary_file="${backup_file}.tmp"
  mkdir -p "$BACKUP_DIR"

  echo "Creating PostgreSQL backup: $backup_file"
  if ! pg_dump --no-owner --no-acl | gzip -c > "$temporary_file"; then
    rm -f "$temporary_file"
    echo "PostgreSQL backup failed." >&2
    return 1
  fi

  mv -- "$temporary_file" "$backup_file"
  find "$BACKUP_DIR" -type f -name 'grover_backup_*.sql.gz' \
    -mtime "+$BACKUP_RETENTION_DAYS" -delete
  echo "Backup completed: $backup_file ($(du -h "$backup_file" | cut -f1))"
}

case "${1:-once}" in
  once)
    create_backup
    ;;
  schedule)
    create_backup
    while true; do
      now="$(date -u +%s)"
      today="$(date -u +%F)"
      next_run="$(date -u -d "$today $BACKUP_TIME:00" +%s)"
      if (( next_run <= now )); then
        next_run="$(date -u -d "$today +1 day $BACKUP_TIME:00" +%s)"
      fi
      sleep "$((next_run - now))"
      create_backup
    done
    ;;
  *)
    echo "Usage: $0 [once|schedule]" >&2
    exit 2
    ;;
esac
