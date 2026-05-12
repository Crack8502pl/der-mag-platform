# Camera Points — Punkty kamerowe

## Model danych

Każde zadanie wysyłkowe (`KOMPLETACJA_WYSYLKI`) posiada listę punktów kamerowych
w polu `metadata.cameraPoints`. Każdy punkt kamerowy reprezentuje **jeden słup** w ramach zlecenia.

### Typ `CameraPoint`

```typescript
interface CameraPoint {
  id: number;          // Numer porządkowy (1-based)
  name: string;        // "PK-1" (przejazd) lub "S-KP-1" (SKP)
  poleType: PoleType | null; // 'STALOWY' | 'KOMPOZYT' | 'INNY'
  hasUziom: boolean;   // Czy słup wymaga uziomowania
}
```

## Skąd pochodzi `hasUziom`

`hasUziom` jest **data-driven** — pochodzi z kolumny `warehouse_stock.requires_grounding`.

### Przepływ

```
Admin ustawia WarehouseStock.requiresGrounding = true
  dla pozycji "Słup stalowy 6m M0012"
         │
ShipmentWizard (krok 3)
  └─► użytkownik wybiera M0012 z magazynu
      └─► poleProductInfo = "M0012 | Słup stalowy 6m"
             │
POST /tasks/:taskNumber/request-shipment
  └─► extract catalogNumber z poleProductInfo ("M0012")
      └─► SELECT requires_grounding FROM warehouse_stock
            WHERE catalog_number = 'M0012'
              └─► hasUziom = true
                    └─► generateCameraPoints(N, taskType, poleType, hasUziom=true)
                          ├─► { id:1, name:'PK-1', poleType:'STALOWY', hasUziom:true }
                          ├─► { id:2, name:'PK-2', poleType:'STALOWY', hasUziom:true }
                          └─► { id:3, name:'PK-3', poleType:'STALOWY', hasUziom:true }
```

## Ograniczenia

- W jednym zleceniu wysyłki wszystkie słupy mają **ten sam** `hasUziom`
  (wynikający z wybranego produktu magazynowego).
- Maksymalna liczba punktów kamerowych per zadanie: **10**.
- Brak `poleProductInfo` lub brak wpisu w magazynie → `hasUziom = false` (bezpieczny domyślny).

## Wyświetlanie

`ShipmentDataModal` wyświetla badge `⏚ uziom` przy każdym słupie który ma `hasUziom = true`.

## Przyszłość

- Per-punkt kamerowy konfiguracja (różne typy słupów w jednym zadaniu) — zob. `docs/historia.md`.
- Przypisanie urządzeń do konkretnych słupów w module prefabrykacji.
