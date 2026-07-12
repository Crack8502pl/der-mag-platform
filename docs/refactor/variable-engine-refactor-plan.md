# Variable Engine Refactor Plan

## 1. Cel

Celem refaktoringu jest stworzenie centralnego, rozszerzalnego i stabilnego **Global Variable Engine**, który będzie dostarczał dynamiczne zmienne do różnych modułów platformy (BOM, PDF, Reports, Labels, Emails), ale sam **nie będzie zależny domenowo** od żadnego z nich.

## 2. Problem obecny

- Dynamiczne zmienne w szablonach działają częściowo i niestabilnie.
- Logika wyliczeń jest rozproszona.
- Występuje ryzyko duplikacji i N+1 w traversalu hierarchii.
- Brak centralnego cache dla wartości zmiennych.
- Brak spójnej polityki fallback i obsługi błędów.
- Dodanie nowej zmiennej może wymagać modyfikacji wielu miejsc.

## 3. Docelowa architektura (wysoki poziom)

### Komponenty core

- `VariableContext`
- `VariableProvider`
- `VariableRegistry`
- `VariableParser`
- `VariableResolver`
- `VariableEvaluator`
- `VariableCache`
- `TemplateRenderer` (jako konsument engine)

### Zasady

- SOLID
- Dependency Injection
- Strict TypeScript
- Brak `any`
- Brak static services
- OCP: nowa zmienna = nowa klasa providera, bez zmian w core
- Soft-fail: błędy providera nie crashują renderowania

## 4. Zakres refaktoringu

### In scope

- Wydzielenie i wdrożenie Variable Engine.
- Integracja z aktualnym mechanizmem renderowania templatek.
- Reużycie istniejących traversal/calculation services.
- Wprowadzenie cache L1/L2.
- Wprowadzenie fallback policy.
- Testy jednostkowe/integracyjne dla engine.
- Aktualizacja dokumentacji repozytorium.

### Out of scope (etapowo)

- Pełna migracja wszystkich modułów jednocześnie.
- Wprowadzenie rozproszonego cache (np. Redis) w pierwszym etapie.
- Rozbudowany pakiet funkcji matematycznych (po MVP).

## 5. Wymagania jakościowe (Definition of Done global)

1. TypeScript build przechodzi bez błędów.
2. Pokrycie testami dla nowego modułu: **70–80%**.
3. Brak regresji krytycznej w renderowaniu istniejących templatek.
4. Dokumentacja zaktualizowana po każdym PR.
5. Dla zmian DB: wszystkie migracje zawierają datę utworzenia w nazwie.
6. Sekcja „Możliwe błędy i ograniczenia” dla każdego PR.
7. Jeśli PR dotyka UI:
   - poprawna obsługa przełączania motywu:
     - `grover-theme` (ciemny)
     - `huskey-theme` (jasny)

## 6. Strategia migracji i rollout

- Feature flag dla nowego engine (`variableEngineV2`).
- Etapowe przełączanie modułów na nowy silnik.
- Utrzymanie kompatybilności wstecznej przez aliasy zmiennych (czasowo).
- Możliwość rollbacku na stary resolver do czasu pełnej stabilizacji.

## 7. Ryzyka i mitigacje

### Ryzyko: regresja istniejących templatek
**Mitigacja:** snapshot tests + compatibility aliases + feature flag.

### Ryzyko: N+1 i spadki wydajności
**Mitigacja:** cache L1/L2, batchowanie danych, reużycie traversal service.

### Ryzyko: niespójne nazewnictwo zmiennych
**Mitigacja:** centralny manifest zmiennych + review naming convention.

### Ryzyko: cykliczne zależności
**Mitigacja:** jasny kierunek zależności:
`consumer modules -> engine core -> providers -> domain services`.

## 8. Struktura katalogów (docelowa)

```text
src/modules/variable-engine/
  contracts/
  parser/
  registry/
  resolver/
  evaluator/
  cache/
  providers/
  functions/
  renderer/
  errors/
  config/
  index.ts
```

## 9. Standard nazewnictwa zmiennych

- Format: `namespace.metric` (np. `camera.total`, `fiber.length.total`)
- Zagnieżdżenia: `namespace.group.metric`
- Nazwy spójne, liczby w `count/total`, sumy w `total`, booleany jako `is/has`.

## 10. Publiczne API (wstępny draft)

- `contract.*`
- `hierarchy.*`
- `camera.*`
- `switch.*`
- `fiber.*`
- `warehouse.*`
- `task.*`
- `ip.*`
- `ai.*`
- `user.*`

## 11. Status implementacji (PR-9 – Performance & Stabilization)

### Zrealizowane (PR-9)

- **LRU Cache**: Ulepszono `L1VariableCache` z FIFO na LRU – często używane wpisy nie są eksmitowane.
- **N+1 Elimination**: Dodano `DataFetchDeduplicator` – każdy provider używa deduplikacji, dzięki czemu współbieżne wywołania dla tych samych danych (np. `camera.total` i `camera.storage.tb`) korzystają z jednego zapytania do serwisu danych.
- **Profiling**: `VariableResolver` teraz loguje `durationMs` przy każdym wywołaniu providera, co ułatwia profilowanie slow providerów.
- **Refaktoryzacja**: `parseEntityId` przeniesiono do `AbstractVariableProvider` – eliminacja duplikacji w 9 providerach.
- **Snapshot tests**: 13 snapshot testów pokrywa renderowanie templatek we wszystkich scenariuszach (camera, contract, fiber, task, user, hierarchy, multi-provider, fallback).
- **Publiczne API zmiennych bez zmian** – zachowana kompatybilność wsteczna.

