# Struktura nawigacji i routingu w systemie Grover

## Przegląd

System Grover używa hierarchicznej struktury nawigacji z kontrolą dostępu opartą na rolach (RBAC). Każdy moduł ma przypisane wymagane uprawnienia, które są sprawdzane przed wyświetleniem.

---

## Drzewo nawigacji

```
/
├── /login                          ← Strona logowania (publiczna)
├── /change-password                ← Zmiana hasła (wymuszona)
├── /forbidden                      ← Brak uprawnień (403)
│
├── /dashboard                      ← 📊 DASHBOARD GŁÓWNY (kafelki modułów)
│   │                                  [Przycisk: Wyloguj w prawym górnym rogu]
│   │
│   ├── /contracts                  ← 📝 Kontrakty [← Powrót → /dashboard]
│   ├── /subsystems                 ← 🔧 Podsystemy [← Powrót → /dashboard]
│   ├── /tasks                      ← 📋 Zadania [← Powrót → /dashboard]
│   ├── /completion                 ← 📦 Kompletacja [← Powrót → /dashboard]
│   │   └── /completion/:id/scanner ← Skaner [← Powrót → /completion]
│   ├── /prefabrication             ← 🏭 Prefabrykacja [← Powrót → /dashboard]
│   ├── /network                    ← 🌐 Sieć/IP [← Powrót → /dashboard]
│   ├── /bom                        ← 🔩 Materiały BOM [← Powrót → /dashboard]
│   ├── /devices                    ← 📱 Urządzenia [← Powrót → /dashboard]
│   ├── /users                      ← 👥 Użytkownicy [← Powrót → /dashboard]
│   ├── /reports                    ← 📈 Raporty [← Powrót → /dashboard]
│   ├── /documents                  ← 📄 Dokumenty [← Powrót → /dashboard]
│   ├── /photos                     ← 📷 Zdjęcia [← Powrót → /dashboard]
│   ├── /notifications              ← 🔔 Powiadomienia [← Powrót → /dashboard]
│   ├── /settings                   ← ⚙️ Ustawienia konta [← Powrót → /dashboard]
│   │
│   └── /admin                      ← 🛡️ Panel administratora (tylko admin)
│       ├── /admin/users            ← Zarządzanie użytkownikami [← Powrót → /admin]
│       ├── /admin/smtp             ← Konfiguracja SMTP [← Powrót → /admin]
│       ├── /admin/portal           ← Konfiguracja portalu [← Powrót → /admin]
│       ├── /admin/password         ← Zmiana hasła admin [← Powrót → /admin]
│       ├── /admin/bom              ← BOM Builder [← Powrót → /admin]
│       └── /admin/bom/import       ← Import materiałów [← Powrót → /admin/bom]
```

---

## Routy publiczne

### `/login`
- **Typ:** Publiczna
- **Komponent:** `LoginPage`
- **Opis:** Strona logowania do systemu
- **Przekierowanie:** Po zalogowaniu → `/dashboard`

### `/change-password`
- **Typ:** Pół-publiczna (wymaga sesji)
- **Komponent:** `PasswordChangeForm`
- **Opis:** Wymuszenie zmiany hasła dla nowych użytkowników
- **Przekierowanie:** Po zmianie → `/dashboard`

### `/forbidden`
- **Typ:** Publiczna
- **Komponent:** `ForbiddenPage`
- **Opis:** Strona błędu 403 - brak uprawnień

---

## Dashboard główny

### `/dashboard`
- **Typ:** Chroniona
- **Komponent:** `Dashboard`
- **Uprawnienia:** Wymaga autentykacji
- **Opis:** Główny dashboard z kafelkami modułów
- **Funkcje:**
  - Wyświetla kafelki dostępnych modułów
  - Filtruje moduły według uprawnień użytkownika
  - Przycisk wylogowania w prawym górnym rogu

#### Kafelki modułów

Każdy kafelek prowadzi do odpowiedniego modułu i jest widoczny tylko jeśli użytkownik ma odpowiednie uprawnienia:

| Kafelek | Route | Ikona | Wymagane uprawnienie |
|---------|-------|-------|---------------------|
| Kontrakty | `/contracts` | 📝 | `contracts.read` |
| Podsystemy | `/subsystems` | 🔧 | `subsystems.read` |
| Zadania | `/tasks` | 📋 | `tasks.read` |
| Kompletacja | `/completion` | 📦 | `completion.read` |
| Prefabrykacja | `/prefabrication` | 🏭 | `prefabrication.read` |
| Sieć/IP | `/network` | 🌐 | `network.read` |
| Materiały BOM | `/bom` | 🔩 | `bom.read` |
| Urządzenia | `/devices` | 📱 | `devices.read` |
| Użytkownicy | `/users` | 👥 | `users.read` |
| Raporty | `/reports` | 📈 | `reports.read` |
| Dokumenty | `/documents` | 📄 | `documents.read` |
| Zdjęcia | `/photos` | 📷 | `photos.read` |
| Powiadomienia | `/notifications` | 🔔 | `notifications.receiveAlerts` |
| Ustawienia | `/settings` | ⚙️ | `settings.read` |
| Panel Admin | `/admin` | 🛡️ | **Admin tylko** |

---

## Moduły biznesowe

### 1. Kontrakty (`/contracts`)
- **Uprawnienia:** `contracts.read`
- **Komponent:** `ContractsPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie kontraktami
- **Nawigacja:** `← Powrót` → `/dashboard`

### 2. Podsystemy (`/subsystems`)
- **Uprawnienia:** `subsystems.read`
- **Komponent:** `SubsystemsPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie podsystemami infrastrukturalnymi
- **Nawigacja:** `← Powrót` → `/dashboard`

### 3. Zadania (`/tasks`)
- **Uprawnienia:** `tasks.read`
- **Komponent:** `TasksPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie zadaniami
- **Nawigacja:** `← Powrót` → `/dashboard`

### 4. Kompletacja (`/completion`)
- **Uprawnienia:** `completion.read`
- **Komponent:** `CompletionOrderList`
- **Status:** ✅ Działający
- **Opis:** Lista zleceń kompletacji
- **Nawigacja:** `← Powrót` → `/dashboard`

#### 4.1. Skaner kompletacji (`/completion/:id/scanner`)
- **Uprawnienia:** `completion.scan`
- **Komponent:** `CompletionScannerPage`
- **Status:** ✅ Działający
- **Opis:** Skanowanie materiałów do kompletacji
- **Nawigacja:** `← Powrót` → `/completion`

### 5. Prefabrykacja (`/prefabrication`)
- **Uprawnienia:** `prefabrication.read`
- **Komponent:** `PrefabricationPage`
- **Status:** 🚧 W budowie
- **Opis:** Prefabrykacja urządzeń
- **Nawigacja:** `← Powrót` → `/dashboard`

### 6. Sieć/IP (`/network`)
- **Uprawnienia:** `network.read`
- **Komponent:** `NetworkPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie adresacją IP
- **Nawigacja:** `← Powrót` → `/dashboard`

### 7. Materiały BOM (`/bom`)
- **Uprawnienia:** `bom.read`
- **Komponent:** `BOMPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie materiałami i szablonami BOM
- **Nawigacja:** `← Powrót` → `/dashboard`

### 8. Urządzenia (`/devices`)
- **Uprawnienia:** `devices.read`
- **Komponent:** `DevicesPage`
- **Status:** 🚧 W budowie
- **Opis:** Rejestracja urządzeń
- **Nawigacja:** `← Powrót` → `/dashboard`

### 9. Użytkownicy (`/users`)
- **Uprawnienia:** `users.read`
- **Komponent:** `UsersPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie użytkownikami
- **Nawigacja:** `← Powrót` → `/dashboard`

### 10. Raporty (`/reports`)
- **Uprawnienia:** `reports.read`
- **Komponent:** `ReportsPage`
- **Status:** 🚧 W budowie
- **Opis:** Generowanie raportów
- **Nawigacja:** `← Powrót` → `/dashboard`

### 11. Dokumenty (`/documents`)
- **Uprawnienia:** `documents.read`
- **Komponent:** `DocumentsPage`
- **Status:** 🚧 W budowie
- **Opis:** Zarządzanie dokumentami
- **Nawigacja:** `← Powrót` → `/dashboard`

### 12. Zdjęcia (`/photos`)
- **Uprawnienia:** `photos.read`
- **Komponent:** `PhotosPage`
- **Status:** 🚧 W budowie
- **Opis:** Upload i zatwierdzanie zdjęć
- **Nawigacja:** `← Powrót` → `/dashboard`

### 13. Powiadomienia (`/notifications`)
- **Uprawnienia:** `notifications.receiveAlerts`
- **Komponent:** `NotificationsPage`
- **Status:** 🚧 W budowie
- **Opis:** Konfiguracja alertów
- **Nawigacja:** `← Powrót` → `/dashboard`

### 14. Ustawienia (`/settings`)
- **Uprawnienia:** `settings.read`
- **Komponent:** `SettingsPage`
- **Status:** 🚧 W budowie
- **Opis:** Ustawienia konta
- **Nawigacja:** `← Powrót` → `/dashboard`

---

## Panel administratora

### `/admin`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `AdminDashboard`
- **Status:** ✅ Działający
- **Opis:** Panel administratora z kafelkami
- **Nawigacja:** `← Powrót` → `/dashboard`

### `/admin/users`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `UserManagementPage`
- **Status:** ✅ Działający
- **Opis:** Zarządzanie użytkownikami
- **Nawigacja:** `← Powrót` → `/admin`

### `/admin/smtp`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `SMTPConfigPage`
- **Status:** ✅ Działający
- **Opis:** Konfiguracja serwera SMTP
- **Nawigacja:** `← Powrót` → `/admin`

### `/admin/portal`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `PortalConfigPage`
- **Status:** ✅ Działający
- **Opis:** Konfiguracja URL portalu
- **Nawigacja:** `← Powrót` → `/admin`

### `/admin/password`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `AdminPasswordChange`
- **Status:** ✅ Działający
- **Opis:** Zmiana hasła administratora
- **Nawigacja:** `← Powrót` → `/admin`

### `/admin/bom`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `BOMBuilderPage`
- **Status:** ✅ Działający
- **Opis:** BOM Builder - zarządzanie szablonami
- **Nawigacja:** `← Powrót` → `/admin`

### `/admin/bom/import`
- **Uprawnienia:** `all.access` (tylko admin)
- **Komponent:** `MaterialImportPage`
- **Status:** ✅ Działający
- **Opis:** Import materiałów z CSV/Excel
- **Nawigacja:** `← Powrót` → `/admin/bom`

---

## Komponenty routingu

### ProtectedRoute
Komponent owijający chronione routy.

**Funkcje:**
- Sprawdza czy użytkownik jest zalogowany
- Przekierowuje do `/login` jeśli nie
- Sprawdza czy wymaga zmiany hasła
- Przekierowuje do `/change-password` jeśli tak

**Użycie:**
```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### RoleBasedRoute
Komponent sprawdzający uprawnienia.

**Funkcje:**
- Sprawdza czy użytkownik ma wymagane uprawnienie
- Przekierowuje do `/forbidden` jeśli nie

**Użycie:**
```tsx
<RoleBasedRoute requiredPermission={{ module: 'contracts', action: 'read' }}>
  <ContractsPage />
</RoleBasedRoute>
```

### BackButton
Komponent przycisku powrotu.

**Props:**
- `to?: string` - ścieżka docelowa (opcjonalna)
- `label?: string` - etykieta przycisku (domyślnie: "Powrót")

**Użycie:**
```tsx
<BackButton to="/dashboard" />
<BackButton to="/admin" label="Powrót do panelu" />
<BackButton /> {/* używa navigate(-1) */}
```

---

## Przepływ nawigacji

### 1. Logowanie
```
/login → [zalogowanie] → /dashboard
```

### 2. Wymuszenie zmiany hasła
```
/login → [zalogowanie z force_password_change] → /change-password → /dashboard
```

### 3. Nawigacja w systemie
```
/dashboard → [kliknięcie kafelka] → /module → [← Powrót] → /dashboard
```

### 4. Panel administracyjny
```
/dashboard → /admin → /admin/users → [← Powrót] → /admin → [← Powrót] → /dashboard
```

### 5. Brak uprawnień
```
/dashboard → [próba dostępu bez uprawnień] → /forbidden
```

---

## Przekierowania

| Z | Do | Warunek |
|---|----|---------| 
| `/` | `/dashboard` | Zawsze |
| `*` (404) | `/dashboard` | Zawsze |
| `/login` | `/dashboard` | Jeśli zalogowany |
| Dowolny route | `/login` | Jeśli nie zalogowany |
| Dowolny route | `/change-password` | Jeśli wymaga zmiany hasła |
| Dowolny route | `/forbidden` | Jeśli brak uprawnień |

---

## Macierz dostępu do routów według ról

| Route | Admin | Zarząd | Manager | Koordynator | BOM Editor | Prefabricator | Order Picking | Worker | Viewer |
|-------|-------|--------|---------|-------------|------------|---------------|---------------|--------|--------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/contracts` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/subsystems` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/tasks` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/completion` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/prefabrication` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| `/network` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `/bom` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/devices` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/users` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/reports` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| `/documents` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/photos` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/settings` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/admin/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Wskazówki implementacyjne

### 1. Dodawanie nowego modułu
1. Utwórz komponent w `/frontend/src/components/modules/`
2. Dodaj import w `App.tsx`
3. Dodaj route w `App.tsx` z odpowiednimi uprawnieniami
4. Dodaj kafelek w `Dashboard.tsx`
5. Zaktualizuj dokumentację

### 2. Zmiana uprawnień dla route
1. Edytuj `requiredPermission` w `App.tsx`
2. Zaktualizuj kafelek w `Dashboard.tsx`
3. Zaktualizuj dokumentację

### 3. Dodawanie zagnieżdżonego route
```tsx
<Route
  path="/module/:id/submodule"
  element={
    <ProtectedRoute>
      <RoleBasedRoute requiredPermission={{ module: 'module', action: 'action' }}>
        <SubmodulePage />
      </RoleBasedRoute>
    </ProtectedRoute>
  }
/>
```

---

**Wersja dokumentu:** 1.0  
**Data ostatniej aktualizacji:** 2026-01-03  
**Autor:** System Grover
