#!/bin/bash
# restore-db.sh
# Skrypt przywracania bazy danych PostgreSQL dla Grover Platform

set -e

# Kolory dla logów
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguracja
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Załaduj zmienne środowiskowe z .env jeśli istnieje
if [ -f "$SCRIPT_DIR/../.env" ]; then
    source "$SCRIPT_DIR/../.env"
fi

# Domyślne wartości jeśli nie ustawione
DB_NAME="${DB_NAME:-dermag_platform}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Sprawdź argumenty
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Błąd: Nie podano pliku backup!${NC}"
    echo ""
    echo "Użycie: $0 <ścieżka_do_backup.sql.gz>"
    echo ""
    echo "Przykład:"
    echo "  $0 backups/grover_backup_20231215_120000.sql.gz"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

# Sprawdź czy plik istnieje
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Plik backup nie istnieje: $BACKUP_FILE${NC}"
    exit 1
fi

# Sprawdź czy psql jest dostępne
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql nie jest zainstalowane!${NC}"
    exit 1
fi

# Sprawdź czy gunzip jest dostępne (dla dekompresji)
if ! command -v gunzip &> /dev/null; then
    echo -e "${RED}❌ gunzip nie jest zainstalowane!${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  UWAGA: Ta operacja nadpisze istniejącą bazę danych!${NC}"
echo -e "${YELLOW}📁 Plik backup: $BACKUP_FILE${NC}"
echo -e "${YELLOW}💾 Baza danych: $DB_NAME${NC}"
echo -e "${YELLOW}📍 Host: $DB_HOST${NC}"
echo -e "${YELLOW}👤 Użytkownik: $DB_USER${NC}"
echo ""
read -p "Czy na pewno chcesz kontynuować? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Operacja anulowana${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}📦 Rozpoczynam przywracanie bazy danych Grover Platform...${NC}"

# Eksportuj hasło
export PGPASSWORD="$DB_PASSWORD"

# Rozpakuj i przywróć bazę danych
if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"; then
    echo ""
    echo -e "${GREEN}✅ Baza danych przywrócona pomyślnie!${NC}"
    echo -e "${GREEN}💾 Baza: $DB_NAME${NC}"
    echo -e "${GREEN}📁 Z pliku: $BACKUP_FILE${NC}"
else
    echo ""
    echo -e "${RED}❌ Błąd podczas przywracania bazy danych!${NC}"
    unset PGPASSWORD
    exit 1
fi

unset PGPASSWORD

echo ""
echo -e "${GREEN}🎉 Przywracanie zakończone!${NC}"
