# Integracja danych kolejowych PKP PLK

## Źródła danych

Platforma korzysta wyłącznie z otwartych/public domain danych kolejowych:

| Źródło | Dane | Licencja |
|--------|------|----------|
| **Urząd Transportu Kolejowego (UTK)** | Lista linii kolejowych PKP PLK S.A. (kod, nazwa, km od/do) | Dane publiczne |
| **OpenStreetMap / Overpass API** | Stacje, posterunki, przystanki (`railway=station`, `railway=halt`) | ODbL |
| **OpenRailwayMap** | Wizualna warstwa tiles linii kolejowych | CC-BY-SA 2.0 |

---

## Baza danych

### Tabele

#### `railway_lines`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | SERIAL PK | Identyfikator |
| `code` | VARCHAR(20) UNIQUE | Kod linii np. `LK-221`, `E-20` |
| `name` | VARCHAR(200) | Nazwa np. `Tłuszcz – Ostrów Mazowiecka` |
| `km_from` | DECIMAL(8,3) | Km początkowy |
| `km_to` | DECIMAL(8,3) | Km końcowy |
| `length_km` | DECIMAL(8,3) | Długość linii (kmTo - kmFrom) |
| `manager` | VARCHAR(100) | Zarządca (domyślnie `PKP PLK S.A.`) |
| `active` | BOOLEAN | Czy linia aktywna |

#### `railway_stations`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | SERIAL PK | Identyfikator |
| `name` | VARCHAR(200) | Nazwa stacji/posterunku |
| `code` | VARCHAR(20) | Kod posterunku (np. `WAWA`) |
| `line_code` | VARCHAR(20) | Kod linii (FK logiczne do `railway_lines.code`) |
| `line_id` | INTEGER FK | FK do `railway_lines.id` (z kaskadowym DELETE) |
| `type` | VARCHAR(30) | Typ: `stacja`, `posterunek`, `LCS`, `nastawnia`, `przystanek`, `inne` |
| `km_position` | DECIMAL(8,3) | Pozycja kilometryczna na linii |
| `latitude` | DECIMAL(10,7) | Szerokość geograficzna |
| `longitude` | DECIMAL(10,7) | Długość geograficzna |
| `municipality` | VARCHAR(100) | Miejscowość |
| `active` | BOOLEAN | Czy stacja aktywna |

### Migracja

Migracja jest zarejestrowana w `AppDataSource` jako `CreateRailwayTables20260517`.

```bash
# Uruchomienie migracji (przez TypeORM)
npm run migration:run
```

### Seed

`RailwayLinesSeed` zawiera ~57 głównych linii PKP PLK S.A. Seed jest **idempotentny** — pomija seedowanie jeśli tabela zawiera już dane.

Seed uruchamiany jest automatycznie przez `DatabaseSeeder.seed()` przy inicjalizacji serwera.

### Aktualizacja danych linii

Aby zaktualizować listę linii kolejowych:

1. Edytuj tablicę `RAILWAY_LINES_DATA` w pliku `backend/src/seeds/RailwayLinesSeed.ts`
2. Uruchom seed: `npm run seed:force` (jeśli istnieje taki skrypt) lub ręcznie INSERT/UPDATE w bazie

### Importowanie stacji z OpenStreetMap

Stacje można pobrać z Overpass API i zaimportować do bazy:

```bash
# Przykładowe zapytanie Overpass dla stacji w Polsce
curl "https://overpass-api.de/api/interpreter" \
  -d '[out:json];(node["railway"="station"](49,14,54.9,24.2);node["railway"="halt"](49,14,54.9,24.2););out body;' \
  > /tmp/stations.json
```

---

## API Endpointy

Wszystkie endpointy wymagają uwierzytelnienia JWT (Bearer token lub cookie).

Base path: `/api/railway`

### GET `/api/railway/lines`

Lista linii kolejowych z opcjonalnym filtrowaniem.

**Parametry zapytania:**
- `q` (opcjonalne) — fragment kodu lub nazwy linii

**Przykład:**
```bash
GET /api/railway/lines?q=LK-2
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "code": "LK-221", "name": "Tłuszcz – Ostrów Mazowiecka", "kmFrom": 0, "kmTo": 47, "manager": "PKP PLK S.A." }
  ]
}
```

---

### GET `/api/railway/lines/:code`

Szczegóły linii po kodzie.

**Przykład:**
```bash
GET /api/railway/lines/LK-221
```

---

### GET `/api/railway/stations`

Autocomplete stacji kolejowych.

**Parametry zapytania:**
- `q` (wymagane) — fragment nazwy stacji
- `line` (opcjonalne) — kod linii (filtrowanie)
- `limit` (opcjonalne) — max wyników, domyślnie 10

**Przykład:**
```bash
GET /api/railway/stations?q=Wars&line=LK-1&limit=5
```

---

### GET `/api/railway/stations/line/:lineCode`

Wszystkie stacje na danej linii, posortowane po kilometrażu.

**Przykład:**
```bash
GET /api/railway/stations/line/LK-1
```

---

### POST `/api/railway/validate-km`

Walidacja czy podany kilometraż mieści się w zakresie linii.

**Body:**
```json
{ "km": 350, "lineCode": "LK-1" }
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": { "valid": false, "min": 0, "max": 316 }
}
```

---

## Komponenty Frontend

### `<RailwayLineSelect>`

Zastępuje zwykły `<input type="text">` dla pola `liniaKolejowa`.

```tsx
import { RailwayLineSelect } from '../components/common/RailwayLineSelect';

<RailwayLineSelect
  value={detail.liniaKolejowa || ''}
  onChange={(code) => updateTask({ liniaKolejowa: code })}
  placeholder="np. LK-221, E-20"
/>
```

- Wyświetla dropdown z dopasowaniami (debounce 300ms, cache)
- Po wyborze przekazuje **tylko kod** (np. `"LK-221"`)
- Fallback: przy wpisaniu nierozpoznanego kodu stosuje `formatLiniaKolejowa()`

---

### `<StationAutocomplete>`

Autocomplete dla stacji/posterunków.

```tsx
import { StationAutocomplete } from '../components/common/StationAutocomplete';

<StationAutocomplete
  value={detail.nazwaLCS || ''}
  onChange={(v) => updateTask({ nazwaLCS: v })}
  onSelect={(station) => {
    updateTask({
      nazwaLCS: station.name,
      miejscowosc: station.municipality ?? undefined,
      kilometraz: station.kmPosition?.toString() ?? undefined,
    });
  }}
  lineCode={detail.liniaKolejowa}
  filterType={['LCS', 'nastawnia']}
/>
```

---

### `<KilometrazInput>`

Wrapper dla pola kilometraż z opcjonalną walidacją zakresu linii.

```tsx
import { KilometrazInput } from '../components/common/KilometrazInput';

<KilometrazInput
  value={detail.kilometraz || ''}
  onChange={(v) => updateTask({ kilometraz: v })}
  onBlur={(v) => handleKilometrazBlur(subsystemIdx, taskIdx, v)}
  lineCode={detail.liniaKolejowa || detectedRailwayLine}
  required
/>
```

Gdy `lineCode` jest podany i km wykracza poza zakres linii, wyświetla ostrzeżenie:
> ⚠️ Kilometraż 350 poza zakresem linii LK-1 (0–316 km)

---

### Warstwa OpenRailwayMap na mapie (`TasksMapPage`)

Na stronie mapy zadań dostępna jest przełączalna nakładka z liniami kolejowymi (OpenRailwayMap) widoczna w kontrolce warstw (prawy górny róg mapy).

Tiles URL: `https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png`

---

## Hooks

### `useLineSearch(query)`

```ts
import { useLineSearch } from '../hooks/useRailwayAutocomplete';

const { lines, loading } = useLineSearch('LK-2');
```

### `useStationSearch(query, lineCode?)`

```ts
import { useStationSearch } from '../hooks/useRailwayAutocomplete';

const { stations, loading } = useStationSearch('Wars', 'LK-1');
```

Oba hooki mają debounce 300ms i cache w pamięci (resetowany przy odmontowaniu komponentu).
