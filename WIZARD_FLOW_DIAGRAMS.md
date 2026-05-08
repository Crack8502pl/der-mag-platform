# Contract Wizard - User Flow Diagrams

## Scenario 1: Single Subsystem (Auto-detected)

```
┌────────────────────────────────────────────────────────────────┐
│ Input: "Modernizacja SMOK-A Warszawa"                         │
└────────────────────────────────────────────────────────────────┘

Step 1: Dane podstawowe
┌──────────────────────────────────────────┐
│ ✏️  Nazwa: "Modernizacja SMOK-A Warszawa" │
│ 📅 Data zamówienia: 2026-01-06          │
│ 👤 Kierownik: Jan Kowalski              │
│ 🔑 Kod: ABC                             │
│                                          │
│ ✅ Wykryto podsystemy: 🔵 SMOK-A         │
└──────────────────────────────────────────┘
         │
         ▼
Step 2: Wybór/potwierdzenie podsystemów
┌──────────────────────────────────────────┐
│ Wykryte/wybrane podsystemy:              │
│ ☑️ 🔵 SMOK-A              [🗑️ Usuń]      │
│                                          │
│ [Dodaj kolejny podsystem ▼]              │
└──────────────────────────────────────────┘
         │
         ▼
Step 3: Konfiguracja: 🔵 SMOK-A
┌──────────────────────────────────────────┐
│ Ilość przejazdów Kat A: [2]              │
│ Ilość SKP:             [1]              │
│ Ilość Nastawni:        [1]              │
│ ☑️ LCS                                   │
│   └─ Ilość monitorów:  [4]              │
│   └─ Ilość stanowisk:  [2]              │
│ ☑️ CUID                                  │
└──────────────────────────────────────────┘
         │
         ▼
Step 4: Szczegóły zadań: 🔵 SMOK-A
┌──────────────────────────────────────────┐
│ ℹ️  Szczegółowe informacje o zadaniach    │
│    można edytować po utworzeniu.        │
└──────────────────────────────────────────┘
         │
         ▼
Step 5: Podgląd wszystkich zadań
┌──────────────────────────────────────────┐
│ 🔵 SMOK-A (6 zadań):                     │
│   P000010126 - Przejazd Kat A #1         │
│   P000020126 - Przejazd Kat A #2         │
│   P000030126 - SKP #1                    │
│   P000040126 - Nastawnia #1              │
│   P000050126 - LCS (4 monitorów, 2...)   │
│   P000060126 - CUID                      │
│                                          │
│ Łącznie: 6 zadań                         │
└──────────────────────────────────────────┘
         │
         ▼
Step 6: Sukces
┌──────────────────────────────────────────┐
│           ✅                             │
│     Kontrakt utworzony!                  │
│                                          │
│ Utworzono kontrakt z 1 podsystemem:      │
│   • 🔵 SMOK-A (6 zadań)                  │
│                                          │
│ Łącznie: 6 zadań                         │
│                                          │
│ [Zamknij]  [Przejdź do kontraktu]       │
└──────────────────────────────────────────┘
```

## Scenario 2: Multiple Subsystems (Special Case - SMOK)

```
┌────────────────────────────────────────────────────────────────┐
│ Input: "SMOK Poznań"                                           │
└────────────────────────────────────────────────────────────────┘

Step 1: Dane podstawowe
┌──────────────────────────────────────────┐
│ ✏️  Nazwa: "SMOK Poznań"                  │
│ 📅 Data zamówienia: 2026-01-06          │
│ 👤 Kierownik: Jan Kowalski              │
│ 🔑 Kod: ABC                             │
│                                          │
│ ✅ Wykryto podsystemy:                   │
│    🔵 SMOK-A, 🟢 SMOK-B                  │
└──────────────────────────────────────────┘
         │
         ▼
Step 2: Wybór/potwierdzenie podsystemów
┌──────────────────────────────────────────┐
│ Wykryte/wybrane podsystemy:              │
│ ☑️ 🔵 SMOK-A              [🗑️ Usuń]      │
│ ☑️ 🟢 SMOK-B              [🗑️ Usuń]      │
│                                          │
│ [Dodaj kolejny podsystem ▼]              │
└──────────────────────────────────────────┘
         │
         ▼
Step 3: Konfiguracja: 🔵 SMOK-A
┌──────────────────────────────────────────┐
│ [Konfiguracja SMOK-A...]                 │
└──────────────────────────────────────────┘
         │
         ▼
Step 4: Szczegóły zadań: 🔵 SMOK-A
┌──────────────────────────────────────────┐
│ [Szczegóły SMOK-A...]                    │
└──────────────────────────────────────────┘
         │
         ▼
Step 5: Konfiguracja: 🟢 SMOK-B
┌──────────────────────────────────────────┐
│ Ilość przejazdów Kat B: [3]              │
│ Ilość Nastawni:        [2]              │
│ ☐ LCS                                   │
│ ☐ CUID                                  │
└──────────────────────────────────────────┘
         │
         ▼
Step 6: Szczegóły zadań: 🟢 SMOK-B
┌──────────────────────────────────────────┐
│ [Szczegóły SMOK-B...]                    │
└──────────────────────────────────────────┘
         │
         ▼
Step 7: Podgląd wszystkich zadań
┌──────────────────────────────────────────┐
│ 🔵 SMOK-A (6 zadań):                     │
│   P000010126 - Przejazd Kat A #1         │
│   P000020126 - Przejazd Kat A #2         │
│   P000030126 - SKP #1                    │
│   P000040126 - Nastawnia #1              │
│   P000050126 - LCS (4 monitorów, 2...)   │
│   P000060126 - CUID                      │
│                                          │
│ 🟢 SMOK-B (5 zadań):                     │
│   P000070126 - Przejazd Kat B #1         │
│   P000080126 - Przejazd Kat B #2         │
│   P000090126 - Przejazd Kat B #3         │
│   P000100126 - Nastawnia #1              │
│   P000110126 - Nastawnia #2              │
│                                          │
│ Łącznie: 11 zadań z 2 podsystemów        │
└──────────────────────────────────────────┘
         │
         ▼
Step 8: Sukces
┌──────────────────────────────────────────┐
│           ✅                             │
│     Kontrakt utworzony!                  │
│                                          │
│ Utworzono kontrakt z 2 podsystemami:     │
│   • 🔵 SMOK-A (6 zadań)                  │
│   • 🟢 SMOK-B (5 zadań)                  │
│                                          │
│ Łącznie: 11 zadań                        │
└──────────────────────────────────────────┘
```

## Scenario 3: Multiple Subsystems (No SMOK - Skips Details)

```
┌────────────────────────────────────────────────────────────────┐
│ Input: "CCTV i SSWiN Kraków"                                   │
└────────────────────────────────────────────────────────────────┘

Step 1: Dane podstawowe
┌──────────────────────────────────────────┐
│ ✏️  Nazwa: "CCTV i SSWiN Kraków"          │
│ ✅ Wykryto: 📹 CCTV, 🚨 SSWiN            │
└──────────────────────────────────────────┘
         │
         ▼
Step 2: Wybór/potwierdzenie
┌──────────────────────────────────────────┐
│ ☑️ 📹 CCTV                [🗑️ Usuń]      │
│ ☑️ 🚨 SSWiN               [🗑️ Usuń]      │
└──────────────────────────────────────────┘
         │
         ▼
Step 3: Konfiguracja: 📹 CCTV
┌──────────────────────────────────────────┐
│ Ilość budynków:    [3]                   │
│ Ilość pomieszczeń: [5]                   │
│ Ilość kontenerów:  [2]                   │
└──────────────────────────────────────────┘
         │
         ▼ (NO DETAILS STEP - not SMOK)
         │
Step 4: Konfiguracja: 🚨 SSWiN
┌──────────────────────────────────────────┐
│ Ilość budynków:    [2]                   │
│ Ilość pomieszczeń: [4]                   │
│ Ilość kontenerów:  [1]                   │
└──────────────────────────────────────────┘
         │
         ▼ (NO DETAILS STEP - not SMOK)
         │
Step 5: Podgląd wszystkich zadań
┌──────────────────────────────────────────┐
│ 📹 CCTV (10 zadań):                      │
│   P000010126 - CCTV - Budynek #1         │
│   P000020126 - CCTV - Budynek #2         │
│   P000030126 - CCTV - Budynek #3         │
│   P000040126 - CCTV - Pomieszczenie #1   │
│   ...                                    │
│                                          │
│ 🚨 SSWiN (7 zadań):                      │
│   P000110126 - SSWiN - Budynek #1        │
│   P000120126 - SSWiN - Budynek #2        │
│   ...                                    │
│                                          │
│ Łącznie: 17 zadań z 2 podsystemów        │
└──────────────────────────────────────────┘
         │
         ▼
Step 6: Sukces
```

## Scenario 4: Manual Selection (No Auto-detection)

```
┌────────────────────────────────────────────────────────────────┐
│ Input: "Kontrakty liniowe"                                     │
└────────────────────────────────────────────────────────────────┘

Step 1: Dane podstawowe
┌──────────────────────────────────────────┐
│ ✏️  Nazwa: "Kontrakty liniowe"            │
│ ⚠️  Nie wykryto podsystemów              │
└──────────────────────────────────────────┘
         │
         ▼
Step 2: Wybór/potwierdzenie
┌──────────────────────────────────────────┐
│ ⚠️  Nie wykryto podsystemów w nazwie.    │
│    Wybierz podsystemy ręcznie:           │
│                                          │
│ Dodaj kolejny podsystem:                 │
│ [Wybierz typ... ▼]                       │
│   - 🔵 SMOK-A                            │
│   - 🟢 SMOK-B                            │
│   - 🔐 SKD                               │
│   - 🚨 SSWiN                             │
│   - 📹 CCTV                              │
│   - 🌐 LAN         ← USER SELECTS       │
│   - 📡 OTK                               │
│   - ...                                  │
└──────────────────────────────────────────┘
         │ (User adds LAN)
         ▼
┌──────────────────────────────────────────┐
│ ☑️ 🌐 LAN                 [🗑️ Usuń]      │
│                                          │
│ [Wybierz typ... ▼]                       │
└──────────────────────────────────────────┘
         │ (User adds OTK)
         ▼
┌──────────────────────────────────────────┐
│ ☑️ 🌐 LAN                 [🗑️ Usuń]      │
│ ☑️ 📡 OTK                 [🗑️ Usuń]      │
│                                          │
│ [Wybierz typ... ▼]                       │
└──────────────────────────────────────────┘
         │
         ▼
Step 3: Konfiguracja: 🌐 LAN
┌──────────────────────────────────────────┐
│ Ilość budynków:    [5]                   │
│ Ilość pomieszczeń: [10]                  │
│ Ilość kontenerów:  [3]                   │
└──────────────────────────────────────────┘
         │
         ▼
Step 4: Konfiguracja: 📡 OTK
┌──────────────────────────────────────────┐
│ Ilość budynków:    [4]                   │
│ Ilość pomieszczeń: [8]                   │
│ Ilość kontenerów:  [2]                   │
└──────────────────────────────────────────┘
         │
         ▼
Step 5: Podgląd
Step 6: Sukces
```

## Step Flow Logic Summary

```
┌─────────────────────────────────────────────────────────────┐
│ STEP CALCULATION LOGIC                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Base Steps: 3 (Basic Data + Selection + Preview)           │
│                                                             │
│ + For each subsystem:                                       │
│   │                                                         │
│   ├─ Add 1 step: Configuration                             │
│   │                                                         │
│   └─ If subsystem is SMOK-A or SMOK-B:                     │
│       └─ Add 1 step: Details                               │
│                                                             │
│ + Final step: Success                                       │
│                                                             │
│ Total Steps = 3 + (# subsystems) + (# SMOK subsystems) + 1│
└─────────────────────────────────────────────────────────────┘

Examples:
┌─────────────────────┬──────────────────────┬──────────────┐
│ Subsystems          │ Calculation          │ Total Steps  │
├─────────────────────┼──────────────────────┼──────────────┤
│ SMOK-A              │ 3 + 1 + 1 + 1        │ 6            │
│ SMOK-A, SMOK-B      │ 3 + 2 + 2 + 1        │ 8            │
│ CCTV, SSWiN         │ 3 + 2 + 0 + 1        │ 6            │
│ LAN, OTK            │ 3 + 2 + 0 + 1        │ 6            │
│ SMOK-A, SKD         │ 3 + 2 + 1 + 1        │ 7            │
└─────────────────────┴──────────────────────┴──────────────┘
```

## API Request Format

### New Multi-Subsystem Format (Recommended)

```json
POST /api/contracts/wizard

{
  "customName": "SMOK Poznań",
  "orderDate": "2026-01-06",
  "projectManagerId": 1,
  "managerCode": "ABC",
  "subsystems": [
    {
      "type": "SMOKIP_A",
      "params": {
        "przejazdyKatA": 2,
        "iloscSKP": 1,
        "iloscNastawni": 1,
        "hasLCS": true,
        "lcsMonitory": 4,
        "lcsStanowiska": 2,
        "hasCUID": true
      },
      "tasks": [
        {
          "number": "P000010126",
          "name": "Przejazd Kat A #1",
          "type": "PRZEJAZD_KAT_A"
        },
        {
          "number": "P000020126",
          "name": "Przejazd Kat A #2",
          "type": "PRZEJAZD_KAT_A"
        }
        // ... more tasks
      ]
    },
    {
      "type": "SMOKIP_B",
      "params": {
        "przejazdyKatB": 3,
        "iloscNastawni": 2,
        "hasLCS": false,
        "hasCUID": false
      },
      "tasks": [
        {
          "number": "P000070126",
          "name": "Przejazd Kat B #1",
          "type": "PRZEJAZD_KAT_B"
        }
        // ... more tasks
      ]
    }
  ]
}
```

### Legacy Single-Subsystem Format (Still Supported)

```json
POST /api/contracts/wizard

{
  "customName": "Modernizacja SMOK-A Warszawa",
  "orderDate": "2026-01-06",
  "projectManagerId": 1,
  "managerCode": "ABC",
  "subsystemType": "SMOKIP_A",
  "subsystemParams": {
    "przejazdyKatA": 2,
    "iloscSKP": 1,
    "hasLCS": true,
    "hasCUID": true
  },
  "tasks": [
    {
      "number": "P000010126",
      "name": "Przejazd Kat A #1",
      "type": "PRZEJAZD_KAT_A"
    }
    // ... more tasks
  ]
}
```

## UI Element Descriptions

### Step Indicator (Top of Modal)
```
┌──────┬──────┬──────┬──────┬──────┬──────┐
│  ① │  ② │  ③ │  ④ │  ⑤ │  ⑥ │
│ Dane │ Pod- │ Konf │ Szcz │ Pod- │ Suk- │
│      │ syst │ ig   │ egół │ gląd │ ces  │
└──────┴──────┴──────┴──────┴──────┴──────┘
 Active   Next   Future
  (blue) (gray)  (gray)
```

### Subsystem Selection (Step 2)
```
┌─────────────────────────────────────────────┐
│ Wykryte/wybrane podsystemy:                 │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔵 SMOK-A                  [🗑️ Usuń]    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🟢 SMOK-B                  [🗑️ Usuń]    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Dodaj kolejny podsystem:                    │
│ ┌─────────────────────────────────────────┐ │
│ │ Wybierz typ podsystemu...            ▼ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Configuration Step
```
┌─────────────────────────────────────────────┐
│ Konfiguracja: 🔵 SMOK-A                     │
│                                             │
│ 1.1 Ilość przejazdów Kat A                  │
│ ┌─────┐                                     │
│ │  2  │                                     │
│ └─────┘                                     │
│                                             │
│ 1.4 LCS                                     │
│ ☑️ Checkbox                                 │
│   └─ Ilość monitorów LCS                    │
│      ┌─────┐                                │
│      │  4  │                                │
│      └─────┘                                │
└─────────────────────────────────────────────┘
```

### Preview Step
```
┌─────────────────────────────────────────────┐
│ Podgląd wszystkich zadań                    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔵 SMOK-A (6 zadań)                     │ │
│ │ ─────────────────────────────────────── │ │
│ │ │ Numer        │ Nazwa zadania        │ │ │
│ │ ├──────────────┼─────────────────────┤ │ │
│ │ │ P000010126   │ Przejazd Kat A #1   │ │ │
│ │ │ P000020126   │ Przejazd Kat A #2   │ │ │
│ │ │ P000030126   │ SKP #1              │ │ │
│ │ │ P000040126   │ Nastawnia #1        │ │ │
│ │ │ P000050126   │ LCS (4 monitorów... │ │ │
│ │ │ P000060126   │ CUID                │ │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🟢 SMOK-B (5 zadań)                     │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Łącznie: 11 zadań z 2 podsystemów           │
└─────────────────────────────────────────────┘
```

## Step 8: Konfiguracja Zadań

```text
[Lista zadań w sidebarze]
        |
        v
[Auto-load aktywnego template BOM]
        |
        v
[Resolve quantities z params podsystemu]
        |
        +--> [Brak template] --> [Zapis zadania bez materiałów]
        |
        v
[Edycja ilości / wyboru materiałów]
        |
        v
[Zastosuj BOM do zadania]
        |
        v
[taskConfigurations w wizardData]
```

## Step 9: Zamówienia Dodatkowe

```text
[Checkbox "Zamówienia niestandardowe"]
        |
        +--> [off] --> [Pomijamy krok 9]
        |
        v
[Formularz dodatkowej pozycji]
        |
        v
[Dodaj / edytuj / usuń pozycję]
        |
        v
[customOrders w wizardData]
        |
        v
[Podgląd kontraktu]
```
