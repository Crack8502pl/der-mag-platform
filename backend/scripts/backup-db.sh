#!/bin/bash
# backup-db.sh
# Skrypt automatycznego backup-u bazy danych PostgreSQL dla Grover Platform

set -e

# Kolory dla logów
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguracja
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
RETENTION_DAYS=30

# Załaduj zmienne środowiskowe z .env jeśli istnieje
if [ -f "$SCRIPT_DIR/../.env" ]; then
    source "$SCRIPT_DIR/../.env"
fi

# Domyślne wartości jeśli nie ustawione
DB_NAME="${DB_NAME:-dermag_platform}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Sprawdź czy pg_dump jest dostępne
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump nie jest zainstalowane!${NC}"
    exit 1
fi

# Utwórz katalog backupów jeśli nie istnieje
mkdir -p "$BACKUP_DIR"

# Generuj nazwę pliku z datą
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/grover_backup_${TIMESTAMP}.sql.gz"

echo -e "${GREEN}📦 Rozpoczynam backup bazy danych Grover Platform...${NC}"
echo -e "${YELLOW}⏰ Timestamp: $TIMESTAMP${NC}"
echo -e "${YELLOW}💾 Baza danych: $DB_NAME${NC}"
echo -e "${YELLOW}📍 Host: $DB_HOST${NC}"
echo -e "${YELLOW}👤 Użytkownik: $DB_USER${NC}"
echo ""

# Wykonaj backup z kompresją
export PGPASSWORD="$DB_PASSWORD"
if pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup zakończony pomyślnie!${NC}"
    echo -e "${GREEN}📁 Plik: $BACKUP_FILE${NC}"
    echo -e "${GREEN}📊 Rozmiar: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Błąd podczas tworzenia backupu!${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Wyczyść stare backupy (starsze niż RETENTION_DAYS)
echo ""
echo -e "${YELLOW}🧹 Usuwam backupy starsze niż $RETENTION_DAYS dni...${NC}"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "grover_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}🗑️  Usunięto $DELETED_COUNT starych backupów${NC}"
else
    echo -e "${YELLOW}ℹ️  Brak starych backupów do usunięcia${NC}"
fi

# Pokaż listę wszystkich backupów
echo ""
echo -e "${GREEN}📋 Lista wszystkich backupów:${NC}"
ls -lh "$BACKUP_DIR"/grover_backup_*.sql.gz 2>/dev/null | awk '{print $9, "("$5")"}' || echo "Brak backupów"

echo ""
echo -e "${GREEN}🎉 Backup zakończony!${NC}"

unset PGPASSWORD
