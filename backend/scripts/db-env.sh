#!/usr/bin/env bash

DB_SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd -- "$DB_SCRIPT_DIR/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

read_env_value() {
  local key="$1"
  local line value

  [[ -f "$ENV_FILE" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=(.*)$ ]]; then
      value="${BASH_REMATCH[2]}"
      value="${value##+([[:space:]])}"
      value="${value%%+([[:space:]])}"
      if [[ ${#value} -ge 2 && ( "${value:0:1}" == "'" || "${value:0:1}" == '"' ) && "${value:0:1}" == "${value: -1}" ]]; then
        value="${value:1:${#value}-2}"
      fi
      printf '%s' "$value"
      return 0
    fi
  done < "$ENV_FILE"
}

load_database_config() {
  shopt -s extglob
  DB_NAME="$(read_env_value DB_NAME)"
  DB_USER="$(read_env_value DB_USER)"
  DB_PASSWORD="$(read_env_value DB_PASSWORD)"
  DB_NAME="${DB_NAME:-dermag_platform}"
  DB_USER="${DB_USER:-dermag_user}"

  if [[ -z "$DB_PASSWORD" ]]; then
    echo "Błąd: brak DB_PASSWORD w $ENV_FILE. Ustaw hasło w backend/.env." >&2
    return 1
  fi

  if ! command -v sudo >/dev/null 2>&1 || ! command -v psql >/dev/null 2>&1; then
    echo "Błąd: wymagane są polecenia sudo i psql." >&2
    return 1
  fi
}

sql_identifier() {
  local value="$1"
  value="${value//\"/\"\"}"
  printf '"%s"' "$value"
}

sql_literal() {
  local value="$1"
  value="${value//\'/\'\'}"
  printf "'%s'" "$value"
}
