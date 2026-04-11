# Asset Management - UI Mockups & Flow

## Overview
New `/assets` module in the application for browsing and managing installed infrastructure assets.

---

## 1. Asset List Page (`/assets`)

### Route
```
/assets
```

### Navigation
Add new menu item:
```
Dashboard
├── Kontrakty
├── Zadania
├── Urządzenia
├── 🆕 Obiekty   <-- NEW
├── ...
```

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Dashboard                                           [+ Dodaj] │
│                                                                  │
│ 🏗️  Obiekty                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Filtry:                                                          │
│ [Typ: Wszystkie ▼] [Status: Wszystkie ▼] [Kontrakt ▼]          │
│ [🔍 Szukaj po nazwie, numerze, lokalizacji...]                  │
├───────────────────────────────���─────────────────────────────────┤
│ Numer          │ Typ        │ Nazwa              │ Status       │
│ OBJ-0000010426 │ Przejazd   │ LK-123 km 45,678  │ ✅ Aktywny   │
│ OBJ-0000020426 │ LCS        │ LCS Warszawa       │ 🔧 Serwis   │
│ OBJ-0000030426 │ CUID       │ CUID Kraków        │ ✅ Aktywny   │
│ OBJ-0000040426 │ Nastawnia  │ Nastawnia Łódź     │ ⚠️ Awaria   │
│ OBJ-0000050426 │ Przejazd   │ LK-456 km 12,345   │ 📅 Planowany│
└─────────────────────────────────────────────────────────────────┘
│ Strona 1 z 4                      [<] [1] [2] [3] [4] [>]      │
└─────────────────────────────────────────────────────────────────┘
```

### Filters

**Typ (Asset Type):**
- Wszystkie
- Przejazd
- LCS
- CUID
- Nastawnia
- SKP

**Status:**
- Wszystkie
- ✅ Aktywny (active)
- 🔧 W serwisie (in_service)
- ⚠️ Awaria (faulty)
- 📅 Planowany (planned)
- 🚫 Wycofany (decommissioned)

**Kontrakt:**
- Dropdown z listą kontraktów

**Wyszukiwanie:**
- Szuka w: asset_number, name, miejscowosc, linia_kolejowa

### Table Columns
- **Numer** - Asset number (OBJ-XXXXXXMMRR)
- **Typ** - Asset type (emoji + text)
- **Nazwa** - Asset name
- **Lokalizacja** - miejscowosc + linia kolejowa
- **Status** - Lifecycle status (emoji + text)
- **Instalacja** - Actual installation date
- **Akcje** - [👁️ Szczegóły] button

### Pagination
- 50 items per page
- Standard pagination controls

### Empty State
If no assets match filters:
```
┌─��───────────────────────────────────┐
│                                     │
│         🏗️                          │
│   Brak obiektów                     │
│                                     │
│   Zmień filtry lub utwórz nowy      │
│   obiekt kończąc zadanie            │
│   instalacyjne.                     │
│                                     │
└─────────────────────────────────────┘
```

---

## 2. Asset Detail Page (`/assets/:id`)

### Route
```
/assets/1
```

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Obiekty                                                        │
│                                                                  │
│ 🚦 Przejazd KAT A - OBJ-0000010426                              │
│ ✅ Aktywny | LK-123 km 45,678 | Warszawa                        │
├─────────────────────────────────────────────────────────────────┤
│ 📍 Lokalizacja:                                                 │
│   Linia kolejowa: LK-123                                        │
│   Kilometraż: 45,678                                            │
│   GPS: 52.1234, 21.5678  [📍 Pokaż na mapie]                   │
│   Miejscowość: Warszawa                                         │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Dane techniczne:                                             │
│   Kategoria: KAT A                                              │
│   Kontrakt: K00001 - Test Contract                             │
│   Podsystem: SMOKIP-A #1                                        │
│   Data instalacji: 2026-01-15                                   │
│   Gwarancja do: 2028-01-15 (⏰ 639 dni)                         │
├─────────────────────────────────────────────────────────────────┤
│ 🔧 Serwis:                                                      │
│   Ostatni serwis: 2026-03-10                                    │
│   Następny serwis: 2027-03-10                                   │
│   [📅 Zaplanuj serwis]                                          │
├─────────────────────────────────────────────────────────────────┤
│ 🛠️ BOM zainstalowane (3 urządzenia):                            │
│   • Kamera AXIS P1448-LE (x2)                                   │
│     S/N: ABC123456 [🔗 Zobacz urządzenie]                       │
│     S/N: ABC123457 [🔗 Zobacz urządzenie]                       │
│   • Switch Cisco SG350 (x1)                                     │
│     S/N: DEF789012 [🔗 Zobacz urządzenie]                       │
│   [📦 Zobacz pełny BOM]                                         │
├─────────────────────────────────────────────────────────────────┤
│ 📝 Historia zadań (3):                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ P000001 - Instalacja przejazdu           | ✅ Zakończone    │ │
│ │ 📅 2026-01-15 | Rola: Instalacja                            │ │
│ └──────��──────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ P000045 - Serwis gwarancyjny             | ✅ Zakończone    │ │
│ │ 📅 2026-03-10 | Rola: Serwis gwarancyjny                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ P000078 - Naprawa uszkodzenia            | 🔄 W realizacji  │ │
│ │ 📅 2026-04-05 | Rola: Naprawa                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [+ Utwórz nowe zadanie dla obiektu]                             │
├─────────────────────────────���───────────────────────────────────┤
│ 📊 Historia statusów (zobacz pełną)                             │
│   2026-01-15 10:00 | Utworzony → Zainstalowany                 │
│   2026-01-20 14:00 | Zainstalowany → Aktywny                    │
│   2026-03-10 09:00 | Aktywny → W serwisie                       │
│   2026-03-10 16:00 | W serwisie → Aktywny                       │
├─────────────────────────────────────────────────────────────────┤
│ 📝 Notatki:                                                     │
│   Instalacja bez problemów. Wszystkie testy przeszły poprawnie. │
│                                                                  │
│ [✏️ Edytuj notatki]                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Actions
- **Pokaż na mapie** - Open Google Maps with GPS coordinates
- **Zobacz urządzenie** - Navigate to `/devices/:id`
- **Zaplanuj serwis** - Opens dialog to create service task
- **Utwórz nowe zadanie** - Opens dialog to create any task type
- **Edytuj notatki** - Inline edit for notes field

### Status Badge Colors
- `planned` - 🔵 Blue
- `installed` - 🟢 Green
- `active` - ✅ Green (checkmark)
- `in_service` - 🔧 Orange
- `faulty` - ⚠️ Red
- `inactive` - ⚪ Gray
- `decommissioned` - 🚫 Dark gray

---

## 3. Create Service Task Dialog

Triggered by clicking **[+ Utwórz nowe zadanie dla obiektu]**

```
┌────────────────────────────────────────────┐
│ Nowe zadanie dla: OBJ-0000010426       [X] │
├────────────────────────────────────────────┤
│                                            │
│ Typ zadania: *                             │
│ [ Serwis gwarancyjny  ▼ ]                 │
│   - Serwis gwarancyjny                     │
│   - Naprawa                                │
│   - Konserwacja                            │
│   - Demontaż                               │
│                                            │
│ Nazwa zadania: *                           │
│ [Serwis gwarancyjny - 12 miesięcy......] │
│                                            │
│ Data planowana:                            │
│ [2027-01-15] 📅                            │
│                                            │
│ Priorytet:                                 │
│ ⚪ Niski  ⚫ Średni  ⚪ Wysoki              │
│                                            │
│ Przypisz do:                               │
│ [ Jan Kowalski  ▼ ]                       │
│                                            │
│ Opis (opcjonalnie):                        │
│ [                                      ] │
│ [                                      ] │
│                                            │
│           [Anuluj]  [Utwórz zadanie]      │
└────────────────────────────────────────────┘
```

After creation:
- Redirect to task detail page OR
- Show toast notification + refresh asset history

---

## 4. Task Completion → Asset Creation Flow

### Current Task Detail Page
When viewing installation task (PRZEJAZD, LCS, CUID):

```
┌─────────────────────────────────────────────────────────────────┐
│ P000001 - Instalacja przejazdu KAT A                            │
│ Status: 🔄 W realizacji                                         │
├─────────────────────────────────────────────────────────────────┤
│ ... task details ...                                            │
│                                                                  │
│ [✅ Zakończ zadanie i utwórz obiekt]                            │
└─────────────────────────────────────────────────────────────────┘
```

### Dialog: Complete and Create Asset

```
┌────────────────────────────────────────────────────────────┐
│ Zakończ zadanie: P000001                              [X] │
├────────────────────────────────────────────────────────────┤
│ ✅ Zadanie zostanie oznaczone jako zakończone               │
│ 🏗️ Zostanie utworzony nowy obiekt infrastruktury          │
│                                                            │
│ ─── Dane obiektu ───                                       │
│                                                            │
│ Nazwa: *                                                   │
│ [Przejazd LK-123 km 45,678....................]           │
│                                                            │
│ Kategoria: * (tylko dla przejazdów)                       │
│ [ KAT A  ▼ ]                                              │
│                                                            │
│ Linia kolejowa:                                            │
│ [LK-123..]  (auto-fill z zadania)                         │
│                                                            │
│ Kilometraż:                                                │
│ [45,678..]  (auto-fill z zadania)                         │
│                                                            │
│ GPS:                                                        │
│ Lat: [52.1234..] Lon: [21.5678..]                         │
│ [📍 Wybierz na mapie]                                      │
│                                                            │
│ Miejscowość:                                               │
│ [Warszawa..]                                               │
│                                                            │
│ ─── BOM zainstalowane ───                                  │
│                                                            │
│ System automatycznie połączy urządzenia po S/N:            │
│ ✅ Kamera ABC123456 (znaleziona w /devices)               │
│ ✅ Kamera ABC123457 (znaleziona w /devices)               │
│ ⚠️ Switch XYZ999999 (nie znaleziono - zadanie może...)    │
│                                                            │
│ [📦 Edytuj BOM]                                            │
│                                                            │
│ Notatki:                                                   │
│ [                                              ]           │
│ [                                              ]           │
│                                                            │
│      [Anuluj]  [✅ Zakończ i utwórz obiekt]               │
└──────────────────────���─────────────────────────────────────┘
```

### After Success

Show toast notification:
```
┌────────────────────────────────────────┐
│ ✅ Sukces!                             │
│ Zadanie P000001 zakończone             │
│ Utworzono obiekt: OBJ-0000010426       │
│                                        │
│ [Zobacz obiekt]  [OK]                  │
└────────────────────────────────────────┘
```

Redirect options:
1. Stay on task page (now shows linked asset)
2. Redirect to new asset detail page
3. Return to contract detail page

---

## 5. Asset List Widget (on Contract Detail Page)

On `/contracts/:id`, add new section:

```
┌─────────────────────────────────────────────────────────────────┐
│ Kontrakt: K00001 - Test Contract                               │
├─────────────────────────────────────────────────────────────────┤
│ ... existing contract details ...                              │
│                                                                  │
│ 🏗️ Zainstalowane obiekty (5):                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ OBJ-0000010426 | Przejazd LK-123 km 45,678 | ✅ Aktywny    ││
│ │ OBJ-0000020426 | LCS Warszawa               | ✅ Aktywny    ││
│ │ OBJ-0000030426 | CUID Kraków                | ✅ Aktywny    ││
│ │ OBJ-0000040426 | Nastawnia Łódź             | ⚠️ Awaria    ││
│ │ OBJ-0000050426 | Przejazd LK-456 km 12,345  | 📅 Planowany ││
│ └──────────────────────────────────────────────────────────────┘│
│ [Zobacz wszystkie obiekty]                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Device Page Enhancement

On `/devices/:id`, if device is installed in asset:

```
┌─────────────────────────────────────────────────────────────────┐
│ Urządzenie: Kamera AXIS P1448-LE                                │
│ S/N: ABC123456                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Status: 🟢 Zainstalowane                                        │
│                                                                  │
│ 🏗️ Zainstalowane w obiekcie:                                   │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ OBJ-0000010426 - Przejazd LK-123 km 45,678                  ││
│ │ Status: ✅ Aktywny                                           ││
│ │ Data instalacji: 2026-01-15                                  ││
│ │ [👁️ Zobacz obiekt]                                           ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ... rest of device details ...                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Dashboard Widget (Optional)

On `/dashboard`, add widget:

```
┌────────────────────────────────────────┐
│ 🏗️ Obiekty - Podsumowanie             │
├────────────────────────────────────────┤
│ Łącznie zainstalowane: 156             │
│ ✅ Aktywne: 142                        │
│ 🔧 W serwisie: 8                       │
│ ⚠️ Awarie: 3                           │
│ 📅 Planowane: 12                       │
│                                        │
│ ⏰ Zbliżające się serwisy (7 dni): 5   │
│ ⚠️ Gwarancja wygasa (30 dni): 3        │
│                                        │
│ [Zobacz wszystkie]                     │
└────────────────────────────────────────┘
```

---

## Responsive Behavior

### Mobile View
- Table becomes cards
- Filters collapse into drawer
- Map view uses full screen
- Action buttons move to FAB

### Tablet View
- 2-column layout for asset details
- Filters in sidebar
- Table with horizontal scroll

---

## Loading States

### Asset List
```
┌─────────────────────────────────────────┐
│ 🏗️  Obiekty                             │
├─────────────────────────────────────────┤
│ ⏳ Ładowanie obiektów...                │
│ [████████░░] 80%                        │
└─────────────────────────────────────────┘
```

### Asset Detail
```
┌─────────────────────────────────────────┐
│ ← Obiekty                               │
│                                         │
│ ⏳ Ładowanie szczegółów obiektu...      │
└─────────────────────────────────────────┘
```

---

## Accessibility

- All form inputs have labels
- Color is not the only status indicator (use emojis + text)
- Keyboard navigation for all actions
- Screen reader friendly table
- Focus trapping in dialogs
- ARIA labels for icon buttons
