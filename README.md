# Grover Platform

**Platforma Zarządzania Zadaniami Infrastrukturalnymi**

System zarządzania projektami infrastrukturalnymi dla branży kolejowej i telekomunikacyjnej.

## 📋 Opis

Grover Platform to kompleksowy system do zarządzania zadaniami infrastrukturalnymi, obsługujący 13 różnych typów projektów - od systemów monitoringu wizyjnego (SMW) po struktury światłowodowe.

## 🚀 Funkcjonalności

### Backend
- ✅ **Zarządzanie zadaniami** - unikalne 9-cyfrowe numery zadań
- 👥 **Uwierzytelnianie i autoryzacja**
  - JWT Token Rotation (8h access, 7d refresh)
  - Force Password Change - wymuszanie zmiany hasła przy pierwszym logowaniu
  - RBAC z granularnymi uprawnieniami (contracts, subsystems, network, completion, prefabrication, notifications)
- 👤 **Zarządzanie użytkownikami** (moduł administratora)
  - Lista użytkowników z paginacją i filtrowaniem
  - Tworzenie i edycja profili użytkowników
  - Zarządzanie rolami (admin, management_board, manager, coordinator, bom_editor, prefabricator, worker, order_picking, integrator, viewer)
  - Historia aktywności użytkowników
  - Resetowanie i odzyskiwanie haseł
  - Dezaktywacja kont użytkowników
  - Automatyczne wysyłanie emaili z danymi logowania
- 📦 **BOM (Bill of Materials)**
  - Zarządzanie materiałami i komponentami
  - BOM Triggers - automatyczne powiadomienia i akcje
  - Material Management Module - import CSV/Excel, integracja Symfonia
  - Import BOM z CSV (format: L.P.;Nazwa;Suma ilości)
- 📄 **Document Management** - zarządzanie dokumentami kontraktów (PDF, DOCX, XLSX)
- 📋 **Workflow Kontraktowy** (Fazy 1-3)
  - System kontraktowy z 13 podsystemami
  - Generowanie BOM dla podsystemów
  - Kompletacja materiałów (skanowanie, palety, braki)
  - Prefabrykacja urządzeń (konfiguracja, weryfikacja, numery seryjne)
  - Konfiguracja NTP = Gateway
- 🔢 **Śledzenie numerów seryjnych** urządzeń
- 🌐 **Automatyczna alokacja adresów IP** z pul CIDR
- ✓ **Szablony checklistów** dla każdego typu zadania
- 📸 **Kontrola jakości** - upload zdjęć z EXIF, GPS, automatyczna kompresja
- 📊 **Dashboard** z metrykami i statystykami w czasie rzeczywistym
- 📧 **System powiadomień email** (SMTP: smokip@der-mag.pl)
  - Powiadomienia o zarządzaniu użytkownikami
  - Powiadomienia workflow kontraktowego
  - Szablony email z polityką haseł
- 📂 **File Generator**
  - Excel - generowanie raportów z ExcelJS
  - Word - generowanie dokumentów z docxtemplater
  - PDF - wypełnianie formularzy PDF z pdf-lib
  - WebDAV Server - udostępnianie wygenerowanych plików

### Frontend
- ⚛️ **React 18 + TypeScript + Vite** - nowoczesny stack frontend
- 🎨 **Grover Theme** - ciemny motyw z pomarańczowymi akcentami (#ff6b35)
- 🔐 **Protected Routes** - routing z granularnymi uprawnieniami
- 🏪 **Zustand State Management** - zarządzanie stanem aplikacji
- 🔄 **Force Password Change** - wymuszanie zmiany hasła z walidacją w czasie rzeczywistym
- 👤 **Moduł zarządzania użytkownikami** - komponenty w `/users/`
- 🔑 **Odzyskiwanie hasła** - strona "Zapomniałem hasła" (ForgotPasswordPage)
- 📝 **Ulepszone komunikaty błędów logowania**:
  - "Konto nie istnieje" - nieistniejący login
  - "Błędne hasło" - nieprawidłowe hasło
  - "Twoje konto zostało zablokowane" - zablokowane konto
- 📱 **Responsive Design** - interfejs dostosowany do urządzeń mobilnych

## 🛠 Technologie

### Backend
- Node.js 20 LTS + TypeScript 5.x
- Express 4.x
- TypeORM + PostgreSQL 15
- JWT + Bcrypt
- Sharp (przetwarzanie obrazów)
- Helmet, CORS, Rate Limiting
- **File Generator:**
  - ExcelJS (generowanie raportów Excel)
  - docxtemplater (generowanie dokumentów Word)
  - pdf-lib (edycja formularzy PDF)
  - webdav-server (udostępnianie plików)

### Frontend
- React 18.3
- TypeScript 5.6
- Vite 7.3 (build tool)
- React Router DOM 7.1 (routing)
- Zustand 5.0 (state management)
- Axios 1.7 (HTTP client)

## 📦 Struktura projektu

```
grover-platform/
├── backend/              # Backend API (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/      # Konfiguracja
│   │   ├── entities/    # Encje bazy danych
│   │   ├── controllers/ # Kontrolery HTTP
│   │   ├── services/    # Logika biznesowa
│   │   ├── middleware/  # Middleware
│   │   ├── routes/      # Trasy API
│   │   ├── dto/         # Data Transfer Objects
│   │   ├── file-generator/  # Moduł generowania plików
│   │   │   ├── excel.service.ts
│   │   │   ├── word.service.ts
│   │   │   ├── pdf.service.ts
│   │   │   └── webdav.server.ts
│   │   └── integrations/    # Integracje zewnętrzne
│   │       └── symfonia/    # Integracja Symfonia Handel
│   ├── scripts/         # Skrypty SQL i migracje
│   │   ├── backup-db.sh       # Backup bazy danych
│   │   ├── restore-db.sh      # Przywracanie bazy
│   │   └── setup-backup-cron.sh # Konfiguracja automatycznych backupów
│   ├── backups/         # Katalog backupów bazy danych
│   ├── docs/            # Dokumentacja backend
│   │   ├── ENCRYPTED_ENV_SETUP.md
│   │   ├── SECURITY_SECRETS_GUIDE.md
│   │   └── TOKEN_ROTATION.md
│   └── README.md        # Dokumentacja backend
├── frontend/             # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/  # Komponenty React
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API services
│   │   ├── stores/      # Zustand stores
│   │   ├── types/       # TypeScript types
│   │   └── styles/      # Style i motywy
│   └── README.md        # Dokumentacja frontend
├── docs/                 # Dokumentacja projektu
│   ├── WORKFLOW_IMPLEMENTATION.md
│   ├── MIGRATION_GUIDE.md
│   ├── ROLES_AND_PERMISSIONS.md
│   └── SYMFONIA_EXPORT_GUIDE.md
├── LICENSE
└── README.md            # Ten plik
```

## 🔧 Instalacja i uruchomienie

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edytuj .env z własnymi ustawieniami
npm run dev
```

Szczegółowa dokumentacja: [backend/README.md](backend/README.md)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Zaktualizuj VITE_API_BASE_URL jeśli potrzeba
npm run dev
```

Frontend dostępny pod: `http://localhost:5173`

Szczegółowa dokumentacja: [frontend/README.md](frontend/README.md)

### 🔐 Domyślne dane logowania

Po uruchomieniu bazy danych i załadowaniu danych seed, dostępne są domyślne konto administratora:

```
Username: admin
Password: Admin123!
Email: r.krakowski@der-mag.pl
```

**Uwaga:** Zmień hasło po pierwszym logowaniu w środowisku produkcyjnym!

## 📚 API Endpoints

### Uwierzytelnianie
- **Auth**: `/api/auth/*` - Login, logout, token rotation, session management
  - `/api/auth/forgot-password` - Odzyskiwanie hasła

### Zarządzanie użytkownikami
- **Users**: `/api/users/*` - Zarządzanie użytkownikami (tylko admin)
  - `/api/users` (GET) - Lista użytkowników
  - `/api/users/:id` (GET) - Szczegóły użytkownika
  - `/api/users` (POST) - Tworzenie użytkownika
  - `/api/users/:id` (PUT) - Aktualizacja użytkownika
  - `/api/users/:id` (DELETE) - Soft delete użytkownika
  - `/api/users/:id/reset-password` (POST) - Reset hasła
  - `/api/users/:id/deactivate` (POST) - Dezaktywacja konta
  - `/api/users/:id/activate` (POST) - Aktywacja konta
  - `/api/users/:id/role` (PUT) - Zmiana roli
  - `/api/users/:id/activity` (GET) - Historia aktywności

### Zarządzanie zadaniami
- **Tasks**: `/api/tasks/*` - Zarządzanie zadaniami
- **Activities**: `/api/activities/*` - Checklisty

### BOM i materiały
- **BOM**: `/api/bom/*` - Bill of Materials
- **Materials**: `/api/materials/*` - Material Management Module
  - `/api/materials/stocks` - Zarządzanie magazynem
  - `/api/materials/stocks/import` - Import CSV/Excel
  - `/api/materials/stocks/reserve` - Rezerwacja materiałów
- **BOM Triggers**: `/api/bom-triggers/*` - Automatyczne akcje i powiadomienia

### Workflow kontraktowy
- **Contracts**: `/api/contracts/*` - Zarządzanie kontraktami
- **Subsystems**: `/api/subsystems/*` - Podsystemy kontraktów (13 typów)
- **Network**: `/api/network/*` - Zarządzanie pulami IP i alokacja
- **Completion**: `/api/completion/*` - Kompletacja materiałów
  - `/api/completion/orders` (GET) - Lista zleceń kompletacji
  - `/api/completion/orders/:id` (GET) - Szczegóły zlecenia
  - `/api/completion/orders/:id/scan` (POST) - Skanowanie kodu kreskowego
  - `/api/completion/orders/:id/assign-pallet` (POST) - Przypisanie palety
  - `/api/completion/orders/:id/report-missing` (POST) - Zgłoszenie braków
  - `/api/completion/orders/:id/complete` (POST) - Zakończenie kompletacji
- **Prefabrication**: `/api/prefabrication/*` - Prefabrykacja urządzeń
  - `/api/prefabrication/tasks` (GET) - Lista zadań prefabrykacji
  - `/api/prefabrication/tasks/:id` (GET) - Szczegóły zadania
  - `/api/prefabrication/tasks/:id/receive` (POST) - Przyjęcie zlecenia
  - `/api/prefabrication/tasks/:id/configure` (POST) - Konfiguracja urządzenia
  - `/api/prefabrication/tasks/:id/verify` (POST) - Weryfikacja konfiguracji
  - `/api/prefabrication/tasks/:id/complete` (POST) - Zakończenie prefabrykacji

### Dokumenty i pliki
- **Documents**: `/api/documents/*` - Zarządzanie dokumentami (PDF, DOCX, XLSX)
- **Templates**: `/api/document-templates/*` - Szablony dokumentów
- **Import**: `/api/import/*` - Import danych z CSV
- **File Generator**: Generowanie raportów (Excel, Word, PDF) przez WebDAV

### Inne
- **Devices**: `/api/devices/*` - Urządzenia i numery seryjne
- **Quality**: `/api/quality/*` - Kontrola jakości
- **IP**: `/api/ip/*` - Zarządzanie IP (legacy)
- **Metrics**: `/api/metrics/*` - Statystyki
- **Notifications**: `/api/notifications/*` - System powiadomień email

## 🔑 System uprawnień (RBAC)

System wykorzystuje **granularne uprawnienia** na poziomie modułów i akcji. Każda rola posiada uprawnienia do konkretnych operacji w różnych modułach.

### Role systemowe
- **admin** - Pełne uprawnienia (`all: true`)
- **management_board** - Zarządzanie menadżerami, przydzielanie projektów, raporty dobowe
- **manager** - Zarządzanie projektami, użytkownikami i raportami
- **coordinator** - Koordynacja zadań serwisowych, przypisywanie pracowników
- **bom_editor** - Zarządzanie materiałami i szablonami BOM
- **prefabricator** - Prefabrykacja urządzeń, weryfikacja numerów seryjnych
- **worker** - Realizacja zadań, kompletacja, upload zdjęć
- **order_picking** - Kompletacja podzespołów, dodawanie numerów seryjnych
- **integrator** - System do integracji z platformami zewnętrznymi
- **viewer** - Tylko odczyt wszystkich modułów

### Moduły uprawnień

#### contracts
Zarządzanie kontraktami
- `read` - Przeglądanie kontraktów
- `create` - Tworzenie nowych kontraktów
- `update` - Edycja kontraktów
- `delete` - Usuwanie kontraktów
- `approve` - Zatwierdzanie kontraktów
- `import` - Import kontraktów z zewnętrznych systemów

#### subsystems
Zarządzanie podsystemami kontraktów
- `read` - Przeglądanie podsystemów
- `create` - Tworzenie podsystemów
- `update` - Edycja podsystemów
- `delete` - Usuwanie podsystemów
- `generateBom` - Generowanie BOM dla podsystemu
- `allocateNetwork` - Alokacja adresów IP

#### network
Zarządzanie siecią i adresami IP
- `read` - Przeglądanie pul IP
- `createPool` - Tworzenie pul IP
- `updatePool` - Edycja pul IP
- `deletePool` - Usuwanie pul IP
- `allocate` - Alokacja adresów IP
- `viewMatrix` - Przeglądanie macierzy IP

#### completion
Kompletacja materiałów
- `read` - Przeglądanie zleceń kompletacji
- `scan` - Skanowanie kodów kreskowych
- `assignPallet` - Przypisywanie palet
- `reportMissing` - Zgłaszanie braków
- `decideContinue` - Decyzja o kontynuacji mimo braków
- `complete` - Zakończenie kompletacji

#### prefabrication
Prefabrykacja urządzeń
- `read` - Przeglądanie zleceń prefabrykacji
- `receiveOrder` - Przyjmowanie zleceń
- `configure` - Konfiguracja urządzeń
- `verify` - Weryfikacja konfiguracji
- `assignSerial` - Przypisywanie numerów seryjnych
- `complete` - Zakończenie prefabrykacji

#### notifications
System powiadomień
- `receiveAlerts` - Otrzymywanie powiadomień
- `sendManual` - Wysyłanie ręcznych powiadomień
- `configureTriggers` - Konfiguracja triggerów BOM

Szczegóły: [docs/ROLES_AND_PERMISSIONS.md](docs/ROLES_AND_PERMISSIONS.md)

## 🎯 Typy zadań

System obsługuje 13 typów zadań:

1. **SMW** - System Monitoringu Wizyjnego
2. **CSDIP** - Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
3. **LAN PKP PLK** - Sieci LAN PKP PLK
4. **SMOK-IP/CMOK-IP (Wariant A/SKP)**
5. **SMOK-IP/CMOK-IP (Wariant B)**
6. **SSWiN** - System Sygnalizacji Włamania i Napadu
7. **SSP** - System Sygnalizacji Pożaru
8. **SUG** - Stałe Urządzenie Gaśnicze
9. **Obiekty Kubaturowe**
10. **Kontrakty Liniowe**
11. **LAN Strukturalny Miedziana**
12. **Zasilania**
13. **Struktury Światłowodowe**

## 🔐 Bezpieczeństwo

### Uwierzytelnianie i autoryzacja
- **JWT Token Rotation** - automatyczna rotacja tokenów (8h access, 7d refresh)
- **Force Password Change** - wymuszanie zmiany hasła przy pierwszym logowaniu
- **Bcrypt password hashing** (10 rounds)
- **RBAC** - Role-Based Access Control z granularnymi uprawnieniami
- **Session Management** - zarządzanie sesjami użytkowników
- **Token Reuse Detection** - wykrywanie ponownego użycia tokenów

### Bezpieczeństwo HTTP
- **Helmet.js** - security headers
- **Rate limiting** (100 req/15min)
- **CORS configuration**
- **Input validation** (class-validator)
- **SQL injection prevention** (TypeORM)
- **XSS protection**

### Zarządzanie sekretami
- **Encrypted secrets** - dotenv-vault z szyfrowaniem AES-256-GCM
- **Separate JWT secrets** - osobne klucze dla access i refresh tokenów
- **No secrets in code** - wszystkie wrażliwe dane w zmiennych środowiskowych

### Dokumentacja bezpieczeństwa
- 📖 [Encrypted Environment Setup](backend/docs/ENCRYPTED_ENV_SETUP.md) - Konfiguracja zaszyfrowanych zmiennych
- 🔐 [Security & Secrets Guide](backend/docs/SECURITY_SECRETS_GUIDE.md) - Best practices i procedury
- 🔄 [Token Rotation Guide](backend/docs/TOKEN_ROTATION.md) - System rotacji tokenów

## 💾 System Backup-u Bazy Danych

Platforma Grover zawiera kompletny system automatycznych backupów bazy PostgreSQL.

### Dostępne skrypty

```bash
# Ręczny backup bazy danych
npm run db:backup

# Przywracanie z backupu
npm run db:restore backups/grover_backup_YYYYMMDD_HHMMSS.sql.gz

# Konfiguracja automatycznych backupów (cron)
npm run db:setup-cron
```

### Funkcjonalności systemu backup-u

- ✅ **Automatyczny backup** - pg_dump z kompresją gzip
- ✅ **Retencja 30 dni** - automatyczne usuwanie starszych backupów
- ✅ **Cron integration** - codzienne backupy o 2:00 w nocy
- ✅ **Informacyjne logi** - kolorowe emoji i statusy
- ✅ **Bezpieczne przywracanie** - potwierdzenie użytkownika przed nadpisaniem
- ✅ **Format nazwy** - `grover_backup_YYYYMMDD_HHMMSS.sql.gz`
- ✅ **Katalog** - `backend/backups/`

Szczegółowe informacje w [backend/README.md](backend/README.md)

## 📄 Licencja

MIT License - zobacz [LICENSE](LICENSE)

## 👥 Wsparcie

Dla szczegółowej dokumentacji API, patrz [backend/README.md](backend/README.md)

---

**Grover Platform** © 2025 Cr@ck8502PL
