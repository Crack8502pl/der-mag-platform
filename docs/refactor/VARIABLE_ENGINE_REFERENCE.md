# Variable Engine Reference

- Ostatnia aktualizacja: 2026-07-12
- Wersja: zakres zmian `camera.total.ip.{ogolna,lpr,skp}` + zbiorczy referencyjny wykaz providerów

## Legenda statusów

- ✅ zaimplementowane
- ⚠️ planowane
- 🚫 pominięte

## Soft-fail

Każdy provider Variable Engine zwraca `undefined` zamiast rzucać wyjątek, jeśli:

- wyrażenie nie jest obsługiwane,
- `entityId` jest puste albo niepoprawne,
- serwis danych nie zwróci danych.

To zachowanie jest wspólne dla wszystkich providerów i powinno być uwzględniane przez warstwę renderowania oraz integracje BOM.

## `camera.*` — CameraVariableProvider

Namespace: `camera`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `camera.total` | number | Łączna liczba kamer (z hierarchii) | ✅ |
| `camera.total.ip` | number | Kamery IP (z hierarchii) | ✅ |
| `camera.total.ip.ogolna` | number | Kamery IP ogólne (z hierarchii) | ✅ |
| `camera.total.ip.lpr` | number | Kamery IP LPR (z hierarchii) | ✅ |
| `camera.total.ip.skp` | number | Kamery IP SKP (z hierarchii) | ✅ |
| `camera.total.analog` | number | Kamery analogowe (z hierarchii) | 🚫 pominięte w mapowaniu BOM |
| `camera.storage.tb` | number | Wymagana pojemność TB | ✅ |
| `camera.recording.days` | number | Retencja nagrań w dniach | ✅ |
| `camera.bitrate.mbps` | number | Średni bitrate Mbps/kamera | ✅ |

## `task.*` — TaskVariableProvider

Namespace: `task`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `task.number` | string | Numer taska | ✅ |
| `task.status` | string | Status | ✅ |
| `task.title` | string | Tytuł | ✅ |
| `task.priority` | string | Priorytet | ✅ |
| `task.assignee.name` | string | Przypisana osoba | ✅ |
| `task.due.date` | string | Termin (ISO 8601) | ✅ |
| `task.progress` | number | Postęp % (0–100) | ✅ |

## `contract.*` — ContractVariableProvider

Namespace: `contract`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `contract.number` | string | Numer kontraktu | ✅ |
| `contract.status` | string | Status kontraktu | ✅ |
| `contract.customer.name` | string | Nazwa klienta | ✅ |
| `contract.customer.nip` | string | NIP klienta | ✅ |
| `contract.value.net` | number | Wartość netto | ✅ |
| `contract.value.gross` | number | Wartość brutto | ✅ |
| `contract.date.start` | string | Data startu (ISO 8601) | ✅ |
| `contract.date.end` | string | Data końca (ISO 8601) | ✅ |

## `switch.*` — SwitchVariableProvider

Namespace: `switch`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `switch.total` | number | Łączna liczba switchów | ✅ |
| `switch.total.poe` | number | Switche PoE | ✅ |
| `switch.total.managed` | number | Switche zarządzalne | ✅ |
| `switch.ports.total` | number | Łączna liczba portów | ✅ |
| `switch.ports.poe` | number | Łączna liczba portów PoE | ✅ |

## `fiber.*` — FiberVariableProvider

Namespace: `fiber`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `fiber.length.total` | number | Długość kabla (km) | ✅ |
| `fiber.strands.total` | number | Liczba włókien | ✅ |
| `fiber.connections.total` | number | Liczba połączeń | ✅ |
| `fiber.connections.duplex` | number | Połączenia DUPLEX | ✅ |
| `fiber.connections.wdm` | number | Połączenia WDM | ✅ |

## `ip.*` — IpVariableProvider

Namespace: `ip`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `ip.range` | string | Zakres CIDR np. `"172.16.1.0/24"` | ✅ |
| `ip.gateway` | string | Adres bramy | ✅ |
| `ip.subnet.mask` | string | Maska podsieci | ✅ |
| `ip.hosts.total` | number | Łączna liczba slotów hostów | ✅ |
| `ip.hosts.used` | number | Zajęte sloty hostów | ✅ |
| `ip.hosts.free` | number | Wolne sloty hostów | ✅ |
| `ip.first` | string | Pierwszy adres IP w zakresie | ✅ |
| `ip.last` | string | Ostatni adres IP w zakresie | ✅ |

## `hierarchy.*` — HierarchyVariableProvider

Namespace: `hierarchy`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `hierarchy.parent` | number | ID bezpośredniego rodzica | ✅ |
| `hierarchy.children` | number | Liczba bezpośrednich dzieci | ✅ |
| `hierarchy.depth` | number | Głębokość od korzenia (root = 0) | ✅ |
| `hierarchy.path` | string | Ścieżka przodków np. `"1/2/3"` | ✅ |

## `warehouse.*` — WarehouseVariableProvider

Namespace: `warehouse`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `warehouse.items.total` | number | Łączna liczba pozycji | ✅ |
| `warehouse.items.reserved` | number | Zarezerwowane | ✅ |
| `warehouse.items.available` | number | Dostępne | ✅ |
| `warehouse.value.total` | number | Wartość magazynu | ✅ |
| `warehouse.location` | string | Lokalizacja magazynu | ✅ |

## `user.*` — UserVariableProvider

Namespace: `user`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `user.name` | string | Imię i nazwisko | ✅ |
| `user.email` | string | Adres email | ✅ |
| `user.role` | string | Rola w systemie | ✅ |

## `ai.*` — AiVariableProvider

Namespace: `ai`

| Wyrażenie | Typ | Opis | Status |
|---|---|---|---|
| `ai.summary` | string | Podsumowanie AI | ✅ |
| `ai.recommendation` | string | Rekomendacja AI | ✅ |
| `ai.risk.level` | string | Poziom ryzyka (`low/medium/high`) | ✅ |
| `ai.risk.score` | number | Wynik ryzyka (0–100) | ✅ |

## Obsługiwane klucze `CONFIG_PARAM` w regułach BOM

| Klucz w regule | Opis | Typ |
|---|---|---|
| `cameraCount` | Łączna liczba kamer (prosty fallback) | `number` |
| `camera.total` | Łączna liczba kamer | `number` |
| `camera.total.ip` | Liczba kamer IP | `number` |
| `camera.total.ip.ogolna` | Kamery IP ogólne | `number` |
| `camera.total.ip.lpr` | Kamery IP LPR | `number` |
| `camera.total.ip.skp` | Kamery IP SKP | `number` |
| `lcsConfig.iloscKamer` | Kamery w konfiguracji LCS (nested path) | `number` |
| `nastawniConfig.iloscKamer` | Kamery w konfiguracji nastawni (nested path) | `number` |

> Klucze z dosłowną kropką (np. `camera.total.ip`) mają priorytet przed zagnieżdżoną ścieżką — patrz `DependencyRuleEngine.collectInputValues()` (naprawione w #603).

## Uwagi

- Referencja opisuje aktualnie obsługiwane wyrażenia providerów Variable Engine.
- Status `🚫 pominięte` oznacza wyrażenie istniejące w engine, ale nieużywane w docelowym mapowaniu lub bieżącym zakresie biznesowym.
- Status `⚠️ planowane` należy stosować dla wyrażeń zarezerwowanych do przyszłej implementacji, ale jeszcze nieobecnych w providerach.
