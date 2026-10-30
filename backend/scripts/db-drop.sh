#!/usr/bin/env bash

set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/db-env.sh"
load_database_config
if ! command -v sudo >/dev/null 2>&1; then
  echo "Błąd: wymagane jest polecenie sudo." >&2
  exit 1
fi

echo "Ta operacja usunie bazę '$DB_NAME'. Użytkownik '$DB_USER' pozostanie."
read -r -p "Czy na pewno usunąć bazę? [y/N] " confirmation
if [[ ! "$confirmation" =~ ^[Yy]([Ee][Ss])?$ ]]; then
  echo "Anulowano."
  exit 1
fi

quoted_database="$(sql_identifier "$DB_NAME")"
printf 'DROP DATABASE IF EXISTS %s;\n' "$quoted_database" |
  sudo -u postgres psql -v ON_ERROR_STOP=1
echo "Baza '$DB_NAME' została usunięta; użytkownik '$DB_USER' nie został zmieniony."
