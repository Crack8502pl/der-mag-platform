# Macierz Uprawnień - Grover Platform

**Wersja:** 2.0  
**Data:** 2026-01-02  
**Status:** Produkcja

---

## 📋 Przegląd Systemu

System uprawnień Grover Platform oparty jest na modelu **RBAC (Role-Based Access Control)** z granularnymi uprawnieniami przechowywanymi w formacie JSONB.

### Statystyki

- **Liczba ról:** 9
- **Liczba modułów:** 15
- **Liczba akcji:** 27
- **Źródło prawdy:** `docs/permissions/uprawnienia_system.xml`

---

## 🎭 Role (9 ról)

### 1. Admin - Administrator Systemu
- **Kod:** `admin`
- **Poziom:** 100
- **Is Admin:** TAK
- **Opis:** Pełny dostęp do wszystkich funkcji systemu
- **Uprawnienia:** `{ all: true }` - automatyczny dostęp do wszystkiego

### 2. Management Board - Zarząd
- **Kod:** `management_board`
- **Poziom:** 90
- **Is Admin:** NIE
- **Opis:** Zarządzanie Menadżerami, przydzielanie projektów, stałe raporty dobowe z realizacji prac, Ocena z realizacji projektów
- **Kluczowe uprawnienia:**
  - Tworzenie wszystkich typów zadań
  - Zarządzanie użytkownikami (create, update)
  - Zatwierdzanie kontraktów i zdjęć
  - Tworzenie i zarządzanie pulami IP

### 3. Manager - Menedżer
- **Kod:** `manager`
- **Poziom:** 80
- **Is Admin:** NIE
- **Opis:** Zarządzanie projektami, użytkownikami i raportami
- **Kluczowe uprawnienia:**
  - Tworzenie wszystkich typów zadań
  - Odczyt użytkowników (bez tworzenia/usuwania)
  - Zatwierdzanie zdjęć i materiałów
  - Eksport raportów

### 4. Coordinator - Koordynator
- **Kod:** `coordinator`
- **Poziom:** 60
- **Is Admin:** NIE
- **Opis:** Koordynacja zadań serwisowych, przypisywanie pracowników
- **Kluczowe uprawnienia:**
  - ⚠️ **Tworzenie TYLKO zadań typu SERWIS** (wymaga walidacji w kontrolerze)
  - Przypisywanie pracowników do zadań
  - Odczyt wszystkich modułów
  - Tworzenie dokumentów

**Uwaga specjalna:** Coordinator może tworzyć tylko zadania typu `SERWIS`. Backend musi walidować typ zadania podczas tworzenia.

### 5. BOM Editor - Edytor BOM-ów
- **Kod:** `bom_editor`
- **Poziom:** 50
- **Is Admin:** NIE
- **Opis:** Zarządzanie materiałami i szablonami BOM
- **Kluczowe uprawnienia:**
  - Pełne zarządzanie BOM (CRUD)
  - Generowanie BOM dla podsystemów
  - Alokacja zakresu IP
  - Konfiguracja trigerów powiadomień

### 6. Prefabricator - Prefabrykant
- **Kod:** `prefabricator`
- **Poziom:** 40
- **Is Admin:** NIE
- **Opis:** Prefabrykacja urządzeń, weryfikacja numerów seryjnych (przypisywanie do adresów IP)
- **Kluczowe uprawnienia:**
  - Pełny dostęp do modułu prefabrication
  - Weryfikacja i przypisywanie numerów seryjnych
  - Konfiguracja urządzeń
  - Tworzenie i aktualizacja urządzeń

### 7. Worker - Pracownik
- **Kod:** `worker`
- **Poziom:** 20
- **Is Admin:** NIE
- **Opis:** Realizacja zadań, kompletacja, upload zdjęć
- **Kluczowe uprawnienia:**
  - ⚠️ **Edycja TYLKO własnych zadań** (wymaga walidacji assigned_to)
  - Pełny dostęp do kompletacji
  - Upload zdjęć
  - Skanowanie i przypisywanie do palet

**Uwaga specjalna:** Worker może edytować tylko zadania, do których jest przypisany. Backend musi sprawdzać `assigned_to`.

### 8. Order Picking - Pracownik przygotowania
- **Kod:** `order_picking`
- **Poziom:** 40
- **Is Admin:** NIE
- **Opis:** Kompletacja podzespołów, Dodawanie numerów seryjnych do urządzeń
- **Kluczowe uprawnienia:**
  - Pełny dostęp do kompletacji
  - Weryfikacja urządzeń
  - Upload zdjęć
  - Wysyłka ręcznych powiadomień

### 9. Integrator - System
- **Kod:** `integrator`
- **Poziom:** 90
- **Is Admin:** NIE
- **Opis:** Integruje z platformami zewnętrznymi
- **Kluczowe uprawnienia:**
  - Dostęp API do kontraktów, BOM, urządzeń
  - BRAK dostępu do dashboard i UI
  - Import kontraktów
  - Weryfikacja urządzeń

**Uwaga specjalna:** Integrator to rola techniczna dla API - nie ma dostępu do interfejsu użytkownika.

---

## 📦 Moduły (15 modułów)

| ID | Kod | Nazwa | Ścieżka Frontend | API Endpoint | Ikona |
|----|-----|-------|------------------|--------------|-------|
| 1 | `dashboard` | Dashboard | `/dashboard` | - | 📊 |
| 2 | `contracts` | Kontrakty | `/contracts` | `/api/contracts` | 📝 |
| 3 | `subsystems` | Podsystemy | `/subsystems` | `/api/subsystems` | 🔧 |
| 4 | `tasks` | Zadania | `/tasks` | `/api/tasks` | 📋 |
| 5 | `completion` | Kompletacja | `/completion` | `/api/completion` | 📦 |
| 6 | `prefabrication` | Prefabrykacja | `/prefabrication` | `/api/prefabrication` | 🏭 |
| 7 | `network` | Sieć/IP | `/network` | `/api/network` | 🌐 |
| 8 | `bom` | Materiały BOM | `/bom` | `/api/bom` | 🔩 |
| 9 | `devices` | Urządzenia | `/devices` | `/api/devices` | 📱 |
| 10 | `users` | Użytkownicy | `/admin/users` | `/api/users` | 👥 |
| 11 | `reports` | Raporty | `/reports` | `/api/reports` | 📈 |
| 12 | `settings` | Ustawienia konta | `/settings` | `/api/auth` | ⚙️ |
| 13 | `notifications` | Powiadomienia | `/notifications` | `/api/notifications` | 🔔 |
| 14 | `documents` | Dokumenty | `/documents` | `/api/documents` | 📄 |
| 15 | `photos` | Zdjęcia | `/photos` | `/api/photos` | 📷 |

---

## ⚡ Akcje (27 akcji)

### Podstawowe (CRUD)
- `read` - Odczyt
- `create` - Tworzenie
- `update` - Edycja
- `delete` - Usuwanie

### Workflow
- `approve` - Zatwierdzanie
- `assign` - Przypisywanie
- `verify` - Weryfikacja
- `complete` - Zakończenie
- `assignPallet` - Przypisanie do palety
- `assignSerial` - Przypisanie numeru seryjnego
- `receiveOrder` - Otrzymanie zadania
- `reportMissing` - Zgłoszenie braków
- `decideContinue` - Warunkowa zgoda przy braku materiałów

### Specjalne
- `scan` - Skanowanie
- `viewMatrix` - Podgląd macierzy
- `allocate` - Alokacja
- `generateBom` - Generuj BOM
- `allocateNetwork` - Przypisywanie zakresu IP
- `createPool` - Tworzenie puli adresowej
- `updatePool` - Aktualizacja puli adresowej
- `deletePool` - Zwalnianie adresów IP

### Raportowanie
- `export` - Eksport
- `import` - Import

### Admin
- `configure` - Konfiguracja
- `configureTriggers` - Tworzenie trigerów

### Powiadomienia
- `receiveAlerts` - Odbieranie alertów
- `sendManual` - Wysyłka ręczna

---

## 📊 Pełna Macierz Uprawnień

### Dashboard

| Rola | read |
|------|------|
| admin | ✅ |
| management_board | ✅ |
| manager | ✅ |
| coordinator | ✅ |
| bom_editor | ✅ |
| prefabricator | ✅ |
| worker | ✅ |
| order_picking | ✅ |
| integrator | ❌ |

### Contracts

| Rola | read | create | update | delete | approve | import |
|------|------|--------|--------|--------|---------|--------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| coordinator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| integrator | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

### Subsystems

| Rola | read | create | update | delete | generateBom | allocateNetwork |
|------|------|--------|--------|--------|-------------|-----------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| coordinator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| bom_editor | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Tasks

| Rola | read | create | update | delete | assign |
|------|------|--------|--------|--------|--------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ (wszystkie) | ✅ | ❌ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ | ✅ |
| coordinator | ✅ | SERWIS⚠️ | ✅ | ❌ | ✅ |
| bom_editor | ✅ | ❌ | ❌ | ❌ | ❌ |
| prefabricator | ✅ | ❌ | ❌ | ❌ | ❌ |
| worker | ✅ | ❌ | WŁASNE⚠️ | ❌ | ❌ |
| order_picking | ✅ | ❌ | ❌ | ❌ | ❌ |

**Uwagi specjalne:**
- ⚠️ `coordinator` może tworzyć tylko zadania typu `SERWIS` - wymaga walidacji w TaskController
- ⚠️ `worker` może edytować tylko zadania, do których jest przypisany - wymaga sprawdzenia `assigned_to`
- `management_board` może tworzyć wszystkie typy zadań

### Completion

| Rola | read | scan | assignPallet | reportMissing | decideContinue | complete |
|------|------|------|--------------|---------------|----------------|----------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| manager | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| coordinator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| prefabricator | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| worker | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| order_picking | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

### Prefabrication

| Rola | read | receiveOrder | configure | verify | assignSerial | complete |
|------|------|--------------|-----------|--------|--------------|----------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| manager | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| coordinator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| prefabricator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Network

| Rola | read | createPool | updatePool | deletePool | allocate | viewMatrix |
|------|------|------------|------------|------------|----------|------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| coordinator | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| bom_editor | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| prefabricator | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| worker | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### BOM

| Rola | read | create | update | delete |
|------|------|--------|--------|--------|
| admin | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ | ❌ |
| manager | ✅ | ✅ | ✅ | ❌ |
| coordinator | ✅ | ❌ | ❌ | ❌ |
| bom_editor | ✅ | ✅ | ✅ | ✅ |
| prefabricator | ✅ | ❌ | ❌ | ❌ |
| worker | ✅ | ❌ | ❌ | ❌ |
| order_picking | ✅ | ❌ | ❌ | ❌ |
| integrator | ✅ | ❌ | ✅ | ❌ |

### Devices

| Rola | read | create | update | verify |
|------|------|--------|--------|--------|
| admin | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ | ❌ |
| manager | ✅ | ✅ | ✅ | ❌ |
| coordinator | ✅ | ❌ | ❌ | ❌ |
| bom_editor | ✅ | ❌ | ❌ | ❌ |
| prefabricator | ✅ | ✅ | ✅ | ✅ |
| worker | ✅ | ❌ | ✅ | ❌ |
| order_picking | ✅ | ❌ | ❌ | ✅ |
| integrator | ✅ | ✅ | ✅ | ✅ |

### Users

| Rola | read | create | update | delete |
|------|------|--------|--------|--------|
| admin | ✅ | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ | ❌ |
| manager | ✅ | ❌ | ❌ | ❌ |
| coordinator | ✅ | ❌ | ❌ | ❌ |

### Reports

| Rola | read | create | export |
|------|------|--------|--------|
| admin | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ |
| coordinator | ✅ | ❌ | ✅ |
| bom_editor | ✅ | ❌ | ❌ |
| order_picking | ✅ | ❌ | ❌ |

### Settings

| Rola | read | update |
|------|------|--------|
| admin | ✅ | ✅ |
| management_board | ✅ | ✅ |
| manager | ✅ | ✅ |
| coordinator | ✅ | ✅ |
| bom_editor | ✅ | ✅ |
| prefabricator | ✅ | ✅ |
| worker | ✅ | ✅ |
| order_picking | ✅ | ✅ |

### Photos

| Rola | read | create | approve |
|------|------|--------|---------|
| admin | ✅ | ✅ | ✅ |
| management_board | ✅ | ❌ | ✅ |
| manager | ✅ | ❌ | ✅ |
| coordinator | ✅ | ❌ | ❌ |
| worker | ✅ | ✅ | ❌ |
| order_picking | ✅ | ✅ | ❌ |

### Documents

| Rola | read | create | delete |
|------|------|--------|--------|
| admin | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ |
| coordinator | ✅ | ✅ | ❌ |
| bom_editor | ✅ | ❌ | ❌ |
| prefabricator | ✅ | ❌ | ❌ |
| worker | ✅ | ❌ | ❌ |
| order_picking | ✅ | ❌ | ❌ |

### Notifications

| Rola | receiveAlerts | sendManual | configureTriggers |
|------|---------------|------------|-------------------|
| admin | ✅ | ✅ | ✅ |
| management_board | ✅ | ✅ | ❌ |
| manager | ✅ | ✅ | ❌ |
| coordinator | ✅ | ❌ | ❌ |
| bom_editor | ✅ | ❌ | ✅ |
| prefabricator | ✅ | ❌ | ❌ |
| worker | ✅ | ❌ | ❌ |
| order_picking | ✅ | ✅ | ❌ |

---

## 🔧 Implementacja Techniczna

### Backend

#### Struktura uprawnień w bazie danych

```sql
-- Role z uprawnieniami JSONB
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Przykład struktury JSONB dla roli Manager

```json
{
  "dashboard": { "read": true },
  "contracts": {
    "read": true,
    "create": true,
    "update": true,
    "approve": true,
    "import": true
  },
  "tasks": {
    "read": true,
    "create": true,
    "update": true,
    "assign": true
  },
  "users": { "read": true }
}
```

#### Przykład struktury JSONB dla roli Coordinator (warunkowe uprawnienia)

```json
{
  "tasks": {
    "read": true,
    "create": "SERWIS",  // Tylko zadania typu SERWIS
    "update": true,
    "assign": true
  }
}
```

#### Przykład struktury JSONB dla roli Worker (warunkowe uprawnienia)

```json
{
  "tasks": {
    "read": true,
    "update": "OWN"  // Tylko własne zadania
  }
}
```

### Frontend

#### Hook usePermissions

```typescript
const { hasPermission, isAdmin } = usePermissions();

// Sprawdzenie uprawnień
if (hasPermission('contracts', 'create')) {
  // Pokaż przycisk tworzenia kontraktu
}

// Admin ma wszystko
if (isAdmin()) {
  // Pełny dostęp
}
```

---

## ⚠️ Specjalne Reguły Walidacji

### 1. Coordinator - Tylko zadania SERWIS

**Backend - TaskController.create()**

```typescript
if (user.role === 'coordinator') {
  const taskType = await getTaskType(taskTypeId);
  if (taskType.code !== 'SERWIS') {
    throw new ForbiddenError('Koordynator może tworzyć tylko zadania serwisowe');
  }
}
```

### 2. Worker - Tylko własne zadania

**Backend - TaskController.update()**

```typescript
if (user.role === 'worker') {
  const task = await getTask(taskId);
  const assignment = task.assignments.find(a => a.userId === user.id);
  if (!assignment) {
    throw new ForbiddenError('Możesz edytować tylko własne zadania');
  }
}
```

### 3. Admin - Automatyczny pełny dostęp

**Backend - auth middleware**

```typescript
if (user.permissions.all === true) {
  // Admin - skip all permission checks
  return next();
}
```

---

## 📝 Migracja

### Uruchomienie migracji

```bash
psql $DB_CONNECTION_STRING -f backend/scripts/migrations/20260102_full_permissions_sync.sql
```

### Co robi migracja?

1. Aktualizuje istniejące role (admin, manager, coordinator, worker)
2. Tworzy nowe role (management_board, bom_editor, prefabricator, order_picking, integrator)
3. Zachowuje istniejących użytkowników bez zmian
4. Dodaje komentarze do kolumn

---

## 🧪 Testowanie

### Checklist testów

- [ ] Admin ma dostęp do wszystkiego
- [ ] Management Board może tworzyć użytkowników
- [ ] Manager może zatwierdzać zdjęcia
- [ ] Coordinator może tworzyć tylko zadania SERWIS
- [ ] Coordinator nie może tworzyć zadań SMW/CSDIP
- [ ] BOM Editor może usuwać szablony BOM
- [ ] Prefabricator ma dostęp do modułu prefabrication
- [ ] Worker może edytować tylko własne zadania
- [ ] Worker nie może edytować zadań innych użytkowników
- [ ] Order Picking może weryfikować urządzenia
- [ ] Integrator nie ma dostępu do dashboard

---

## 📚 Źródła

- **XML:** `docs/permissions/uprawnienia_system.xml` - źródło prawdy
- **Backend:** `backend/src/entities/Role.ts` - interfejsy TypeScript
- **Frontend:** `frontend/src/types/permissions.types.ts` - typy TypeScript
- **Migracja:** `backend/scripts/migrations/20260102_full_permissions_sync.sql`
- **Seeder:** `backend/src/services/DatabaseSeeder.ts`

---

## 🔄 Historia Wersji

### v2.0 (2026-01-02)
- Rozszerzenie z 6 do 9 ról
- Rozszerzenie z 6 do 15 modułów
- Rozszerzenie z ~12 do 27 akcji
- Dodanie warunkowych uprawnień (SERWIS, OWN)
- Utworzenie pełnej dokumentacji XML i Markdown

### v1.0 (2025-11-29)
- Podstawowy system 6 ról
- 6 modułów podstawowych
- Granularne uprawnienia JSONB
