# Camera Points — Model i Przepływ Danych

## Przegląd

Punkt kamerowy (`CameraPoint`) reprezentuje jeden słup w zadaniu SKP lub PRZEJAZD. Każdy punkt ma dwojaką rolę:

1. **Dane słupa (infrastruktura)** — typ słupa, uziemienie, numer katalogowy produktu
2. **Lokacja urządzeń** — przypisanie kamer i innych urządzeń do konkretnego słupa

---

## Model danych

```typescript
export interface CameraPoint {
  id: number;
  name: string;           // np. "S-KP-1", "PK-2"

  // ROLA 1: Dane słupa
  poleType: 'STALOWY' | 'KOMPOZYT' | 'INNY' | null;
  hasUziom: boolean;      // pochodzi z WarehouseStock.requiresGrounding
  poleProductInfo?: string | null;  // "catalogNumber | materialName"

  // ROLA 2: Lokacja urządzeń
  assignedDevices: AssignedDevice[];
}
```

### Pole `hasUziom`

Flaga `hasUziom` **nigdy nie jest hardcoded** — pochodzi zawsze z bazy danych:

- Admin ustawia `requiresGrounding = true` na produkcie (`WarehouseStock`) raz w magazynie
- Przy zlecaniu wysyłki backend wykonuje lookup po numerze katalogowym ze `poleProductInfo`
- Wartość jest przenoszona do każdego wygenerowanego punktu kamerowego

Wsteczna kompatybilność: istniejące rekordy `metadata.cameraPoints` bez pola `hasUziom` traktowane są jako `false`.

---

## Przepływ danych

```
WarehouseStock "Słup stalowy 6m M0012"
  └── requiresGrounding: TRUE   ← admin ustawia raz w magazynie

ShipmentWizard → wybór M0012 → poleQuantity=3
  └── POST /api/tasks/:taskNumber/request-shipment
        └── lookup WarehouseStock by catalogNumber (extract z poleProductInfo)
              └── requiresGrounding = true
                    └── generateCameraPoints(3, taskType, 'STALOWY', hasUziom=true)
                          ├── { id:1, name:'S-KP-1', poleType:'STALOWY', hasUziom:true }
                          ├── { id:2, name:'S-KP-2', poleType:'STALOWY', hasUziom:true }
                          └── { id:3, name:'S-KP-3', poleType:'STALOWY', hasUziom:true }
```

Wygenerowane punkty są zapisywane w `metadata.cameraPoints` zadania `KOMPLETACJA_WYSYLKI`.

---

## Instrukcja dla administratora

Aby oznaczyć typ słupa jako wymagający uziemienia:

1. Przejdź do modułu **Magazyn** → lista materiałów
2. Znajdź produkt słupa (np. "Słup stalowy 6m M0012")
3. Edytuj produkt i zaznacz pole **"Wymaga uziemienia"** (`requiresGrounding`)
4. Zapisz zmiany

Od tej pory każde nowe zlecenie wysyłki wybierające ten produkt automatycznie wygeneruje punkty kamerowe z `hasUziom: true`.

---

## Przykładowy JSON w metadata.cameraPoints

```json
[
  { "id": 1, "name": "S-KP-1", "poleType": "STALOWY", "hasUziom": true, "assignedDevices": [] },
  { "id": 2, "name": "S-KP-2", "poleType": "STALOWY", "hasUziom": true, "assignedDevices": [] },
  { "id": 3, "name": "S-KP-3", "poleType": "STALOWY", "hasUziom": false, "assignedDevices": [] }
]
```

---

## Prefiksy nazw punktów

| Typ zadania | Prefiks |
|-------------|---------|
| SKP         | `S-KP-` |
| Inne (PRZEJAZD, itp.) | `PK-` |

Maksymalna liczba punktów kamerowych na zadanie: **10**.
