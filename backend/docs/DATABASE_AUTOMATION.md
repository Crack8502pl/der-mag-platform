# 🚀 Automatyzacja migracji bazy danych

## 📋 Spis treści
- [Konfiguracja sudo](#konfiguracja-sudo)
- [Wprowadzenie](#wprowadzenie)
- [Dostępne komendy](#dostępne-komendy)
- [Scenariusze użycia](#scenariusze-użycia)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)

## ⚙️ Konfiguracja sudo (wymagane przed pierwszym użyciem)

Skrypty używają `sudo -u postgres` aby nie wymagać hasła PostgreSQL. 

**Jednorazowa konfiguracja:**
```bash
sudo visudo

# Dodaj linię (zamień 'crack' na swoją nazwę użytkownika Linux):
crack ALL=(postgres) NOPASSWD: /usr/bin/psql
```

**Sprawdź czy działa:**
```bash
sudo -u postgres psql -c "SELECT version();"
```

Jeśli wyświetla wersję PostgreSQL bez pytania o hasło - gotowe! ✅

📖 **Szczegóły:** Zobacz [DB_RESET_SUDO_SETUP.md](DB_RESET_SUDO_SETUP.md)

## Wprowadzenie

System automatycznie wykonuje wszystkie migracje SQL i seedowanie danych przy setupie bazy.

## Dostępne komendy

### `npm run migrate:all`
Uruchamia wszystkie migracje SQL z katalogu `backend/scripts/migrations/` w kolejności chronologicznej.

**Opis:**
- Wczytuje zmienne środowiskowe z pliku `.env`
- Łączy się z bazą danych używając `psql`
- Wykonuje wszystkie pliki `.sql` w kolejności alfabetycznej (która odpowiada kolejności chronologicznej)
- Ignoruje błędy duplikacji (już wykonane migracje)

**Wymagania:**
- `psql` zainstalowany w systemie
- Poprawne dane dostępowe w pliku `.env`

### `npm run db:setup`
Kompleksowy setup bazy danych:
1. Uruchamia wszystkie migracje SQL (`migrate:all`)
2. Inicjalizuje połączenie TypeORM
3. Wykonuje seedowanie (role, task_types, admin)

**Użycie:**
```bash
npm run db:setup
```

**Wynik:**
- Wszystkie tabele utworzone przez migracje
- 10 ról systemowych
- 13 typów zadań
- Domyślny użytkownik admin

### `npm run db:reset`
Resetuje bazę danych (usuwa i tworzy na nowo + setup):
1. Usuwa bazę danych (`db:drop`)
2. Tworzy nową bazę (`db:create`)
3. Uruchamia `db:setup`

**⚠️ UWAGA:** Ta komenda usuwa WSZYSTKIE dane!

**Użycie:**
```bash
npm run db:reset
```

### `npm run db:drop`
Usuwa bazę danych.

**Użycie:**
```bash
npm run db:drop
```

### `npm run db:create`
Tworzy nową bazę danych.

**Użycie:**
```bash
npm run db:create
```

## Scenariusze użycia

### Scenariusz 1: Świeża instalacja
```bash
# 1. Stwórz bazę danych
npm run db:create

# 2. Setup: migracje + seed
npm run db:setup
```

### Scenariusz 2: Reset bazy (usuń wszystko i zacznij od nowa)
```bash
npm run db:reset
```

### Scenariusz 3: Tylko migracje (bez seedowania)
```bash
npm run migrate:all
```

### Scenariusz 4: Tylko seed (baza już istnieje)
```bash
# Przez API
curl -X POST http://localhost:3000/api/admin/seed-database

# Lub programowo
ts-node -e "import('./src/services/DatabaseSeeder').then(m => m.DatabaseSeeder.seed())"
```

### Scenariusz 5: Wymuszony reset danych seedowych
```bash
# Usuwa i odtwarza role, task_types i użytkownika admin
# Zachowuje strukturę tabel i dane migracyjne
ts-node -e "import('./src/services/DatabaseSeeder').then(m => m.DatabaseSeeder.forceSeed())"
```

## Rozwiązywanie problemów

### Problem: "Migration already applied"
**Opis:** Migracja została już wykonana wcześniej.

**Rozwiązanie:** To normalne - skrypt automatycznie pomija już wykonane migracje i kontynuuje działanie.

### Problem: "Permission denied"
**Opis:** Użytkownik bazy nie ma odpowiednich uprawnień.

**Rozwiązanie:** Upewnij się że użytkownik bazy ma odpowiednie uprawnienia:
```sql
GRANT ALL PRIVILEGES ON DATABASE dermag_platform TO dermag_user;
GRANT ALL ON SCHEMA public TO dermag_user;
```

### Problem: "Bash script not executable"
**Opis:** Skrypt `run-all-migrations.sh` nie ma uprawnień do wykonania.

**Rozwiązanie:**
```bash
chmod +x backend/scripts/run-all-migrations.sh
```

### Problem: "psql: command not found"
**Opis:** PostgreSQL client nie jest zainstalowany w systemie.

**Rozwiązanie:**
- **Ubuntu/Debian:** `sudo apt-get install postgresql-client`
- **CentOS/RHEL:** `sudo yum install postgresql`
- **macOS:** `brew install postgresql`
- **Windows:** Zainstaluj PostgreSQL lub użyj WSL

### Problem: "Empty criteria(s) are not allowed for the delete method"
**Opis:** Stary błąd w metodzie `forceSeed()` używający `delete({})`.

**Rozwiązanie:** Ten błąd został naprawiony w aktualnej wersji - używamy teraz `clear()` i `TRUNCATE CASCADE`.

### Problem: "Connection refused"
**Opis:** Nie można połączyć się z bazą danych.

**Rozwiązanie:**
1. Sprawdź czy PostgreSQL działa: `sudo systemctl status postgresql`
2. Sprawdź dane w pliku `.env`:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`

### Problem: "Database does not exist"
**Opis:** Baza danych nie została utworzona.

**Rozwiązanie:**
```bash
npm run db:create
```

## Domyślne dane po seedowaniu

### Admin
- **Username:** `admin`
- **Password:** `Admin123!`
- **Email:** `r.krakowski@der-mag.pl` (lub z `ADMIN_EMAIL` w `.env`)
- **Role:** admin

### Role (10)
1. `admin` - Administrator Systemu
2. `management_board` - Zarząd
3. `manager` - Menedżer
4. `coordinator` - Koordynator
5. `bom_editor` - Edytor BOM-ów
6. `prefabricator` - Prefabrykant
7. `worker` - Pracownik
8. `order_picking` - Pracownik przygotowania
9. `integrator` - System (integracje)
10. `viewer` - Podgląd (tylko odczyt)

### Task Types (13)
1. `SMW` - System Monitoringu Wizyjnego
2. `SDIP` - Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
3. `LAN` - Sieci LAN
4. `SMOKIP_A` - SMOK-IP/CMOK-IP (Wariant A/SKP)
5. `SMOKIP_B` - SMOK-IP/CMOK-IP (Wariant B)
6. `SSWIN` - System Sygnalizacji Włamania i Napadu
7. `SSP` - System Sygnalizacji Pożaru
8. `SUG` - Stałe Urządzenie Gaśnicze
9. `ZASILANIE` - Systemy zasilania
10. `OTK` - Struktury Światłowodowe
11. `SKD` - System Kontroli Dostępu
12. `CCTV` - System Telewizji Przemysłowej
13. `SERWIS` - Zadanie Serwisowe

## Migracje SQL

System zawiera 19 migracji SQL w katalogu `backend/scripts/migrations/`:

1. `20251116_add_refresh_tokens.sql` - Tokeny odświeżania JWT
2. `20251229_add_granular_permissions.sql` - Szczegółowe uprawnienia
3. `20251229_add_workflow_tables.sql` - Tabele workflow
4. `20251230_add_bom_triggers.sql` - Triggery BOM
5. `20251230_add_force_password_change.sql` - Wymuszona zmiana hasła
6. `20251230_add_system_config.sql` - Konfiguracja systemu
7. `20260102_full_permissions_sync.sql` - Synchronizacja uprawnień
8. `20260103_add_viewer_role.sql` - Rola viewer
9. `20260106_add_user_soft_delete.sql` - Soft delete użytkowników
10. `20260106_rename_password_column.sql` - Zmiana nazwy kolumny password
11. `20260106_update_task_types.sql` - Aktualizacja kodów task_types
12. `20260106_workflow_updates.sql` - Aktualizacje workflow
13. `20260107_add_employee_code.sql` - Kod pracownika
14. `20260107_add_subsystem_tasks.sql` - Zadania podsystemów
15. `20260107_create_brigades.sql` - Brygady serwisowe
16. `20260107_create_notification_schedules.sql` - Harmonogramy powiadomień
17. `20260107_create_service_tasks.sql` - Zadania serwisowe
18. `20260108_add_warehouse_stock.sql` - Magazyn
19. `create_documents_tables.sql` - Tabele dokumentów

## Uwagi implementacyjne

- Wszystkie migracje SQL używają `IF NOT EXISTS` więc są idempotentne
- Skrypt Bash ignoruje błędy duplikacji i kontynuuje działanie
- `forceSeed()` używa `TRUNCATE CASCADE` dla bezpiecznego czyszczenia
- Kody task_types są zsynchronizowane z migracją `20260106_update_task_types.sql`
- `clear()` zamiast `delete({})` eliminuje błąd TypeORM "Empty criteria(s)"
- Foreign key checks są tymczasowo wyłączane podczas `forceSeed()`
