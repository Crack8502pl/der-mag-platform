#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Usage: $0 /backups/grover_backup_YYYYMMDD_HHMMSS.sql.gz" >&2
  exit 2
fi

backup_file="$1"
echo "WARNING: This will drop and recreate database \"$PGDATABASE\" from $backup_file."
read -r -p "Type RESTORE to continue: " confirmation
if [[ "$confirmation" != "RESTORE" ]]; then
  echo "Restore cancelled."
  exit 1
fi

dropdb --if-exists --force "$PGDATABASE"
createdb "$PGDATABASE"
if ! gzip -dc -- "$backup_file" | psql --set ON_ERROR_STOP=on --single-transaction --quiet; then
  echo "Restore failed; database may be empty or partially restored." >&2
  exit 1
fi

echo "Database restore completed."
