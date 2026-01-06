# Instalacja i Konfiguracja PostgreSQL dla DER-MAG Platform

## Spis treści
1. [Instalacja PostgreSQL](#instalacja-postgresql)
2. [Konfiguracja bazowa](#konfiguracja-bazowa)
3. [Tworzenie użytkownika i bazy](#tworzenie-użytkownika-i-bazy)
4. [Konfiguracja uprawnień](#konfiguracja-uprawnień)
5. [Konfiguracja połączenia zdalnego](#konfiguracja-połączenia-zdalnego)
6. [Inicjalizacja bazy DER-MAG Platform](#inicjalizacja-bazy-der-mag-platform)
7. [Backup i restore](#backup-i-restore)
8. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Instalacja PostgreSQL

### Ubuntu/Debian

```bash
# 1. Aktualizacja repozytoriów
sudo apt update

# 2. Instalacja PostgreSQL (najnowsza wersja)
sudo apt install postgresql postgresql-contrib -y

# 3. Sprawdzenie wersji
psql --version

# 4. Sprawdzenie statusu
sudo systemctl status postgresql

# 5. Uruchomienie (jeśli nie działa)
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (Homebrew)

```bash
# 1. Instalacja PostgreSQL
brew install postgresql@16

# 2. Uruchomienie
brew services start postgresql@16

# 3. Dodanie do PATH (dodaj do ~/.zshrc lub ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 4. Sprawdzenie
psql --version
```

### Windows

```bash
# 1. Pobierz instalator z https://www.postgresql.org/download/windows/
# 2. Uruchom instalator i postępuj zgodnie z instrukcjami
# 3. Zapamiętaj hasło dla użytkownika postgres
# 4. Dodaj do PATH: C:\Program Files\PostgreSQL\16\bin

# 5. Sprawdzenie w PowerShell/CMD
psql --version
```

### Docker (uniwersalne)

```bash
# 1. Uruchom kontener PostgreSQL
docker run --name dermag-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -v dermag_pgdata:/var/lib/postgresql/data \
  -d postgres:16-alpine

# 2. Sprawdzenie
docker ps | grep dermag-postgres

# 3. Połączenie
docker exec -it dermag-postgres psql -U postgres
```

---

## Konfiguracja bazowa

### 1. Logowanie jako superuser

```bash
# Linux/macOS
sudo -u postgres psql

# Windows (PowerShell/CMD jako Administrator)
psql -U postgres

# Docker
docker exec -it dermag-postgres psql -U postgres
```

### 2. Zmiana hasła postgres (jeśli potrzebne)

```sql
ALTER USER postgres WITH PASSWORD 'twoje_bezpieczne_haslo';
```

### 3. Podstawowe komendy PostgreSQL

```sql
-- Lista baz danych
\l

-- Lista użytkowników
\du

-- Połączenie z bazą
\c nazwa_bazy

-- Lista tabel
\dt

-- Opis struktury tabeli
\d nazwa_tabeli

-- Wyjście
\q
```

---

## Tworzenie użytkownika i bazy dla DER-MAG Platform

### Krok 1: Tworzenie użytkownika

```sql
-- Logowanie jako postgres
sudo -u postgres psql

-- Tworzenie użytkownika
CREATE USER dermag_user WITH PASSWORD 'twoje_silne_haslo_123!';

-- Nadanie uprawnień do tworzenia baz (opcjonalnie)
ALTER USER dermag_user CREATEDB;
```

### Krok 2: Tworzenie bazy danych

```sql
-- Tworzenie bazy z właścicielem dermag_user
CREATE DATABASE dermag_platform
  WITH OWNER = dermag_user
  ENCODING = 'UTF8'
  LC_COLLATE = 'pl_PL.UTF-8'
  LC_CTYPE = 'pl_PL.UTF-8'
  TEMPLATE = template0;

-- Dodanie komentarza
COMMENT ON DATABASE dermag_platform IS 'Baza danych platformy DER-MAG - system zarządzania zadaniami infrastrukturalnymi';
```

**Uwaga:** Jeśli lokalizacja `pl_PL.UTF-8` nie jest dostępna, użyj `en_US.UTF-8`:

```sql
CREATE DATABASE dermag_platform
  WITH OWNER = dermag_user
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;
```

### Krok 3: Nadanie uprawnień

```sql
-- Nadanie wszystkich uprawnień na bazie
GRANT ALL PRIVILEGES ON DATABASE dermag_platform TO dermag_user;

-- Połączenie z bazą
\c dermag_platform

-- Nadanie uprawnień na schemat public
GRANT ALL PRIVILEGES ON SCHEMA public TO dermag_user;

-- Nadanie uprawnień na wszystkie istniejące tabele
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dermag_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dermag_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO dermag_user;

-- Domyślne uprawnienia dla nowych tabel (dziedziczenie)
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL ON TABLES TO dermag_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL ON SEQUENCES TO dermag_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL ON FUNCTIONS TO dermag_user;

-- Wyjście
\q
```

---

## Konfiguracja uprawnień

### Plik pg_hba.conf (dostęp)

Lokalizacja pliku:
- **Ubuntu/Debian:** `/etc/postgresql/16/main/pg_hba.conf`
- **macOS (Homebrew):** `/opt/homebrew/var/postgresql@16/pg_hba.conf`
- **Windows:** `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`

Edycja pliku:

```bash
# Linux
sudo nano /etc/postgresql/16/main/pg_hba.conf

# macOS
nano /opt/homebrew/var/postgresql@16/pg_hba.conf
```

Dodaj linię dla lokalnego dostępu:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   dermag_platform dermag_user                             md5
host    dermag_platform dermag_user     127.0.0.1/32            md5
host    dermag_platform dermag_user     ::1/128                 md5

# Allow connections from local network (opcjonalnie)
host    dermag_platform dermag_user     192.168.1.0/24          md5
```

### Plik postgresql.conf (konfiguracja serwera)

Lokalizacja: ten sam katalog co `pg_hba.conf`

```bash
# Linux
sudo nano /etc/postgresql/16/main/postgresql.conf

# macOS
nano /opt/homebrew/var/postgresql@16/postgresql.conf
```

Kluczowe ustawienia:

```conf
# Połączenia
listen_addresses = 'localhost'  # lub '*' dla zdalnych połączeń
port = 5432
max_connections = 100

# Pamięć
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Logowanie
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_statement = 'all'  # Tylko na development!
```

### Restart PostgreSQL po zmianach

```bash
# Ubuntu/Debian
sudo systemctl restart postgresql

# macOS
brew services restart postgresql@16

# Windows (CMD jako Administrator)
net stop postgresql-x64-16
net start postgresql-x64-16

# Docker
docker restart dermag-postgres
```

---

## Inicjalizacja bazy DER-MAG Platform

### Metoda 1: Pełna instalacja od zera

```bash
# 1. Usuń starą bazę (UWAGA: traci wszystkie dane!)
psql -U postgres -c "DROP DATABASE IF EXISTS dermag_platform;"

# 2. Utwórz nową bazę
psql -U postgres -c "CREATE DATABASE dermag_platform OWNER dermag_user;"

# 3. Nadaj uprawnienia
psql -U postgres -d dermag_platform << EOF
GRANT ALL PRIVILEGES ON SCHEMA public TO dermag_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dermag_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dermag_user;
EOF

# 4. Przejdź do katalogu backend
cd /path/to/der-mag-platform/backend

# 5. Skonfiguruj plik .env
cat > .env << 'EOF'
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dermag_platform
DB_USER=dermag_user
DB_PASSWORD=twoje_silne_haslo_123!
DB_SYNCHRONIZE=true

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your-refresh-secret-key
REFRESH_TOKEN_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173

# Email (opcjonalnie)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SUPPORT_EMAIL=smokip@der-mag.pl
EOF

# 6. Instaluj dependencies
npm install

# 7. Uruchom backend (TypeORM automatycznie utworzy tabele)
npm run dev
```

### Metoda 2: Import z backup

```bash
# 1. Utwórz bazę
psql -U postgres -c "CREATE DATABASE dermag_platform OWNER dermag_user;"

# 2. Importuj backup
psql -U dermag_user -d dermag_platform < backup.sql

# lub dla skompresowanego backup
gunzip -c backup.sql.gz | psql -U dermag_user -d dermag_platform
```

### Metoda 3: Migracje (jeśli istnieją)

```bash
cd /path/to/der-mag-platform/backend

# 1. Uruchom migracje
npm run migrate

# 2. Seed danych (jeśli jest skrypt)
npm run seed
```

### Weryfikacja instalacji

```bash
# 1. Połącz się z bazą
psql -U dermag_user -d dermag_platform

# 2. Sprawdź tabele
\dt

# 3. Sprawdź liczbę rekordów w głównych tabelach
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks;

# 4. Wyjście
\q
```

---

## Backup i restore

### Backup całej bazy

```bash
# 1. Backup do pliku SQL
pg_dump -U dermag_user -d dermag_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Backup skompresowany
pg_dump -U dermag_user -d dermag_platform | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 3. Backup w formacie custom (szybszy restore)
pg_dump -U dermag_user -d dermag_platform -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Backup tylko schematu (bez danych)

```bash
pg_dump -U dermag_user -d dermag_platform --schema-only > schema_$(date +%Y%m%d).sql
```

### Backup tylko danych (bez schematu)

```bash
pg_dump -U dermag_user -d dermag_platform --data-only > data_$(date +%Y%m%d).sql
```

### Restore z backupu

```bash
# 1. Restore z pliku SQL
psql -U dermag_user -d dermag_platform < backup.sql

# 2. Restore ze skompresowanego backup
gunzip -c backup.sql.gz | psql -U dermag_user -d dermag_platform

# 3. Restore z custom format
pg_restore -U dermag_user -d dermag_platform backup.dump

# 4. Restore z utworzeniem nowej bazy
dropdb -U postgres dermag_platform
createdb -U postgres -O dermag_user dermag_platform
psql -U dermag_user -d dermag_platform < backup.sql
```

### Automatyczny backup (cron)

```bash
# 1. Utwórz skrypt backup
cat > /home/user/backup_dermag.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups/dermag"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U dermag_user -d dermag_platform | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Usuń backupy starsze niż 30 dni
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
EOF

# 2. Nadaj uprawnienia
chmod +x /home/user/backup_dermag.sh

# 3. Dodaj do crontab (codziennie o 2:00 AM)
crontab -e
# Dodaj linię:
0 2 * * * /home/user/backup_dermag.sh >> /home/user/backups/backup.log 2>&1
```

---

## Rozwiązywanie problemów

### Problem 1: "psql: error: connection to server on socket failed"

**Rozwiązanie:**

```bash
# Sprawdź status PostgreSQL
sudo systemctl status postgresql

# Jeśli nie działa, uruchom
sudo systemctl start postgresql

# Sprawdź logi
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Problem 2: "FATAL: Peer authentication failed for user"

**Rozwiązanie:** Zmień metodę autoryzacji w `pg_hba.conf`:

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Zmień `peer` na `md5` dla lokalnych połączeń:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     md5
```

Restart:

```bash
sudo systemctl restart postgresql
```

### Problem 3: "password authentication failed for user"

**Rozwiązanie:** Zresetuj hasło użytkownika:

```sql
-- Zaloguj jako postgres
sudo -u postgres psql

-- Zresetuj hasło
ALTER USER dermag_user WITH PASSWORD 'nowe_haslo';
```

### Problem 4: "database does not exist"

**Rozwiązanie:** Utwórz bazę:

```sql
sudo -u postgres psql
CREATE DATABASE dermag_platform OWNER dermag_user;
```

### Problem 5: "permission denied for schema public"

**Rozwiązanie:** Nadaj uprawnienia:

```sql
sudo -u postgres psql -d dermag_platform
GRANT ALL PRIVILEGES ON SCHEMA public TO dermag_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dermag_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dermag_user;
```

### Problem 6: Port 5432 zajęty

**Rozwiązanie:** Sprawdź co używa portu:

```bash
# Linux/macOS
sudo lsof -i :5432

# Zatrzymaj PostgreSQL
sudo systemctl stop postgresql

# Zmień port w postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
# Zmień: port = 5433

# Uruchom ponownie
sudo systemctl start postgresql
```

### Problem 7: Brak lokalizacji pl_PL.UTF-8

**Rozwiązanie:** Wygeneruj lokalizację:

```bash
# Ubuntu/Debian
sudo locale-gen pl_PL.UTF-8
sudo update-locale

# lub użyj en_US.UTF-8 w CREATE DATABASE
```

### Problem 8: Połączenia zdalne nie działają

**Rozwiązanie:**

1. Edytuj `postgresql.conf`:
```conf
listen_addresses = '*'
```

2. Edytuj `pg_hba.conf`, dodaj:
```
host    dermag_platform    dermag_user    0.0.0.0/0    md5
```

3. Restart:
```bash
sudo systemctl restart postgresql
```

4. Sprawdź firewall:
```bash
sudo ufw allow 5432/tcp
```

### Problem 9: Zbyt wolne zapytania

**Rozwiązanie:** Zoptymalizuj konfigurację w `postgresql.conf`:

```conf
shared_buffers = 256MB           # 25% RAM
effective_cache_size = 1GB       # 50-75% RAM
work_mem = 16MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

Restart PostgreSQL po zmianach.

### Problem 10: Błąd "too many connections"

**Rozwiązanie:**

1. Zwiększ limit w `postgresql.conf`:
```conf
max_connections = 200
```

2. Sprawdź aktywne połączenia:
```sql
SELECT count(*) FROM pg_stat_activity;
```

3. Zabij niepotrzebne połączenia:
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'dermag_platform' 
  AND pid <> pg_backend_pid()
  AND state = 'idle';
```

---

## Przydatne komendy

### Monitoring bazy danych

```sql
-- Rozmiar bazy danych
SELECT pg_size_pretty(pg_database_size('dermag_platform'));

-- Rozmiar tabel
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Aktywne połączenia
SELECT * FROM pg_stat_activity WHERE datname = 'dermag_platform';

-- Statystyki wydajności
SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public';

-- Indeksy nieużywane
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
```

### Czyszczenie i optymalizacja

```sql
-- Vacuum (czyszczenie)
VACUUM ANALYZE;

-- Vacuum full (odzyskuje miejsce)
VACUUM FULL;

-- Reindex (przebudowa indeksów)
REINDEX DATABASE dermag_platform;
```

---

## Konfiguracja środowiska .env dla backendu

Przykładowy plik `.env` dla DER-MAG Platform:

```env
# =================================
# DATABASE CONFIGURATION
# =================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dermag_platform
DB_USER=dermag_user
DB_PASSWORD=twoje_silne_haslo_123!

# TypeORM - automatyczne synchronizowanie schematu (tylko development!)
DB_SYNCHRONIZE=true
DB_LOGGING=true

# =================================
# JWT TOKENS
# =================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h

REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key
REFRESH_TOKEN_EXPIRES_IN=7d

# =================================
# SERVER
# =================================
PORT=3000
NODE_ENV=development

# =================================
# FRONTEND
# =================================
FRONTEND_URL=http://localhost:5173

# =================================
# EMAIL CONFIGURATION
# =================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Grover Platform <noreply@der-mag.pl>
SUPPORT_EMAIL=smokip@der-mag.pl

# =================================
# FILE UPLOAD
# =================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# =================================
# REDIS (opcjonalnie, dla cache/kolejek)
# =================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# =================================
# LOGGING
# =================================
LOG_LEVEL=debug
```

---

## Wsparcie techniczne

W przypadku problemów:
1. Sprawdź logi PostgreSQL
2. Sprawdź konfigurację w plikach `pg_hba.conf` i `postgresql.conf`
3. Zweryfikuj uprawnienia użytkownika bazy danych
4. Skontaktuj się z zespołem technicznym: smokip@der-mag.pl

---

**Ostatnia aktualizacja:** 2026-01-06
**Wersja dokumentu:** 1.0
