# Grover Platform - Backend API

Pełnoprawny backend API dla platformy zarządzania zadaniami infrastrukturalnymi Grover.

## 📋 Spis treści

- [Opis projektu](#opis-projektu)
- [Technologie](#technologie)
- [Wymagania](#wymagania)
- [Instalacja](#instalacja)
- [Konfiguracja](#konfiguracja)
- [Uruchomienie](#uruchomienie)
- [Struktura projektu](#struktura-projektu)
- [API Endpoints](#api-endpoints)
- [Baza danych](#baza-danych)
- [System Backup-u](#system-backup-u)
- [Deployment](#deployment)
- [Testowanie](#testowanie)

## 🎯 Opis projektu

Grover Platform to zaawansowany system zarządzania zadaniami infrastrukturalnymi, dedykowany dla branży kolejowej i telekomunikacyjnej. System obsługuje 13 różnych typów zadań, od systemów monitoringu wizyjnego (SMW) po struktury światłowodowe.

### Główne funkcjonalności:

- ✅ **Zarządzanie zadaniami** - Tworzenie, edycja, usuwanie zadań z unikalnym 9-cyfrowym numerem
- 👥 **System użytkowników** - Uwierzytelnianie JWT, role (admin, manager, bom_editor, coordinator, prefabricator, worker)
- 👤 **Moduł zarządzania użytkownikami** (Admin)
  - Lista użytkowników z paginacją
  - Tworzenie i edycja profili
  - Zarządzanie rolami i uprawnieniami
  - Historia aktywności
  - Reset i odzyskiwanie haseł
- 📦 **BOM (Bill of Materials)** - Zarządzanie materiałami i komponentami
- 📋 **Workflow Kontraktowy** (Fazy 1-3)
  - 12 podsystemów kontraktowych
  - Kompletacja materiałów (skanowanie, palety, braki)
  - Prefabrykacja urządzeń (konfiguracja, SN)
  - Generowanie BOM i alokacja IP
- 🔢 **Numery seryjne** - Śledzenie urządzeń i ich lokalizacji
- 🌐 **IP Management** - Automatyczna alokacja adresów IP z puli CIDR
- ✓ **Checklisty** - Szablony aktywności dla każdego typu zadania
- 📸 **Kontrola jakości** - Upload zdjęć z EXIF, GPS, kompresja
- 📧 **System powiadomień email** - SMTP (smokip@der-mag.pl), kolejka Bull+Redis
- 📊 **Metryki i statystyki** - Dashboard z danymi w czasie rzeczywistym

## 🛠 Technologie

- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4.x
- **Język**: TypeScript 5.x
- **ORM**: TypeORM 0.3
- **Baza danych**: PostgreSQL 15
- **Uwierzytelnianie**: JWT + Bcrypt
- **Email**: Nodemailer + Bull Queue (Redis)
- **Upload plików**: Multer
- **Przetwarzanie obrazów**: Sharp
- **EXIF**: exifr
- **Walidacja**: class-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Templating**: Handlebars (email templates)

## 📌 Wymagania

- Node.js >= 20.0.0
- PostgreSQL >= 15
- npm >= 9.0.0

## 📥 Instalacja

1. **Klonowanie repozytorium**

```bash
git clone https://github.com/Crack8502pl/der-mag-platform.git
cd der-mag-platform/backend
```

2. **Instalacja zależności**

```bash
npm install
```

3. **Konfiguracja bazy danych**

Utwórz bazę danych PostgreSQL:

```bash
psql -U postgres
CREATE DATABASE dermag_platform;
CREATE USER dermag_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE dermag_platform TO dermag_user;
\q
```

Uruchom skrypty inicjalizacyjne:

```bash
psql -U dermag_user -d dermag_platform -f scripts/init-db.sql
psql -U dermag_user -d dermag_platform -f scripts/seed-data.sql
```

**Dane seed zawierają:**
- 10 ról z granularnymi uprawnieniami
- 13 typów zadań (task_types) zgodnych z SystemType enum
- Użytkownika admin (username: `admin`, password: `Admin123!`)
- Przykładowe pule IP dla SMW i SDIP
- Szablony BOM i aktywności dla SMW

**Migracja istniejącej bazy:**

Jeśli aktualizujesz istniejący system, uruchom migrację:

```bash
psql -U dermag_user -d dermag_platform -f scripts/migrations/20260106_update_task_types.sql
```

## ⚙️ Konfiguracja

### 🔒 Encrypted Secrets Management

Grover Platform używa **dotenv-vault** do bezpiecznego zarządzania wrażliwymi danymi. Zamiast trzymać hasła w plaintext, wszystkie secrets są szyfrowane.

#### Quick Start

Skopiuj plik `.env.example` do `.env` i dostosuj wartości:

```bash
cp .env.example .env
```

Wypełnij `.env` swoimi lokalnymi wartościami. Plik ten jest w `.gitignore` i nigdy nie jest commitowany.

#### Dla zespołów używających vault

Jeśli projekt już ma skonfigurowany vault, otrzymasz od team leadera klucz development:

```bash
# Dodaj klucz do swojego lokalnego .env:
echo "DOTENV_VAULT_DEVELOPMENT_KEY=dotenv://:key_xxxxx" > .env

# Start aplikacji - automatycznie deszyfuje secrets:
npm run dev
```

#### Szczegółowa dokumentacja

- 📖 **[Setup Guide](docs/ENCRYPTED_ENV_SETUP.md)** - Kompletna instrukcja konfiguracji
- 🔐 **[Security Guide](docs/SECURITY_SECRETS_GUIDE.md)** - Best practices i procedury

### Przykładowa konfiguracja `.env`:

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dermag_platform
DB_USER=dermag_user
DB_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=7d

# SMTP Configuration (Email Notifications)
SMTP_HOST=smtp.nazwa.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smokip@der-mag.pl
SMTP_PASS=your-smtp-password
SMTP_FROM=smokip@der-mag.pl
EMAIL_FROM_NAME=Grover Platform

# Redis (for email queue)
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=optional

# Application URLs
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
SUPPORT_EMAIL=smokip@der-mag.pl

# Admin User (optional - for seeding)
ADMIN_EMAIL=r.krakowski@der-mag.pl

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=http://localhost:3001
```

## 🚀 Uruchomienie

### Środowisko deweloperskie

```bash
npm run dev
```

Serwer uruchomi się na `http://localhost:3000`

### Produkcja

```bash
# Budowanie
npm run build

# Uruchomienie
npm start
```

### Testowanie połączenia

```bash
curl http://localhost:3000/health
```

## 📁 Struktura projektu

```
backend/
├── src/
│   ├── config/              # Konfiguracja (DB, JWT, stałe)
│   ├── entities/            # Encje TypeORM (modele danych)
│   │   ├── User.ts
│   │   ├── Contract.ts
│   │   ├── Subsystem.ts
│   │   ├── CompletionOrder.ts
│   │   ├── PrefabricationTask.ts
│   │   └── ...
│   ├── controllers/         # Kontrolery HTTP
│   │   ├── UserController.ts
│   │   ├── ContractController.ts
│   │   ├── SubsystemController.ts
│   │   ├── CompletionController.ts
│   │   ├── NetworkController.ts
│   │   ├── NotificationController.ts
│   │   └── ...
│   ├── services/            # Logika biznesowa
│   │   ├── EmailService.ts
│   │   ├── EmailQueueService.ts
│   │   ├── UserOnboardingService.ts
│   │   ├── ContractService.ts
│   │   ├── SubsystemService.ts
│   │   ├── NetworkPoolService.ts
│   │   ├── NetworkAllocationService.ts
│   │   └── ...
│   ├── middleware/          # Middleware (auth, walidacja, upload)
│   │   ├── auth.ts
│   │   ├── PermissionMiddleware.ts
│   │   └── ...
│   ├── routes/              # Definicje tras API
│   │   ├── user.routes.ts
│   │   ├── contract.routes.ts
│   │   ├── completion.routes.ts
│   │   ├── network.routes.ts
│   │   └── ...
│   ├── templates/           # Szablony email (Handlebars)
│   │   └── emails/
│   │       ├── user-welcome.hbs
│   │       ├── password-reset.hbs
│   │       ├── completion-*.hbs
│   │       └── ...
│   ├── dto/                 # Data Transfer Objects
│   ├── utils/               # Narzędzia pomocnicze
│   ├── app.ts               # Konfiguracja Express
│   └── index.ts             # Punkt wejścia
├── scripts/                 # Skrypty SQL i migracje
│   ├── migrations/
│   │   ├── 20251229_add_workflow_tables.sql
│   │   ├── 20251229_add_granular_permissions.sql
│   │   └── ...
│   └── seeds/
│       ├── network_pools.sql
│       └── ...
├── uploads/                 # Przesłane pliki
├── backups/                 # Backupy bazy danych
├── docs/                    # Dokumentacja techniczna
│   ├── ENCRYPTED_ENV_SETUP.md
│   ├── SECURITY_SECRETS_GUIDE.md
│   └── TOKEN_ROTATION.md
├── package.json
├── tsconfig.json
├── EMAIL_SYSTEM.md          # Dokumentacja systemu email
└── Dockerfile
```

## 🔌 API Endpoints

### Uwierzytelnianie

```
POST   /api/auth/login           - Logowanie
POST   /api/auth/refresh         - Odświeżenie tokenu
POST   /api/auth/logout          - Wylogowanie
POST   /api/auth/change-password - Zmiana własnego hasła
POST   /api/auth/forgot-password - Odzyskiwanie hasła (publiczne)
GET    /api/auth/me              - Dane zalogowanego użytkownika
```

### Zarządzanie użytkownikami (Admin only)

```
GET    /api/users                      - Lista użytkowników
GET    /api/users/:id                  - Szczegóły użytkownika
POST   /api/users                      - Utworzenie użytkownika
PUT    /api/users/:id                  - Aktualizacja użytkownika
DELETE /api/users/:id                  - Soft delete (dezaktywacja)
POST   /api/users/:id/reset-password   - Reset hasła (admin)
POST   /api/users/:id/deactivate       - Dezaktywacja konta
POST   /api/users/:id/activate         - Aktywacja konta
PUT    /api/users/:id/role             - Zmiana roli
GET    /api/users/:id/activity         - Historia aktywności
GET    /api/users/:id/activity/export  - Eksport aktywności (CSV)
```

### Zadania

```
GET    /api/tasks            - Lista zadań (z filtrami)
GET    /api/tasks/my         - Moje zadania
GET    /api/tasks/:number    - Szczegóły zadania
POST   /api/tasks            - Nowe zadanie
PUT    /api/tasks/:number    - Aktualizacja zadania
PATCH  /api/tasks/:number/status - Zmiana statusu
DELETE /api/tasks/:number    - Usunięcie zadania
POST   /api/tasks/:number/assign - Przypisanie użytkowników
```

### BOM (Bill of Materials)

```
GET    /api/bom/templates              - Szablony BOM
GET    /api/bom/templates/:taskType    - Szablony dla typu zadania
POST   /api/bom/templates              - Nowy szablon
POST   /api/bom/import                 - Import BOM z CSV (L.P.;Nazwa;Suma ilości)
GET    /api/tasks/:number/bom          - Materiały zadania
PUT    /api/tasks/:number/bom/:id      - Aktualizacja materiału
```

### Workflow Kontraktowy

#### Kontrakty i Podsystemy

```
GET    /api/contracts                          - Lista kontraktów
GET    /api/contracts/:id                      - Szczegóły kontraktu
POST   /api/contracts                          - Utworzenie kontraktu
PUT    /api/contracts/:id                      - Aktualizacja kontraktu
DELETE /api/contracts/:id                      - Usunięcie kontraktu
POST   /api/contracts/:id/approve              - Zatwierdzenie kontraktu

GET    /api/contracts/:contractId/subsystems   - Lista podsystemów kontraktu
POST   /api/contracts/:contractId/subsystems   - Utworzenie podsystemu
GET    /api/subsystems/:id                     - Szczegóły podsystemu
PUT    /api/subsystems/:id                     - Aktualizacja podsystemu
DELETE /api/subsystems/:id                     - Usunięcie podsystemu
POST   /api/subsystems/:id/allocate-network    - Alokacja sieci dla podsystemu
GET    /api/subsystems/:id/ip-matrix           - Macierz IP podsystemu
```

#### Network (Zarządzanie siecią)

```
GET    /api/network/pools              - Lista pul IP
POST   /api/network/pools              - Utworzenie puli IP
PUT    /api/network/pools/:id          - Aktualizacja puli
DELETE /api/network/pools/:id          - Usunięcie puli
GET    /api/network/allocations        - Lista alokacji
POST   /api/network/assignments        - Przydzielenie IP urządzeniu
POST   /api/network/assignments/:id/configure  - Konfiguracja urządzenia (NTP=Gateway)
POST   /api/network/assignments/:id/verify     - Weryfikacja urządzenia
```

#### Kompletacja (Faza 2)

```
GET    /api/completion/orders                  - Lista zleceń kompletacji
GET    /api/completion/orders/:id              - Szczegóły zlecenia
POST   /api/completion/orders/:id/scan         - Skanowanie kodu kreskowego
POST   /api/completion/orders/:id/assign-pallet - Przypisanie palety
POST   /api/completion/orders/:id/report-missing - Zgłoszenie braków
POST   /api/completion/orders/:id/decide       - Decyzja managera (kontynuować/wstrzymać)
POST   /api/completion/orders/:id/complete     - Zakończenie kompletacji
```

#### Prefabrykacja (Faza 3)

```
GET    /api/prefabrication/tasks               - Lista zadań prefabrykacji
GET    /api/prefabrication/tasks/:id           - Szczegóły zadania
POST   /api/prefabrication/tasks/:id/receive   - Przyjęcie zlecenia
POST   /api/prefabrication/tasks/:id/configure - Konfiguracja urządzenia
POST   /api/prefabrication/tasks/:id/verify    - Weryfikacja konfiguracji
POST   /api/prefabrication/tasks/:id/assign-sn - Przypisanie numeru seryjnego
POST   /api/prefabrication/tasks/:id/complete  - Zakończenie prefabrykacji
```

### Powiadomienia Email

```
POST   /api/notifications/test                - Test wysyłki email
GET    /api/notifications/config              - Status konfiguracji SMTP
GET    /api/notifications/queue/stats         - Statystyki kolejki emaili
GET    /api/notifications/queue/failed        - Nieudane wysyłki
POST   /api/notifications/queue/retry/:jobId  - Ponowienie nieudanego zadania
POST   /api/notifications/queue/clear         - Wyczyszczenie kolejki (admin)
```

### Urządzenia

```
POST   /api/devices/serial             - Rejestracja urządzenia
GET    /api/devices/:serialNumber      - Pobierz urządzenie
PUT    /api/devices/:id/verify         - Weryfikacja urządzenia
GET    /api/tasks/:number/devices      - Urządzenia zadania
```

### Aktywności (Checklisty)

```
GET    /api/activities/templates              - Szablony aktywności
GET    /api/activities/templates/:taskType    - Szablony dla typu
GET    /api/tasks/:number/activities          - Aktywności zadania
POST   /api/activities/:id/complete           - Oznacz jako wykonane
```

### Kontrola jakości

```
POST   /api/quality/photos            - Upload zdjęcia
GET    /api/tasks/:number/photos      - Zdjęcia zadania
PUT    /api/quality/photos/:id/approve - Zatwierdzenie zdjęcia
```

### IP Management

```
GET    /api/ip/pools         - Pule IP
POST   /api/ip/allocate      - Alokacja IP
POST   /api/ip/release       - Zwolnienie IP
```

### Metryki

```
GET    /api/metrics/dashboard      - Dashboard
GET    /api/metrics/task-types     - Statystyki typów zadań
GET    /api/metrics/users/:userId  - Statystyki użytkownika
GET    /api/metrics/daily          - Statystyki dzienne
```

### Użytkownicy

```
GET    /api/users       - Lista użytkowników
POST   /api/users       - Nowy użytkownik
PUT    /api/users/:id   - Aktualizacja użytkownika
```

## 💾 Baza danych

### Główne tabele:

- **users** - Użytkownicy systemu
- **roles** - Role i uprawnienia
- **task_types** - 13 typów zadań
- **tasks** - Zadania (z 9-cyfrowym numerem)
- **bom_templates** - Szablony materiałów
- **task_materials** - Materiały zadań
- **devices** - Urządzenia z numerami seryjnymi
- **ip_pools** - Pule adresów IP
- **activity_templates** - Szablony aktywności
- **task_activities** - Aktywności zadań
- **quality_photos** - Zdjęcia kontroli jakości
- **task_assignments** - Przypisania użytkowników
- **task_metrics** - Metryki zadań

### Indeksy i optymalizacje:

- Indeksy na `task_number` (unikalne)
- Indeksy na `status`, `task_type_id`
- Indeksy na `serial_number` dla urządzeń
- Indeksy kompozytowe dla wydajności

## 💾 System Backup-u

Grover Platform posiada kompleksowy system automatycznych backupów bazy danych PostgreSQL.

### Skrypty backup-u

Dostępne są 3 skrypty bash w katalogu `scripts/`:

#### 1. `backup-db.sh` - Ręczny backup bazy

```bash
# Użycie
npm run db:backup

# Lub bezpośrednio
bash scripts/backup-db.sh
```

**Funkcjonalności:**
- Backup PostgreSQL z użyciem `pg_dump`
- Automatyczna kompresja gzip
- Format nazwy: `grover_backup_YYYYMMDD_HHMMSS.sql.gz`
- Retencja 30 dni (automatyczne usuwanie starszych backupów)
- Informacyjne logi z emoji
- Katalog: `./backups/`

#### 2. `restore-db.sh` - Przywracanie bazy

```bash
# Użycie
npm run db:restore backups/grover_backup_20231215_120000.sql.gz

# Lub bezpośrednio
bash scripts/restore-db.sh backups/grover_backup_20231215_120000.sql.gz
```

**Funkcjonalności:**
- Automatyczne rozpakowanie .gz
- Potwierdzenie użytkownika przed nadpisaniem
- Ostrzeżenie o utracie danych
- Walidacja pliku backup

#### 3. `setup-backup-cron.sh` - Automatyczne backupy

```bash
# Użycie
npm run db:setup-cron

# Lub bezpośrednio  
bash scripts/setup-backup-cron.sh
```

**Konfiguracja:**
- Dodaje cron job dla codziennych backupów o 2:00 w nocy
- Logowanie do `/var/log/grover-backup.log`
- Automatyczne wykrywanie duplikatów

### Zmienne środowiskowe

Skrypty używają zmiennych z `.env`:

```env
DB_NAME=dermag_platform
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=your-password
```

### Lista backupów

```bash
# Zobacz wszystkie backupy
ls -lh backups/

# Sprawdź rozmiar
du -sh backups/
```

## 🐳 Deployment

### Docker

Build obrazu:

```bash
docker build -t grover-backend:latest .
```

Uruchomienie kontenera:

```bash
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=secret \
  --name grover-api \
  grover-backend:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dermag_platform
      POSTGRES_USER: dermag_user
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PASSWORD: secret
    depends_on:
      - postgres

volumes:
  pgdata:
```

## 🧪 Testowanie

### Logowanie (uzyskanie tokenu)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }'
```

### Pobranie listy zadań

```bash
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Utworzenie nowego zadania

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Montaż SMW Stacja Warszawa",
    "taskTypeId": 1,
    "location": "Warszawa Centralna",
    "client": "PKP PLK"
  }'
```

## 📝 Uwagi

### Domyślne konto administratora:

- **Username**: `admin`
- **Password**: `Admin123!`
- **Email**: `admin@dermag.lan`

⚠️ **Zmień hasło po pierwszym logowaniu w środowisku produkcyjnym!**

### Bezpieczeństwo:

- ✅ **Encrypted secrets** - dotenv-vault AES-256-GCM encryption
- ✅ **JWT token-based authentication**
- ✅ **Bcrypt password hashing** (10 rounds)
- ✅ **Helmet.js security headers**
- ✅ **Rate limiting** (100 req/15min)
- ✅ **CORS configuration**
- ✅ **Input validation**
- ✅ **SQL injection prevention**
- ✅ **XSS protection**

#### 🔐 Secrets Management

System używa zaszyfrowanych zmiennych środowiskowych:

```bash
# Helper scripts do zarządzania vault:
npm run env:init    # Inicjalizacja vault (pierwszy raz)
npm run env:push    # Push lokalnego .env do vault
npm run env:pull    # Pull z vault do lokalnego .env
npm run env:build   # Build zaszyfrowanego .env.vault
npm run env:keys    # Pokaż klucze deszyfrujące
```

**Dokumentacja bezpieczeństwa:**
- 📖 [Encrypted Environment Setup](docs/ENCRYPTED_ENV_SETUP.md)
- 🔐 [Security & Secrets Guide](docs/SECURITY_SECRETS_GUIDE.md)

### Wydajność:

- ✅ Database indexing
- ✅ Image compression
- ✅ Pagination support
- ✅ Query optimization
- ✅ Connection pooling

## 📄 Licencja

MIT License - siehe [LICENSE](../LICENSE)

## 👥 Autorzy

Grover Platform Development Team

## 📞 Wsparcie

W przypadku problemów lub pytań:
- 📧 Email: support@grover.lan
- 🌐 URL: https://api.grover.lan

---

**Grover Platform** © 2025 Cr@ck8502PL
