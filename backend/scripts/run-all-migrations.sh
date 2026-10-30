#!/usr/bin/env bash

set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/db-env.sh"
load_database_config

export PGPASSWORD="$DB_PASSWORD"
shopt -s nullglob
MIGRATIONS=("$SCRIPT_DIR"/migrations/*.sql)
if ((${#MIGRATIONS[@]} == 0)); then
  echo "Błąd: nie znaleziono plików migracji SQL w $SCRIPT_DIR/migrations." >&2
  exit 1
fi

TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0
OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

run_migration() {
  local migration="$1"
  if [[ -n "$DB_CONNECTION_STRING" ]]; then
    psql "$DB_CONNECTION_STRING" -v ON_ERROR_STOP=1 -f "$migration"
  else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      -v ON_ERROR_STOP=1 -f "$migration"
  fi
}

for migration in "${MIGRATIONS[@]}"; do
  TOTAL=$((TOTAL + 1))
  filename="$(basename "$migration")"
  echo "[$TOTAL] Uruchamianie: $filename"

  if run_migration "$migration" >"$OUTPUT_FILE" 2>&1; then
    cat "$OUTPUT_FILE"
    echo "    Zastosowano."
    SUCCESS=$((SUCCESS + 1))
  elif grep -Eqi 'already exists|already been applied' "$OUTPUT_FILE"; then
    cat "$OUTPUT_FILE"
    echo "    Pominięto: obiekt już istnieje."
    SKIPPED=$((SKIPPED + 1))
  else
    cat "$OUTPUT_FILE" >&2
    echo "    BŁĄD: migracja nie została zastosowana." >&2
    FAILED=$((FAILED + 1))
  fi
done

echo "Podsumowanie: razem=$TOTAL, zastosowano=$SUCCESS, pominięto=$SKIPPED, błędy=$FAILED"
if ((FAILED > 0)); then
  exit 1
fi
