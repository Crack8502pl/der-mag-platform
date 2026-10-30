#!/usr/bin/env bash

set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/db-env.sh"
load_database_config
if ! command -v sudo >/dev/null 2>&1; then
  echo "Błąd: wymagane jest polecenie sudo." >&2
  exit 1
fi

quoted_user="$(sql_identifier "$DB_USER")"
quoted_database="$(sql_identifier "$DB_NAME")"
user_literal="$(sql_literal "$DB_USER")"
database_literal="$(sql_literal "$DB_NAME")"
password_literal="$(sql_literal "$DB_PASSWORD")"

role_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = $user_literal")"
if [[ "$role_exists" == "1" ]]; then
  printf 'ALTER ROLE %s WITH LOGIN PASSWORD %s;\n' "$quoted_user" "$password_literal" |
    sudo -u postgres psql -v ON_ERROR_STOP=1
else
  printf 'CREATE ROLE %s WITH LOGIN PASSWORD %s;\n' "$quoted_user" "$password_literal" |
    sudo -u postgres psql -v ON_ERROR_STOP=1
fi

database_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = $database_literal")"
if [[ "$database_exists" != "1" ]]; then
  printf 'CREATE DATABASE %s OWNER %s;\n' "$quoted_database" "$quoted_user" |
    sudo -u postgres psql -v ON_ERROR_STOP=1
fi

printf 'GRANT ALL PRIVILEGES ON DATABASE %s TO %s;\n' "$quoted_database" "$quoted_user" |
  sudo -u postgres psql -v ON_ERROR_STOP=1
printf 'GRANT ALL ON SCHEMA public TO %s;\n' "$quoted_user" |
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1

echo "Baza '$DB_NAME' i użytkownik '$DB_USER' są gotowi."
