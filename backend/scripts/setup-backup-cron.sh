#!/bin/bash
# setup-backup-cron.sh
# Skrypt konfiguracji automatycznych backupów cron dla Grover Platform

set -e

# Kolory dla logów
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-db.sh"
LOG_FILE="/var/log/grover-backup.log"

# Sprawdź czy skrypt backup istnieje
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}❌ Skrypt backup-db.sh nie istnieje!${NC}"
    exit 1
fi

# Upewnij się że skrypt jest wykonywalny
chmod +x "$BACKUP_SCRIPT"

echo -e "${GREEN}⚙️  Konfiguracja automatycznych backupów Grover Platform${NC}"
echo ""

# Dodaj wpis do crona (codziennie o 2:00)
CRON_JOB="0 2 * * * $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

# Sprawdź czy cron job już istnieje
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo -e "${YELLOW}ℹ️  Cron job dla backupu już istnieje${NC}"
    echo ""
    echo "Obecny cron job:"
    crontab -l | grep "$BACKUP_SCRIPT"
    echo ""
    read -p "Czy chcesz go zaktualizować? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}❌ Operacja anulowana${NC}"
        exit 0
    fi
    
    # Usuń stary wpis
    (crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT") | crontab -
fi

# Dodaj nowy wpis do crona
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo -e "${GREEN}✅ Cron job został dodany!${NC}"
echo ""
echo -e "${GREEN}📅 Harmonogram: Codziennie o 2:00 w nocy${NC}"
echo -e "${GREEN}📁 Log: $LOG_FILE${NC}"
echo -e "${GREEN}🔧 Skrypt: $BACKUP_SCRIPT${NC}"
echo ""
echo "Obecne zadania cron:"
crontab -l
echo ""
echo -e "${GREEN}🎉 Konfiguracja zakończona!${NC}"
echo ""
echo -e "${YELLOW}💡 Wskazówka: Możesz sprawdzić logi backupu komendą:${NC}"
echo -e "${YELLOW}   tail -f $LOG_FILE${NC}"
