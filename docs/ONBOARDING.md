# Onboarding — der-mag-platform

## Wymagania

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Pierwsze uruchomienie

### 1. Klonowanie i instalacja

```bash
git clone https://github.com/Crack8502pl/der-mag-platform.git
cd der-mag-platform
cd backend && npm install
cd ../frontend && npm install
```

### 2. Zmienne środowiskowe

```bash
cp backend/.env.example backend/.env
# Uzupełnij wartości w backend/.env
```

### 3. Baza danych

```bash
cd backend
npm run migration:run
```

### 4. Uruchomienie dev

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

## Struktura projektu

```
der-mag-platform/
├── backend/          # Express + TypeORM API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/   # Auth, CSRF, webhook, validate
│   │   ├── routes/
│   │   ├── services/
│   │   ├── config/
│   │   └── utils/
│   └── tests/
├── frontend/         # React + Vite
│   └── src/
└── docs/             # Dokumentacja
    ├── security/     # Dokumenty bezpieczeństwa
    ├── features/     # Dokumenty funkcjonalności
    └── bom/          # BOM (Bill of Materials)
```

## Dokumentacja

- [Architektura](./ARCHITECTURE.md)
- [Role i uprawnienia](./ROLES_AND_PERMISSIONS.md)
- [Plan bezpieczeństwa OWASP](./security/OWASP_SECURITY_PLAN.md)
- [Przewodnik migracji](./MIGRATION_GUIDE.md)
