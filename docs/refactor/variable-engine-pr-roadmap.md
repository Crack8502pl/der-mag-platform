# Variable Engine PR Roadmap (zależności i ograniczenia)

## Legenda

- `depends_on`: PR nie może być mergowany przed wskazanymi PR.
- `parallelizable`: może być realizowany równolegle.
- `risk`: główne ryzyko techniczne.
- `constraints`: ograniczenia wejściowe/wyjściowe.

---

## PR-1: Variable Engine Foundation

**Cel:** Zbudować core engine (parser, evaluator, registry, cache interfaces, context contracts).  
**Zakres:**
- Skeleton modułu `variable-engine`
- Kontrakty i interfejsy
- Parser `${...}` (bez pełnych funkcji)
- Evaluator + Resolver flow (MVP)
- Testy unit core

**depends_on:** —  
**parallelizable:** NIE (fundament)  
**constraints:**
- strict TS
- brak `any`
- DI-ready
- brak static services

**Akceptacja:**
- TS build OK
- testy core green
- dokumentacja modułu startowego

**Możliwe błędy:**
- parser edge cases
- błędne mapowanie tokenów do resolvera

---

## PR-2: Provider Contract + Auto Registration (DI)

**Cel:** Ustandaryzować i zautomatyzować rejestrację providerów.  
**Zakres:**
- `VariableProvider` contract
- rejestr providerów
- auto-registration przez DI container
- walidacja konfliktów namespace

**depends_on:** PR-1  
**parallelizable:** Ograniczone  
**constraints:**
- brak ręcznych switch-case na typy zmiennych
- OCP compliance

**Akceptacja:**
- dodanie nowego providera bez zmian w core
- testy rejestracji i konfliktów

**Możliwe błędy:**
- duplikaty kluczy zmiennych
- problemy z kolejnością inicjalizacji DI

---

## PR-3: Template Integration Adapter (BOM path first)

**Cel:** Podłączyć nowy engine do istniejącego renderowania (najpierw BOM).  
**Zakres:**
- adapter renderowania
- wpięcie feature flag
- fallback do starego resolvera (tymczasowo)

**depends_on:** PR-1, PR-2  
**parallelizable:** NIE  
**constraints:**
- brak twardych zależności engine -> BOM
- zgodność wsteczna templatek

**Akceptacja:**
- BOM templates renderowane przez adapter
- możliwość rollback przez flagę

**Możliwe błędy:**
- różnice semantyki null/undefined
- niejawne zależności starego parsera

---

## PR-4: Hierarchy Providers + Traversal Reuse

**Cel:** Wykorzystać istniejący traversal rekurencyjny do zmiennych hierarchii.  
**Zakres:**
- providery: `hierarchy.*`
- reużycie istniejących usług traversalu
- cache wyników hierarchii

**depends_on:** PR-2  
**parallelizable:** TAK (z PR-6 częściowo)  
**constraints:**
- zero duplikacji traversal logic
- ochrona przed cyklami

**Akceptacja:**
- poprawne `parent/children/depth/path`
- testy z różnymi głębokościami

**Możliwe błędy:**
- pętle w danych hierarchii
- N+1 queries

---

## PR-5: CCTV/Network/Fiber Providers

**Cel:** Dostarczyć providery techniczne: kamery, switche, fiber, IP.  
**Zakres:**
- `camera.*`
- `switch.*`
- `fiber.*`
- `ip.*`

**depends_on:** PR-2, PR-4  
**parallelizable:** TAK (z PR-6)  
**constraints:**
- reużycie istniejących calculator/services
- spójny naming convention

**Akceptacja:**
- minimalny zestaw zmiennych działający E2E
- testy integracyjne providerów

**Możliwe błędy:**
- niespójności jednostek (metry/sztuki/waty)
- zależności między providerami

---

## PR-6: Contract/Warehouse/Task/AI Providers

**Cel:** Dostarczyć providery biznesowe.  
**Zakres:**
- `contract.*`
- `warehouse.*`
- `task.*`
- `ai.*`
- `user.*` (jeśli wymagane)

**depends_on:** PR-2  
**parallelizable:** TAK (z PR-5)  
**constraints:**
- brak duplikacji logiki domenowej
- jawne fallbacki dla braków danych

**Akceptacja:**
- zmienne biznesowe renderują się poprawnie
- testy integracyjne

**Możliwe błędy:**
- nullability i brakujące relacje
- rozjazdy statusów biznesowych

---

## PR-7: Error Policy + Observability

**Cel:** Dodać politykę błędów i telemetrię działania engine.  
**Zakres:**
- strategie fallback
- structured logs
- trace mode (dev)

**depends_on:** PR-1  
**parallelizable:** TAK  
**constraints:**
- brak wycieku stack trace do outputu produkcyjnego

**Akceptacja:**
- brak crashy renderera na błędach providerów
- logi pozwalają diagnozować problemy

**Możliwe błędy:**
- zbyt „ciche” ukrywanie błędów
- nadmiar logów

---

## PR-8: Function Registry (MVP functions)

**Cel:** Wsparcie funkcji w zmiennych.  
**Zakres:**
- `count`, `round`, `uppercase` (MVP)
- parser rozszerzony o function calls
- walidacja argumentów

**depends_on:** PR-1, PR-3  
**parallelizable:** Ograniczone  
**constraints:**
- bez redesignu parsera
- pełna kompatybilność z dot notation

**Akceptacja:**
- `${count(children)}`
- `${round(fiber.length.total)}`
- `${uppercase(contract.customer.name)}`

**Możliwe błędy:**
- błędy typów argumentów
- zagnieżdżone wywołania funkcji

---

## PR-9: Performance & Stabilization

**Cel:** Optymalizacja i utwardzenie pod produkcję.  
**Zakres:**
- profilowanie krytycznych providerów
- tuning cache keys
- eliminacja N+1
- snapshot tests templatek

**depends_on:** PR-4, PR-5, PR-6  
**parallelizable:** NIE  
**constraints:**
- brak zmiany publicznego API zmiennych

**Akceptacja:**
- poprawa czasu renderu
- brak regresji funkcjonalnych

**Możliwe błędy:**
- cache invalidation
- regresje wydajności po merge wielu PR

---

## PR-10: Final Rollout + Deprecation starego resolvera

**Cel:** Pełne przejście na nowy engine.  
**Zakres:**
- domyślne włączenie `variableEngineV2`
- deprecacja starego resolvera
- finalna dokumentacja użytkowa i developerska

**depends_on:** **PR-2, PR-6** (minimum), rekomendowane: PR-3, PR-7, PR-9  
**parallelizable:** NIE  
**constraints:**
- rollout tylko po stabilizacji
- plan rollbacku musi istnieć

**Akceptacja:**
- nowy engine jako default
- brak krytycznych błędów po smoke testach

**Możliwe błędy:**
- nieodkryte edge cases w templatekach legacy
- brakujące aliasy kompatybilności

---

## Zależności kluczowe (skrót)

- PR-10 dopiero po PR-2 i PR-6 (minimum).
- PR-5 i PR-6 mogą iść równolegle po PR-2.
- PR-9 dopiero po większości providerów.

---

## Wymagania wspólne dla każdego PR

1. Aktualizacja dokumentacji repo.
2. Sekcja „Ograniczenia i możliwe błędy”.
3. TS build bez błędów.
4. Testy adekwatne do zakresu PR.
5. Jeśli zmiany DB: migracja z datą w nazwie.
6. Jeśli zmiany UI: test przełączania:
   - `grover-theme` (ciemny)
   - `huskey-theme` (jasny)
