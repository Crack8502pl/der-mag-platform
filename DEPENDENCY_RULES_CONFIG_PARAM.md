# CONFIG_PARAM w regułach zależności BOM

## Co to jest `CONFIG_PARAM`
`CONFIG_PARAM` to nowy typ wejścia reguły zależności BOM. Pozwala pobierać wartość bezpośrednio z `configParams` przekazywanych z Task Config Wizarda (również po ścieżkach zagnieżdżonych, np. `lcsConfig.iloscKamer`).

Dzięki temu reguły nie muszą bazować wyłącznie na pozycjach BOM (`ITEM`) albo wynikach innych reguł (`RULE_RESULT`).

## Dostępne parametry Wizarda (UI)

### 📷 Kamery i rejestratory
- `cameraCount` — łączna liczba kamer
- `recordingDays` — dni retencji
- `bitrateMbps` — bitrate Mbps/kamera
- `requiredStorageTb` — wymagana pojemność TB
- `diskSlots` — sloty HDD rejestratora
- `recorderId` — ID wybranego rejestratora

### 🏗️ Konfiguracja LCS / Nastawnia
- `lcsConfig.iloscKamer` — kamery LCS (wyliczane i zapisywane przez Task Config Wizard; nie przez LCSConfigModal)
- `lcsConfig.iloscStanowisk` — stanowiska
- `lcsConfig.serwerObrazu.maxKamer` — max kamer serwera
- `nastawniConfig.iloscKamer` — kamery Nastawni samodzielnej (wyliczane przez Wizard z pól `*kamer*` z `configValues`)
- `nastawniConfig.stacjaOperatorska.przypisaneKamery.length`

### ⚙️ Parametry z szablonu BOM
- `iloscKamerOgolnych` — kamery ogólne
- `iloscKamerLPR` — kamery LPR
- `iloscSlupow` — ilość słupów

## Przykładowy łańcuch reguł LCS/Nastawnia

1. `SELECT_RECORDER`
   - wejście: `CONFIG_PARAM -> cameraCount`
   - cel: pozycja rejestratora

2. `SELECT_DISKS`
   - wejście #1: wynik reguły pojemności (np. `CALCULATE_STORAGE`)
   - wejście #2 (opcjonalnie): wynik reguły z ID/stock rejestratora
   - cel: pozycja dysków

W praktyce konfiguracja typowo wygląda jako:
`cameraCount` + `recordingDays` → obliczenie TB → dobór dysków.

## Jak konfigurować szablony BOM dla SMOKIP_A LCS i NASTAWNIA

1. W regule wejściowej wybierz typ **Parametr Wizarda** (`CONFIG_PARAM`).
2. Dla LCS SMOKIP_A użyj:
   - `lcsConfig.iloscKamer` (wartość wyliczona przez Wizard),
   - `cameraCount` (wyliczane w Wizardzie).
3. Dla NASTAWNIA użyj:
   - `nastawniConfig.iloscKamer`, lub
   - `nastawniConfig.stacjaOperatorska.przypisaneKamery.length`, zależnie od wariantu.
4. Dla retencji i pojemności używaj `recordingDays` + reguły `CALCULATE_STORAGE`.
5. Upewnij się, że kolejność ewaluacji (`evaluationOrder`) zachowuje łańcuch:
   - najpierw reguły wejściowe (kamery/retencja),
   - potem reguły pochodne (rejestrator, dyski).

## Priorytet źródeł `cameraCount` (Wizard)

1. Live `configValues` z bieżącej sesji Wizarda (`*kamer*`, bez kluczy modeli/selected)
2. Zapisane `task.metadata.lcsConfig.iloscKamer` / `task.metadata.nastawniConfig.iloscKamer`
3. Strukturalne fallbacki (`lcsConfig.serwerObrazu.maxKamer`, `nastawniConfig.stacjaOperatorska.przypisaneKamery.length`)
4. Fallback obserwacji (`obserwowanePrzejazdy.length * 2` dla LCS, `obserwowanePrzejazdy.length` dla samodzielnej Nastawni)
5. Ostateczny fallback: `0`

## Ostrzeżenie: poprawna ścieżka metadata

Docelowa ścieżka konfiguracji to:
- `task.metadata.lcsConfig`
- `task.metadata.nastawniConfig`

Ścieżki legacy `task.metadata.configParams.lcsConfig` i `task.metadata.configParams.nastawniConfig` są obsługiwane tylko dla kompatybilności wstecznej odczytu/migracji.
