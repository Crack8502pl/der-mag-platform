# Form & Checklist Engine — analiza repozytorium

**Data analizy:** 2026-10-02
**Zakres:** etap 1 dla #686 — analiza i dokumentacja, bez zmian w kodzie produkcyjnym i bez migracji.

## Podsumowanie

Platforma ma już zadania, checklisty aktywności, kreatory konfiguracji, zaawansowane reguły BOM, Variable Engine, RBAC, załączniki i audyt wybranych operacji. Można je wykorzystać jako integracje i wzorce, ale nie tworzą one kompletnego, wersjonowanego silnika formularzy: brakuje wspólnego modelu definicji formularza, niezmiennej wersji definicji, instancji wypełnienia, typowanych wartości i zatwierdzeń.

## 1. Co już istnieje

### Model domeny: zadania, kontrakty i obiekty

- TypeORM i PostgreSQL są głównym mechanizmem persystencji. Encje są deklarowane dekoratorami TypeORM i jawnie rejestrowane w `backend/src/config/database.ts`.
- `Task` (`backend/src/entities/Task.ts:17-23,55-84`) ma własny self-reference `parentTask` / `childTasks`, powiązania z typem zadania, kontraktem, podsystemem, brygadą i BOM oraz elastyczne `metadata` JSONB (`:117-118`). `TaskRelationship` to oddzielny model relacji pomiędzy `SubsystemTask` (`backend/src/entities/TaskRelationship.ts:17-45`); nie należy utożsamiać go z hierarchią `Task`.
- `SubsystemTask` (`backend/src/entities/SubsystemTask.ts:12-32`) jest osobną encją ze statusem procesu, śledzeniem BOM/kompletacji/prefabrykacji/weryfikacji i powiązaniem z obiektem (`:58-74,111-135`). `Subsystem` należy do `Contract` i ma własny typ/status (`backend/src/entities/Subsystem.ts:9-35,54-72`).
- `Contract` zawiera status, kierownika, specyfikację i relację do podsystemów (`backend/src/entities/Contract.ts:8-21,43-73`). Obiekty kontraktu obsługuje m.in. `Asset` (rejestracja encji w `backend/src/config/database.ts:89-92`); API ma osobne ścieżki kontraktów, podsystemów i obiektów.
- Kreator kontraktu udostępnia `POST /wizard` i osobne operacje zatwierdzania/rozszerzania (`backend/src/routes/contract.routes.ts:17-59,68-80`). `WizardDraft` przechowuje stan JSONB i krok bieżącego kreatora, unikalnie dla typu kreatora i użytkownika; to zapis draftu, a nie historia wersji (`backend/src/entities/WizardDraft.ts:17-52`).

### Checklisty, załączniki, użytkownicy i audyt

- Istnieje checklistopodobny model aktywności: `ActivityTemplate` ma kolejność, hierarchię, wymagane zdjęcia i konfigurację (`backend/src/entities/ActivityTemplate.ts:7-49`), a `TaskActivity` zapisuje wykonanie, osobę, datę, notatki i licznik zdjęć (`backend/src/entities/TaskActivity.ts:9-57`). Jest przypisany do `Task`, a nie uniwersalnej instancji formularza.
- Pliki są obsługiwane kilkoma wyspecjalizowanymi modelami: `Document` (`backend/src/entities/Document.ts:9-78`), `Photo` (`backend/src/entities/Photo.ts:3-61`), `QualityPhoto` powiązane z zadaniem/aktywnością i statusem akceptacji (`backend/src/entities/QualityPhoto.ts:9-90`) oraz `SubsystemDocument`. Nie ma generycznej relacji załącznika do odpowiedzi formularza.
- `User` ma pojedynczą rolę (`backend/src/entities/User.ts:9-10,46-54`), a `Role.permissions` przechowuje granularny JSONB RBAC (`backend/src/entities/Role.ts:223-264`). Uprawnienia obejmują m.in. zadania, kontrakty, dokumenty i brygady.
- Zespoły pracowników to `Brigade` i `BrigadeMember` (`backend/src/entities/Brigade.ts:16-40`, `backend/src/entities/BrigadeMember.ts:15-46`); istnieją także `TaskAssignment` (`backend/src/entities/TaskAssignment.ts:8-39`).
- Nie znaleziono wspólnego audytu zmian formularzy ani ogólnego `AuditLog`. Istnieją m.in. aktywności zadania i wyspecjalizowany `EmailAutomationAuditLog` (`backend/src/entities/EmailAutomationAuditLog.ts:3-28`), które nie zastępują audytu odpowiedzi/zmian definicji.

### BOM, reguły, triggery i zmienne

- BOM ma szablony, pozycje i dependency rules. `BomTemplateDependencyRule` wspiera kolejność ewaluacji, typ agregacji/operacji, kryteria JSONB, wejścia oraz warunki (`backend/src/entities/BomTemplateDependencyRule.ts:20-48,69-121`). `CONFIG_PARAM` pobiera parametry konfiguracji Wizarda, w tym klucze zagnieżdżone i klucze zawierające kropki (`docs/bom/DEPENDENCY_RULES_CONFIG_PARAM.md:3-18`).
- `BomTrigger` opisuje zdarzenie, warunek i typ akcji dla BOM (`backend/src/entities/BomTrigger.ts:8-15,28-38`); obsługę śledzi także `BomTriggerLog`. To automatyzacja BOM, nie ogólny silnik formularzy/workflow.
- Variable Engine obsługuje parser i podstawianie `${...}`, provider-y, registry, cache, funkcje i politykę fallback/strict (`backend/src/modules/variable-engine/contracts/index.ts:36-46,167-215,333-418`; `backend/src/modules/variable-engine/evaluator/VariableEvaluator.ts:7-13,86-139`). Dostępne namespace’y i bieżące zmienne opisuje `docs/refactor/VARIABLE_ENGINE_REFERENCE.md`.
- Reuse: używać Variable Engine do odczytu dozwolonych danych kontekstowych i prezentacji wartości. Nie wykorzystywać go jako wykonawcy dowolnych reguł biznesowych formularza; nie wprowadzać `eval()`.

### Statusy, API, walidacja i migracje

- Statusy nie są jednym wspólnym workflow. Przykładowo `TaskWorkflowStatus` opisuje kompletację/prefabrykację/wysyłkę/weryfikację (`backend/src/entities/SubsystemTask.ts:12-25`), a kontrakty, podsystemy, zdjęcia i aktywności mają osobne statusy. Przegląd: `docs/STATUS_DEFINITIONS.md`.
- API używa Express Router → kontroler → serwis; przykładowo `task.routes.ts` składa `authenticate`, kontrolę uprawnień i `validateDto` przed kontrolerem (`backend/src/routes/task.routes.ts:1-22`). DTO korzystają z `class-validator`/`class-transformer` (`backend/src/dto/CreateTaskDto.ts:4-8`), a wspólny middleware zwraca błędy walidacji 400 (`backend/src/middleware/validator.ts:11-40`). Trasy nie są całkowicie jednolite — kontraktowy wizard nie używa tu tego samego `validateDto` (`backend/src/routes/contract.routes.ts:32-38`).
- Uprawnienia egzekwuje middleware per moduł/akcja (`backend/src/middleware/permissions.ts:15-75`); ograniczenia kontekstowe, np. własne zadanie pracownika, wymagają dodatkowych kontroli, a nie samego RBAC roli (`:231-301`).
- Są dwa aktywne wzorce migracji: migracje TypeORM w `backend/src/migrations/` (rejestrowane w `backend/src/config/database.ts:102-111,241-250`) oraz skrypty SQL w `backend/scripts/migrations/`, uruchamiane skryptem `migrate:all` (`backend/package.json:17-19`). Nazwy istniejących migracji nie są jednolite; nowa migracja w etapie 2 powinna mieć jawny datowany prefiks zgodny z wybranym mechanizmem. Ten etap nie dodaje migracji.
- Wersjonowanie jest lokalne: `NetworkTopology` ma numer `version` (`backend/src/entities/NetworkTopology.entity.ts:37-48`), a kreatory zapisują drafty. Nie znaleziono ogólnego modelu wersjonowania i publikacji szablonów formularzy.

### Frontend, zależności, motywy i testy

- Formularze to obecnie komponenty React z lokalnym stanem i ręczną walidacją, m.in. `frontend/src/components/tasks/TaskConfigWizard/TaskConfigWizard.tsx`, `frontend/src/components/contracts/wizard/ContractWizardModal.tsx`, `frontend/src/components/users/UserCreateModal.tsx` i `frontend/src/components/devices/DeviceFormModal.tsx`. Nie ma wspólnego, metadanymi sterowanego renderer-a formularzy.
- Backend `backend/package.json`: TypeORM `^0.3.30` (lock: `0.3.31`), `class-validator` `^0.14.0` (lock: `0.14.4`), Jest `^29.7.0`. Frontend `frontend/package.json`: React `^19.2.6`, `@dnd-kit/core` `^6.3.1`, `@dnd-kit/utilities` `^3.2.2`, Vitest `^4.1.11`. Frontend nie deklaruje bezpośrednio `react-hook-form`, `zod` ani `@hookform/resolvers`; `zod` występuje w lockfile w wersji `4.3.6`, ale nie jako zależność główna.
- Grover (ciemny) dostarcza globalne zmienne CSS, bazowe kontrolki formularzy i style kreatora (`frontend/src/styles/grover-theme.css:7-38,147-193,316-426`); oba motywy są importowane w `frontend/src/App.tsx:68-69`. Huskey (jasny) ma osobny arkusz `frontend/src/styles/husky-theme.css`, oparty o `[data-theme="husky"]`; zasady i zmienne opisuje `docs/CSS_THEME_SYSTEM.md`. Nowe komponenty powinny używać zmiennych CSS, a nie kodować palety na stałe.
- Backend używa Jest (`backend/jest.config.js:18-32`) z progami coverage 70% branches, 60% functions, 65% lines/statements (`:35-53`). Frontend używa Vitest + jsdom (`frontend/vitest.config.ts:4-9`) i progów 70% (`:10-29`), ale coverage obejmuje wyłącznie `src/utils` (`:16-23`). Repozytorium zawiera 124 backendowe i 31 frontendowych plików testowych; nie znaleziono śledzonych raportów z aktualnym wynikiem coverage, więc progi konfiguracyjne nie są pomiarem bieżącego pokrycia.
- Polecenia build: `cd backend && npm run build` (`backend/package.json:10`) i `cd frontend && npm run build` (`frontend/package.json:8`). Testy: `cd backend && npm test -- --runInBand` oraz `cd frontend && npm test`.

## 2. Co można wykorzystać (reuse)

1. `Task`, `SubsystemTask`, `Contract`, `Subsystem`, `User`, `Brigade` oraz przypisania jako kontekst instancji i odbiorców — bez mieszania różnych hierarchii zadań.
2. `ActivityTemplate` / `TaskActivity` jako referencję dla elementów checklisty, kolejności, obowiązkowości, wykonawcy i zdjęć; nie jako definicję uniwersalnego formularza.
3. `Document`, `Photo`, `QualityPhoto` i istniejący upload/ACL jako punkty integracji załączników; dodać powiązanie z odpowiedzią formularza, jeśli wymaga tego domena.
4. `class-validator`, DTO, middleware autoryzacji/RBAC, logger i API Express jako istniejące konwencje backendowe.
5. Variable Engine wyłącznie dla typowanych, jawnie dozwolonych zmiennych i renderowania; wzorzec `BomTrigger` może pomóc w projektowaniu deklaratywnych reguł, ale nie powinien być rozszerzany na silnik dowolnego workflow.
6. `@dnd-kit` do kolejności sekcji/pól w edytorze oraz istniejące zmienne CSS do stylowania po stronie React.

## 3. Czego rzeczywiście brakuje

- Jednego modelu wersjonowanej definicji formularza/checklisty oraz kontrolowanego cyklu szkic → publikacja → wycofanie.
- Instancji powiązanej z konkretną niezmienną wersją szablonu, kontekstem biznesowym, odbiorcami i stanem wypełnienia.
- Uporządkowanych sekcji i typowanych definicji pól, walidacji definicji oraz bezpiecznej reprezentacji warunków/wyzwalaczy.
- Zapisanych, typowanych wartości odpowiedzi z historią zmian i walidacją po stronie serwera.
- Modelu zatwierdzeń, historii decyzji, komentarzy i jawnego audytu zmian definicji/odpowiedzi.
- Uniwersalnego powiązania odpowiedzi/załącznika z zadaniem, podsystemem lub obiektem kontraktu oraz zakresowej kontroli dostępu do tych danych.
- Generycznego API i front-endowego renderer-a/edytora, które obsługują powyższe bez kodowania każdego formularza jako odrębnego komponentu.

## 4. Wstępna lista encji do etapu 2

| Encja | Odpowiedzialność / uwagi |
|---|---|
| `FormTemplate` | Tożsamość szablonu, typ, status publikacji, właściciel i kontekst przypisania. |
| `FormTemplateVersion` | Niezmienny snapshot definicji, numer wersji, autor i czas publikacji; edycja po publikacji tworzy nową wersję. |
| `FormSection` | Sekcja/strona, stabilny klucz i kolejność w obrębie wersji. |
| `FormFieldDefinition` | Stabilny klucz pola, typ danych, konfiguracja, obowiązkowość, reguły walidacji i ewentualne referencje do zmiennych. |
| `FormTrigger` / `FormAssignmentRule` | Jawne zdarzenie lub kryterium przypisania do typu/kontekstu/użytkownika/brygady; deterministyczne, ograniczone reguły zamiast kodu. |
| `FormInstance` | Wypełnienie wskazujące konkretny `FormTemplateVersion`, powiązany rekord domenowy, status i przypisanych wykonawców. |
| `FormFieldValue` | Wartość typowana instancji/pola, walidacja serwerowa i dane autora/czasu; indeksować instancję i klucz pola. |
| `FormApproval` | Decyzja, etap, osoba, czas i komentarz; rozważyć osobny niezmienny dziennik zdarzeń dla zmian. |

Podział `FormSection`/`FormFieldDefinition` może być relacyjny albo przechowywany w snapshotcie wersji, ale opublikowana definicja musi pozostać odtwarzalna. Rozważyć osobny rekord historii wartości/audytu oraz tabelę wiążącą załącznik z instancją/polem, jeśli załączniki są częścią formularza.

## 5. Ryzyka i możliwe pułapki

- **Niezmienność:** edycja opublikowanej wersji zmienia znaczenie starych odpowiedzi i zatwierdzeń. Instancja musi przypinać dokładny numer wersji; publikację i snapshot warto wykonać atomowo.
- **Skalowanie/N+1:** ładowanie formularza z polami, wartościami, użytkownikami, brygadami i załącznikami może generować wiele zapytań. Używać jawnych projekcji/relacji, indeksów i paginacji historii zamiast ładowania całego grafu TypeORM.
- **RBAC i zakres danych:** uprawnienie do modułu nie gwarantuje dostępu do konkretnej instancji. Serwer musi sprawdzać tenant/kontekst zadania, przypisanie do wykonawcy/brygady i akcję (odczyt, edycja, zatwierdzenie); nie ufać widoczności kontrolek frontendu.
- **Reguły domenowe:** `PRECONFIGURATION` ≠ `ASSEMBLY`; `installedIn` może być użyte wyłącznie w `FIELD INSTALLATION`. Nie znaleziono tych terminów/pola jako implementacji w backendzie ani frontendzie, więc etap 2 musi utrwalić te ograniczenia jako reguły domenowe i testy, nie dopowiadać im znaczenia w generycznym edytorze.
- **Reguły/wyzwalacze:** JSON z regułą nie może być wykonywany jako JavaScript. Stosować allowlistę operatorów, typowaną składnię, limity głębokości/rozmiaru i walidację przy publikacji; nigdy `eval()`.
- **Załączniki i audyt:** odpowiedzi mogą zawierać dane wrażliwe. Egzekwować autoryzację również przy pobraniu pliku, limity/typy MIME, retencję i audyt zmian; nie przechowywać w logach całych payloadów wrażliwych.
- **Spójność:** współbieżne zapisy odpowiedzi/zatwierdzeń wymagają transakcji, kontroli wersji/konfliktu i idempotencji wyzwalaczy. Nie utożsamiać statusów formularza z istniejącymi statusami taska.
- **Zakres MVP:** brak potrzeby wprowadzania BPMN, pełnego workflow engine ani wykonywania kodu. Złożoność i migracje powinny wynikać z uzgodnionych przypadków użycia.

## 6. Rekomendacje dla etapu 2

1. Uzgodnić słownik typów pól, statusów instancji, zdarzeń, odbiorców oraz relację do kontekstu (kontrakt/podsystem/task/obiekt) przed schematem bazy.
2. Zaprojektować wersję jako niezmienny snapshot z jawnym publish/unpublish; odpowiedź zawsze wiązać z wersją, a zmiany wykonywać jako nową wersję.
3. Zacząć od wąskiego przepływu: tworzenie/publikacja szablonu → deterministyczne utworzenie przypisanej instancji → zapis/walidacja wartości → zatwierdzenie/audyt. Bez ogólnego procesora workflow.
4. Zachować istniejące wzorce routes/controllers/services/DTO i middleware RBAC. Dodać osobne uprawnienia administracyjne do szablonów i operacyjne do instancji/zatwierdzeń oraz sprawdzać dostęp do konkretnego rekordu.
5. Oprzeć pierwszą walidację serwerową na obecnym `class-validator`; decyzję o zod / wspólnym schemacie frontend-backend podjąć świadomie przed dodaniem zależności. Reguły dynamiczne mają być deklaratywne i ograniczone.
6. W React zbudować renderer na podstawie stabilnych definicji typowanych komponentów; admin/editor może wykorzystywać `@dnd-kit`. Używać motywowych zmiennych CSS dla obu motywów.
7. Przygotować datowaną migrację TypeORM albo SQL zgodnie z wybranym mechanizmem i napisać testy encji/usług, walidacji publikacji, RBAC scope, snapshotów wersji, załączników oraz reguł `PRECONFIGURATION`/`ASSEMBLY`/`FIELD INSTALLATION`.

## Źródła konfiguracyjne

- Pakiety i skrypty: `backend/package.json`, `frontend/package.json` oraz odpowiadające im `package-lock.json`.
- Testy i coverage: `backend/jest.config.js`, `frontend/vitest.config.ts`.
- Konwencje migracji: `backend/src/config/database.ts`, `backend/src/migrations/`, `backend/scripts/migrations/`.
- Statusy: `docs/STATUS_DEFINITIONS.md`; motywy: `docs/CSS_THEME_SYSTEM.md`; BOM: `docs/bom/`; zmienne: `docs/refactor/VARIABLE_ENGINE_REFERENCE.md`.
