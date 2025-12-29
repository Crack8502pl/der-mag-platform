# Der-Mag Platform - Workflow Kontraktowy

## Przegląd implementacji

Został zaimplementowany pełny system workflow kontraktowego dla platformy Der-Mag, obejmujący 8 modułów.

## Status implementacji

### ✅ Moduł 1: Rozszerzenie systemu uprawnień
- [x] Rozszerzona encja `Role.ts` o granularne uprawnienia JSONB
- [x] Dodane nowe permission keys dla 6 modułów
- [x] Utworzony `PermissionMiddleware.ts` do walidacji uprawnień
- [x] Migracja SQL dla aktualizacji uprawnień 6 ról

### ✅ Moduł 2: Kontrakty i podsystemy
- [x] Encje: `Contract`, `Subsystem`
- [x] Serwisy: `ContractService`, `SubsystemService`
- [x] Kontrolery: `ContractController`, `SubsystemController`
- [x] Routy: `/api/contracts`, `/api/subsystems`
- [x] Generator numerów kontraktów (RXXXXXXX_Y)
- [x] Generator numerów podsystemów (PXXXXXYYZZ)

### ✅ Moduł 3: System adresacji IP
- [x] Encje: `NetworkPool`, `NetworkAllocation`, `DeviceIPAssignment`
- [x] Serwisy: `NetworkPoolService`, `NetworkAllocationService`, `IPAssignmentService`
- [x] Kontroler: `NetworkController`
- [x] Routy: `/api/network/*`
- [x] Algorytm alokacji z priorytetami pul
- [x] Seed data dla 3 pul IP

### ✅ Moduł 4: BOM templates (częściowo)
- [x] Encje: `WorkflowBomTemplate`, `WorkflowBomTemplateItem`, `WorkflowGeneratedBom`, `WorkflowGeneratedBomItem`
- [ ] Serwisy BOM (do uzupełnienia)
- [ ] Kontrolery BOM (do uzupełnienia)
- [ ] Seed data dla szablonów

### ✅ Moduł 5: Kompletacja (encje gotowe)
- [x] Encje: `CompletionOrder`, `CompletionItem`, `Pallet`
- [ ] Serwisy kompletacji (do uzupełnienia)
- [ ] Kontrolery kompletacji (do uzupełnienia)
- [ ] Frontend skanera (do implementacji)

### ✅ Moduł 6: Prefabrykacja (encje gotowe)
- [x] Encje: `PrefabricationTask`, `PrefabricationDevice`
- [ ] Serwisy prefabrykacji (do uzupełnienia)
- [ ] Kontrolery prefabrykacji (do uzupełnienia)

### ⏳ Moduł 7: Powiadomienia email
- [ ] NotificationService (do implementacji)
- [ ] Szablony email HTML (do implementacji)

### ✅ Moduł 8: Integracja Jowisz (placeholder)
- [x] `JowiszApiClient.ts` - placeholder
- [x] `JowiszMapper.ts` - placeholder
- [x] `JowiszTypes.ts` - typy
- [x] README z dokumentacją

## Struktura API

### Kontrakty
```
GET    /api/contracts              # Lista kontraktów
GET    /api/contracts/:id          # Szczegóły kontraktu
POST   /api/contracts              # Utworzenie kontraktu
PUT    /api/contracts/:id          # Aktualizacja kontraktu
DELETE /api/contracts/:id          # Usunięcie kontraktu
POST   /api/contracts/:id/approve  # Zatwierdzenie kontraktu
```

### Podsystemy
```
GET    /api/contracts/:contractId/subsystems  # Lista podsystemów kontraktu
POST   /api/contracts/:contractId/subsystems  # Utworzenie podsystemu
GET    /api/subsystems/:id                    # Szczegóły podsystemu
PUT    /api/subsystems/:id                    # Aktualizacja podsystemu
DELETE /api/subsystems/:id                    # Usunięcie podsystemu
POST   /api/subsystems/:id/allocate-network   # Alokacja sieci
GET    /api/subsystems/:id/ip-matrix          # Macierz IP
```

### Sieć
```
GET    /api/network/pools              # Lista pul IP
POST   /api/network/pools              # Utworzenie puli
PUT    /api/network/pools/:id          # Aktualizacja puli
DELETE /api/network/pools/:id          # Usunięcie puli
GET    /api/network/allocations        # Lista alokacji
POST   /api/network/assignments        # Przydzielenie IP
POST   /api/network/assignments/:id/configure  # Konfiguracja urządzenia
POST   /api/network/assignments/:id/verify     # Weryfikacja urządzenia
```

## Uprawnienia

System wykorzystuje granularne uprawnienia JSONB:

### Moduły uprawnień:
- `contracts`: read, create, update, delete, approve, import
- `subsystems`: read, create, update, delete, generateBom, allocateNetwork
- `network`: read, createPool, updatePool, deletePool, allocate, viewMatrix
- `completion`: read, scan, assignPallet, reportMissing, decideContinue, complete
- `prefabrication`: read, receiveOrder, configure, verify, assignSerial, complete
- `notifications`: receiveAlerts, sendManual, configureTriggers

### Role:
1. **Admin** - `all: true` (pełny dostęp)
2. **Manager** - kontrakty, podsystemy, decyzje
3. **BOM Editor** - BOM, alokacja sieci
4. **Coordinator** - tylko odczyt + serwis
5. **Prefabricator** - prefabrykacja, konfiguracja
6. **Worker** - kompletacja, skanowanie

## Instalacja i uruchomienie

### 1. Migracje bazy danych

```bash
# Uruchom migrację uprawnień
psql $DB_CONNECTION_STRING -f scripts/migrations/20251229_add_granular_permissions.sql

# Uruchom migrację tabel workflow
psql $DB_CONNECTION_STRING -f scripts/migrations/20251229_add_workflow_tables.sql

# Seed data - pule IP
psql $DB_CONNECTION_STRING -f scripts/seeds/network_pools.sql
```

### 2. Konfiguracja środowiska

W `.env` dodaj opcjonalnie:

```env
# Jowisz API (opcjonalnie)
JOWISZ_API_URL=https://api.jowisz.example.com
JOWISZ_API_KEY=your-api-key-here

# Email SMTP (dla modułu 7)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### 3. Build i uruchomienie

```bash
cd backend
npm install
npm run build
npm run dev
```

## Przykłady użycia

### Utworzenie kontraktu

```bash
curl -X POST http://localhost:3000/api/contracts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customName": "Kontrakt testowy",
    "orderDate": "2025-01-01",
    "managerCode": "ABC",
    "projectManagerId": 1
  }'
```

### Utworzenie podsystemu

```bash
curl -X POST http://localhost:3000/api/contracts/1/subsystems \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "systemType": "SMW",
    "quantity": 10
  }'
```

### Alokacja sieci

```bash
curl -X POST http://localhost:3000/api/subsystems/1/allocate-network \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Struktura bazy danych

Schemat zawiera 14 nowych tabel:
- 2 tabele kontraktów/podsystemów
- 4 tabele zarządzania siecią IP
- 4 tabele BOM workflow
- 3 tabele kompletacji
- 2 tabele prefabrykacji

Szczegóły w: `scripts/migrations/20251229_add_workflow_tables.sql`

## Do zrobienia

1. **Moduł 4**: Dokończenie serwisów i kontrolerów BOM
2. **Moduł 5**: Implementacja serwisów i kontrolerów kompletacji
3. **Moduł 5**: Frontend skanera (React + html5-qrcode)
4. **Moduł 6**: Implementacja serwisów i kontrolerów prefabrykacji
5. **Moduł 7**: System powiadomień email
6. **Moduł 8**: Integracja z Jowisz API (po otrzymaniu dokumentacji)
7. **Testy**: Testy jednostkowe dla serwisów
8. **Dokumentacja**: JSDoc dla wszystkich endpointów

## Wsparcie

Dla szczegółów implementacji zobacz:
- `/backend/src/entities/` - definicje encji
- `/backend/src/services/` - logika biznesowa
- `/backend/src/controllers/` - kontrolery HTTP
- `/backend/src/routes/` - routing
- `/backend/src/middleware/PermissionMiddleware.ts` - middleware uprawnień
