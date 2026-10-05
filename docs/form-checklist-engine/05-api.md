# Form & Checklist Engine — REST API

**Etap:** 5 dla #690, podrzędny do #685.
**Zależności:** model etapu 3 opisany w [architekturze](02-architecture-proposal.md#14-model-wdrożony-w-etapie-3-688) i [serwisy etapu 4](04-backend-services.md).

API jest wspólne dla `FORM` i `CHECKLIST`. Nie dodaje UI, buildera, migracji, nowego mechanizmu auth ani osobnego workflow.

## Autoryzacja i zakres dostępu

Wszystkie trasy pod `/api/forms` używają istniejącego `authenticate`, `checkPermission('forms', action)` oraz walidacji runtime. Aktor pochodzi wyłącznie z `req.userId`, nigdy z payloadu.

Moduł `forms` w istniejącym `Role.permissions` zawiera boolean:

| Uprawnienie | Znaczenie |
|---|---|
| `read` | Odczyt szablonów, wersji i dostępnych instancji. |
| `create` | Tworzenie szablonów, szkiców i instancji. |
| `update` | Edycja szkicu i odpowiedzi dostępnej instancji. |
| `publish` | Publikacja wersji. |
| `complete` | Zakończenie dostępnej instancji. |
| `approve` | Zatwierdzanie i odrzucanie przesłanych instancji. |
| `assign` | Zarządzanie regułami i wykonawcami instancji oraz tworzenie instancji z kontekstem domenowym lub dla innych wykonawców. |
| `readAll` | Rozszerzenie zakresu dostępu do wszystkich instancji; nie zastępuje uprawnienia do akcji. |

`permissions.all === true` zachowuje dotychczasowe znaczenie administracyjne. Brak modułu/akcji oznacza odmowę. Nie nadano nowych uprawnień istniejącym rolom automatycznie: administrator musi świadomie skonfigurować `forms` przez istniejące zarządzanie rolami.

Lista instancji, szczegóły, wartości, zapis i ukończenie są ograniczone do autora, przypisanego użytkownika lub aktualnego, aktywnego członka przypisanej brygady, chyba że użytkownik ma `readAll`/`all`. Sprawdzane są daty ważności członkostwa. Samo posiadanie `update` lub `complete` nie umożliwia pracy na cudzej instancji. Niedostępna instancja zwraca `404`, aby nie ujawniać istnienia rekordu. `approve` jest jawnym uprawnieniem do decyzji, a `assign` do zmiany wykonawców instancji niezależnie od przypisania.

Przy zapisie odpowiedzi i `complete` kontroler przekazuje `FormInstanceAccessGuard`. Serwis wykonuje tę kontrolę po `lockInstance`, używając tego samego managera transakcji. Równoległe odebranie przypisania nie pozwala więc zapisać danych na podstawie nieaktualnego sprawdzenia sprzed blokady. Dotychczasowi wewnętrzni wywołujący serwisy zachowują zgodność (guard jest opcjonalny); poza HTTP muszą sami zapewnić autoryzację.

Użytkownik z samym `create` może utworzyć samodzielną instancję dla siebie. Powiązanie z Contract/Task/Device/BOM/Asset lub przypisanie innemu użytkownikowi/brygadzie wymaga dodatkowo `assign`/`all`. Referencje nie są rozwijane do danych użytkowników, kontraktów ani urządzeń. Nie należy nadawać `assign` użytkownikom bez uprawnień do zarządzania takim kontekstem.

## Endpointy

Ścieżki poniżej są względne wobec `/api/forms`. Identyfikatory są dodatnimi liczbami całkowitymi w zakresie PostgreSQL `integer` (maksymalnie `2147483647`). Listy przyjmują wyłącznie `page` (1–1000000, domyślnie 1) i `limit` (1–100, domyślnie 20). Nie ma dodatkowych filtrów. Nieznane query params, błędne identyfikatory i przekroczone limity zwracają `400`.

| Metoda | Ścieżka | Uprawnienie | Operacja |
|---|---|---|---|
| GET | `/templates` | `read` | Stronicowana lista szablonów. |
| POST | `/templates` | `create` | Utworzenie szablonu (`201`). |
| GET | `/templates/:id` | `read` | Szczegóły szablonu. |
| GET | `/templates/:id/versions` | `read` | Lista jego wersji. |
| POST | `/templates/:id/draft` | `create` | Pierwszy szkic albo kopia ostatniej opublikowanej wersji (`201`). |
| GET | `/versions/:id` | `read` | Zapisana wersja wraz z definicją. |
| PUT | `/versions/:id/draft` | `update` | Edycja wyłącznie `DRAFT`. |
| POST | `/versions/:id/publish` | `publish` | Walidacja i publikacja zapisanej definicji. |
| POST | `/versions/:id/next` | `create` | Nowy szkic z podanej opublikowanej wersji (`201`). |
| GET | `/versions/:id/assignment-rules` | `read` | Reguły przypisań tej wersji. |
| PUT | `/versions/:id/assignment-rules` | `assign` | Atomowe zastąpienie reguł wyłącznie w `DRAFT`. |
| GET | `/instances` | `read` | Stronicowana lista w dozwolonym zakresie. |
| POST | `/instances` | `create` | Instancja przypięta do opublikowanej wersji (`201`). |
| GET | `/instances/:id` | `read` | Szczegóły dostępnej instancji. |
| GET | `/instances/:id/values` | `read` | Zapisane wartości dostępnej instancji. |
| PUT | `/instances/:id/values` | `update` | Częściowy zapis odpowiedzi według stabilnych kluczy pól. |
| PUT | `/instances/:id/assignment` | `assign` | Zmiana wykonawcy instancji w stanie edytowalnym. |
| POST | `/instances/:id/complete` | `complete` | Walidacja zapisanych odpowiedzi i przejście do `SUBMITTED`. |
| POST | `/instances/:id/approve` | `approve` | Decyzja `APPROVED`. |
| POST | `/instances/:id/reject` | `approve` | Decyzja `REJECTED`; komentarz obowiązkowy. |

## Payloady i walidacja

DTO korzystają z istniejących `class-validator`, `class-transformer` i middleware walidacji. Nieznane pola payloadu są odrzucane, także w sekcjach/polach szkicu. Nie można ustawiać `id`, `status`, `createdById`, `publishedAt`, numeru wersji ani danych audytu.

Osłona `validateFormBody` sprawdza surowy JSON przed istniejącym `validate`: odrzuca zarezerwowane klucze prototypu (`constructor`, `__proto__`, `toString` itd. oraz `prototype`) i zagnieżdżenie obiektów głębsze niż 50 poziomów. Te nazwy nie mogą być kluczami sekcji/pól; zapis szkicu i publikacja również egzekwują tę regułę. Dzięki temu transformer nie usuwa odpowiedzi po cichu ani nie pozostawia żądania bez obsłużonej odpowiedzi. Zwykłe tekstowe wartości zawierające te słowa są dozwolone.

### Szablon

```json
{
  "key": "DEVICE_VERIFICATION",
  "name": "Weryfikacja urządzenia",
  "kind": "CHECKLIST",
  "procedureType": "DEVICE_PRECONFIGURATION",
  "description": "Kontrola przed wysyłką"
}
```

Wymagane: `key`, `name`, `procedureType`. Opcjonalne: `description`, `kind` (domyślnie `FORM`). Procedury: `CABINET_PREFABRICATION`, `DEVICE_PRECONFIGURATION`, `FIELD_INSTALLATION`.

### Edycja szkicu

```json
{
  "title": "Kontrola urządzenia",
  "settings": {},
  "sections": [
    {
      "key": "verification",
      "title": "Weryfikacja",
      "fields": [
        {
          "key": "inspection",
          "label": "Wynik testu",
          "fieldType": "PASS_FAIL",
          "required": true
        }
      ]
    }
  ]
}
```

Metadane `title`, `description`, `settings`, `sections` są opcjonalne. Podanie `sections` zastępuje całą definicję sekcji i pól; pominięcie zachowuje ją. Sekcja wymaga `key`, `title`, `fields`; pole wymaga `key`, `label`, `fieldType`. Opcjonalne pola sekcji: `description`, `sortOrder`, `conditions`. Opcjonalne pola definicji: `required`, `sortOrder`, `validation`, `options`, `conditions`. DTO dopuszczają maksymalnie 100 sekcji i 500 pól w sekcji; typy pól podaje się wielkimi literami. Znaczenie typów i warunków opisują [serwisy](04-backend-services.md#walidacja-i-warunki).

Odczyt `/versions/:id` zwraca metadane wersji oraz osobne tablice `sections`, `fields`, `triggers`, `assignmentRules`; pola wiążą się z sekcjami przez `sectionId`. Szczegóły instancji zwracają jej zapisane metadane z `templateVersionId`; definicję pobiera się przez endpoint wersji, a wartości przez endpoint `values`.

`draft`, `publish`, `next` i `complete` nie przyjmują definicji ani odpowiedzi w payloadzie. Publikacja ponownie sprawdza dane zapisane w bazie. Nie ma operacji cofnięcia opublikowanej wersji do szkicu; poprawki wymagają nowej wersji.

### Instancja i odpowiedzi

```json
{ "templateVersionId": 12 }
```

Opcjonalne referencje instancji: `contractId`, `taskId`, `subsystemTaskId`, `objectId`, `deviceId`, `bomItemId`, `workflowBomItemId`, `assignedUserId`, `assignedTeamId`. `bomItemId` i `workflowBomItemId` nie mogą być podane jednocześnie. Powiązania i przypisanie innym wykonawcom wymagają `assign`.

```json
{ "responses": { "inspection": "PASS" } }
```

`PUT /instances/:id/values` aktualizuje tylko podane klucze. Typy, wymagane pola, zakresy liczbowe i warunki zawsze wynikają z wersji przypiętej do instancji. Payload zawierający `definition`, `sections`, inną wersję lub status zostanie odrzucony. Publikacja nowszej wersji nie zmienia walidacji historycznej instancji.

Zapis dopuszcza niekompletne odpowiedzi, lecz odrzuca nieznane klucze i błędne typy. `complete` odczytuje zapisane wartości i wymaga spełnienia pełnej walidacji; `FAIL` blokuje ukończenie. Dozwolone przejścia pozostają własnością serwisów:

`DRAFT → IN_PROGRESS → SUBMITTED → APPROVED / REJECTED`

Odrzuconą instancję można poprawić i zgłosić ponownie. Każda kolejna decyzja pozostaje w historii zatwierdzeń.

### Decyzja

```json
{ "comment": "Należy powtórzyć test łączności" }
```

Przy `approve` komentarz jest opcjonalny; przy `reject` wymagany i niepusty po `trim()`. Akceptacja nie ustawia statusu Task ani nie tworzy relacji fizycznego montażu urządzenia.

### Reguły przypisań

Wykonawców istniejącej instancji zmienia `PUT /instances/:id/assignment`:

```json
{ "assignedUserId": 7, "assignedTeamId": null }
```

Trzeba podać co najmniej jedną właściwość. Pominięcie celu zachowuje jego poprzednią wartość; `null` czyści wskazany cel. Wynik musi zachować co najmniej jednego wykonawcę. `{}` i usunięcie wszystkich celów zwracają `400 INVALID_ASSIGNMENT`. Zmiana jest transakcyjna i audytowana; nie zmienia wersji ani kontekstu instancji. Dozwolone statusy: `DRAFT`, `IN_PROGRESS`, `REJECTED`.

Reguły wersji konfiguruje `PUT /versions/:id/assignment-rules`:

```json
{
  "rules": [
    {
      "assignedUserId": 7,
      "triggerId": null,
      "priority": 0,
      "active": true,
      "conditions": {}
    }
  ]
}
```

Wymagany co najmniej jeden cel: `assignedUserId` lub `assignedTeamId`; maksymalnie 500 reguł. Opcjonalny `triggerId` musi wskazywać trigger tej samej wersji (może być `null`). `conditions` obsługują jedynie istniejący podzbiór `visibleWhen`, `requiredWhen`, `blockCompletionWhen` z referencjami do zapisanych kluczy pól. Publikacja ponownie weryfikuje te referencje, także po zmianie pól szkicu. `rules: []` usuwa reguły szkicu. Zastąpienie odbywa się pod blokadą wersji, z walidacją i audytem w jednej transakcji. Nie można zmienić reguł wersji opublikowanej. Endpoint konfiguruje deklaratywne dane; automatyczna ewaluacja i wykonywanie przypisań przez zdarzenia pozostają etapem 8.

## Odpowiedzi i błędy

Sukces: `{ "success": true, "message": "OK", "data": ... }`. Tworzenie zwraca `201`, pozostałe operacje `200`. Listy mają `data: { "items": [...], "total": ..., "page": ..., "limit": ... }`.

Błąd walidacji DTO: `400` z `{ "success": false, "message": "...", "errors": [...] }`.

Błąd domenowy: `{ "success": false, "message": "...", "code": "...", "details": ... }` (szczegóły tylko jeśli istnieją).

| HTTP | Kody / przypadki |
|---|---|
| 400 | `INVALID_DEFINITION`, `INVALID_RESPONSES`, `INVALID_ASSIGNMENT`, `INVALID_INSTANCE_CONTEXT` (obie referencje BOM), `REJECTION_COMMENT_REQUIRED`, nieprawidłowy payload/ID/query. |
| 401 | Brak tokenu, token nieważny/wygasły albo nieaktywny użytkownik. |
| 403 | Brak uprawnienia do akcji/przypisania kontekstu. |
| 404 | `TEMPLATE_NOT_FOUND`, `VERSION_NOT_FOUND`, `INSTANCE_NOT_FOUND` (również poza zakresem dostępu). |
| 409 | `VERSION_NOT_DRAFT`, `VERSION_NOT_PUBLISHED`, `DRAFT_ALREADY_EXISTS`, `INVALID_INSTANCE_STATUS`; konflikt unikalności/FK. |
| 500 | Nieoczekiwany błąd, obsługiwany przez istniejący centralny error handler. |

Błędy TypeORM/PostgreSQL trafiają do istniejącego sanitizatora; API nie zwraca SQL, parametrów zapytania ani wewnętrznych szczegółów bazy.

## Warstwy i zależności

- `backend/src/routes/forms.routes.ts` jest rejestrowany w istniejącym `backend/src/routes/index.ts`; lokalny walidator `inputs` sprawdza ID, query i obiektowy kształt body.
- `backend/src/controllers/FormsController.ts` mapuje request/response i egzekwuje zakres dostępu; nie implementuje cyklu życia formularza. Wspólny `scopeFormInstances` ogranicza zapytania list i pojedynczych rekordów.
- `backend/src/dto/FormsDto.ts`: `CreateTemplateDto`, `DraftSectionBody`, `DraftFieldBody`, `UpdateDraftDto`, `CreateInstanceDto`, `ResponsesDto`, `EmptyFormActionDto`, `ApprovalDto`, `RejectionDto`, `AssignmentRuleDto`, `AssignmentRulesDto`, `InstanceAssignmentDto`.
- Walidatory: `backend/src/middleware/formsValidation.ts` (`validateFormBody`, osłona istniejącego `validate`), `backend/src/utils/formJson.ts` (`hasUnsafeFormJson`, `RESERVED_FORM_KEYS`), dekoratory DTO i domenowe funkcje `FormRules`; `FormsPermissions` rozszerza typ istniejącego `Role.permissions`.
- `FormTemplateService`: `createTemplate`, `createDraft`, `updateDraft`, `publishVersion`, `createNextVersion` oraz transakcyjne zastąpienie reguł przypisań.
- `FormInstanceService`: `createInstance`, `saveResponses`, `validateResponses`, `complete`, `assignInstance`.
- `FormApprovalService`: `approve`, `reject`.
- `FormAuditService`: dotychczasowy audyt w `audit_logs`, w transakcji operacji.
- Odczyty korzystają z istniejących encji i zbiorczych zapytań, bez eager/lazy loading danych użytkowników i bez N+1 po polach.

## Testy i ograniczenia wdrożeniowe

Testy API w `backend/tests/integration/forms-api.test.ts` obejmują rzeczywiste middleware auth/RBAC, walidację HTTP, zakres rekordu, delegowanie cyklu życia i mapowanie błędów przy mockowanych repozytoriach/serwisach. Testy reguł: `backend/tests/unit/services/FormAssignmentRules.test.ts`; testy zmian wykonawców: `backend/tests/unit/services/FormInstanceAssignments.test.ts`; testy osłony JSON: `backend/tests/unit/middleware/formsValidation.test.ts`. Testy domenowe etapu 4 w `backend/tests/unit/services/FormEngineServices.test.ts` nadal weryfikują walidację względem zapisanej wersji, atomowość, statusy i audyt.

Polecenia z katalogu `backend`:

```bash
npm run build
npm test -- --runInBand tests/integration/forms-api.test.ts tests/unit/services/FormAssignmentRules.test.ts tests/unit/services/FormInstanceAssignments.test.ts tests/unit/middleware/formsValidation.test.ts tests/unit/services/FormEngineServices.test.ts
npm test -- --runInBand
```

Pokrycie nowego kontrolera, routera i DTO należy mierzyć jawnie przez `--collectCoverageFrom`; domyślna konfiguracja Jest wyklucza DTO.

Weryfikacja implementacji: build przeszedł, 276 testów ukierunkowanych przeszło; pomiar objął nowy kontroler, router, DTO, osłonę JSON i zmienione serwisy — **97,27% linii i 93,60% gałęzi**. Pełny backend: **127 zestawów, 2043 testy i 13 snapshotów przeszły**, 4 zestawy/29 testów pominięto, bez błędów (exit 0). Jest zgłosił ostrzeżenie o asynchronicznych uchwytach po zakończeniu pełnego zestawu.

Ryzyka i możliwe błędy:

- Brak skonfigurowanego `forms` dla roli oznacza `403`; nie należy rozwiązywać tego przez pomijanie RBAC ani szerokie nadanie `all`.
- `assign`, `approve` i `readAll` są uprawnieniami uprzywilejowanymi, wymagającymi świadomego nadania.
- API wymaga wcześniej zastosowanej migracji TypeORM etapu 3 oraz istniejącej tabeli `audit_logs`; ten etap nie zmienia schematu.
- Pełna spójność domenowa kombinacji Contract/Task/Device/BOM wymaga późniejszej integracji; FK i dodatkowe `assign` nie zastępują takiej integracji.
- Automatyczne triggery/przypisania, Variable Engine, upload/ACL załączników i zmiana statusów urządzeń/zadań nie są wdrażane w etapie 5.
- Zakres walidacji pól pozostaje zgodny z etapem 4: m.in. `EMAIL`/`DATE` sprawdzają typ string, a `SELECT`/`MULTI_SELECT` nie egzekwują jeszcze listy opcji. API nie dubluje ani nie rozszerza tych reguł domenowych.
- PRECONFIGURATION ≠ ASSEMBLY: referencja `objectId` jest kontekstem, nie potwierdzeniem montażu; żaden endpoint nie zapisuje `installedIn`.
- Istniejący workflow `npm audit (HIGH+)` zgłasza podatności zależności niezwiązane z tym API; nie dodano nowych zależności.
