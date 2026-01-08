# 🔧 Database Reset - Sudo Configuration

## Cel
Skrypty `db:reset`, `db:drop` i `db:create` używają `sudo -u postgres` aby nie wymagać hasła użytkownika PostgreSQL.

## Wymagania

### 1. Dodaj regułę sudo (jednorazowo)

**Ubuntu/Debian:**
```bash
sudo visudo

# Dodaj na końcu pliku (zamień 'crack' na swoją nazwę użytkownika Linux):
crack ALL=(postgres) NOPASSWD: /usr/bin/psql
```

**Fedora/RHEL/CentOS:**
```bash
sudo visudo

# Dodaj na końcu pliku:
crack ALL=(postgres) NOPASSWD: /usr/bin/psql
```

**Arch Linux:**
```bash
sudo visudo

# Dodaj na końcu pliku:
crack ALL=(postgres) NOPASSWD: /usr/bin/psql
```

### 2. Weryfikacja

Sprawdź czy działa bez pytania o hasło:
```bash
sudo -u postgres psql -c "SELECT version();"
```

Jeśli wyświetla wersję PostgreSQL bez pytania o hasło - działa! ✅

## Użycie

### Pełny reset bazy (DROP + CREATE + migracje + seed)
```bash
npm run db:reset
```

### Tylko usunięcie bazy
```bash
npm run db:drop
```

### Tylko stworzenie bazy
```bash
npm run db:create
```

## Troubleshooting

### Problem: "sudo: a password is required"

**Rozwiązanie:** Sprawdź czy dodałeś regułę do sudoers:
```bash
sudo visudo
# Szukaj linii z: crack ALL=(postgres) NOPASSWD: /usr/bin/psql
```

### Problem: "psql: error: connection to server on socket failed"

**Rozwiązanie:** PostgreSQL nie jest uruchomiony:
```bash
# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Fedora/RHEL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Arch Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Problem: "FATAL: role 'dermag_user' does not exist"

**Rozwiązanie:** Stwórz użytkownika bazy:
```bash
sudo -u postgres psql -c "CREATE USER dermag_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "ALTER USER dermag_user CREATEDB;"
```

## Bezpieczeństwo

### ✅ Bezpieczne
- Reguła sudo pozwala TYLKO na uruchomienie `psql` jako użytkownik `postgres`
- Nie daje dostępu do innych komend
- Nie pozwala na uruchomienie jako root
- Działa tylko dla konkretnego użytkownika Linux

### ⚠️ Ostrzeżenia
- `npm run db:reset` usuwa WSZYSTKIE dane z bazy!
- NIE używaj na produkcji!
- Używaj tylko w środowisku deweloperskim

## Alternatywa: Użycie hasła

Jeśli wolisz używać hasła zamiast sudo, ustaw w `.env`:
```env
DB_USER=dermag_user
DB_PASSWORD=twoje_haslo
```

I zmień skrypty w `package.json` na:
```json
{
  "db:drop": "PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -h ${DB_HOST:-localhost} -c 'DROP DATABASE IF EXISTS ${DB_NAME}'",
  "db:create": "PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -h ${DB_HOST:-localhost} -c 'CREATE DATABASE ${DB_NAME}'"
}
```

**Uwaga:** Wymaga aby użytkownik miał uprawnienie CREATEDB:
```bash
sudo -u postgres psql -c "ALTER USER dermag_user CREATEDB;"
```
