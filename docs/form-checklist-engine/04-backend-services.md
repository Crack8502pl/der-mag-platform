# Form & Checklist Engine — backend services

**Etap:** 4 dla #689, podrzędny do #685  
**Zakres:** usługi domenowe bez kontrolerów, tras HTTP ani zmian schematu.

## Usługi i metody

### `FormTemplateService`

- `createTemplate(input, actorId)` — tworzy wspólny template FORM/CHECKLIST.
- `createDraft(templateId, actorId)` — tworzy pierwszy szkic albo szkic będący kopią ostatniej opublikowanej wersji.
- `updateDraft(versionId, input, actorId)` — zmienia metadane i opcjonalnie zastępuje definicję szkicu.
- `publishVersion(versionId, actorId)` — sprawdza typy, granice liczbowe i warunki przed atomową publikacją.
- `createNextVersion(publishedVersionId, actorId)` — tworzy następną kopię jako szkic, zachowując sekcje, pola, triggery i reguły przypisań.

Operacje zmieniające wersję są transakcyjne. Blokada template serializuje przydzielanie numerów wersji; blokada wersji chroni edycję i publikację. Serwis odrzuca edycję niebędącą szkicem. Migracja z etapu 3 zapewnia dodatkowo niemutowalność opublikowanych wersji i definicji na poziomie bazy.

### `FormInstanceService`

- `createInstance(input, actorId)` — tworzy instancję tylko dla opublikowanej wersji wskazanej przez `templateVersionId`.
- `saveResponses(instanceId, responses, actorId)` — waliduje odpowiedzi według pól zapisanych dla przypiętej wersji i atomowo zapisuje zmiany.
- `validateResponses(instanceId)` — zwraca błędy wymagane do poprawienia przed zakończeniem.
- `complete(instanceId, actorId)` — ponownie waliduje zapisane odpowiedzi i zmienia status na `SUBMITTED`.

Nie przyjmuje definicji ani reguł od klienta. Walidacja i zapis używają `templateVersionId` instancji, także gdy powstała już nowsza wersja template. Obecna implementacja nie wykonuje operacji na urządzeniu i nie tworzy `installedIn`.

### `FormApprovalService`

- `approve(instanceId, actorId, comment?)` — zatwierdza przesłaną instancję.
- `reject(instanceId, actorId, comment)` — odrzuca przesłaną instancję; komentarz po `trim()` musi być niepusty.

Decyzje są dopisywane do `form_approvals`; ponowna edycja odrzuconej instancji rozpoczyna kolejny numer rundy. Zatwierdzenie formularza nie zmienia statusu Task.

## Walidacja i warunki

Odpowiedzi są sprawdzane według zapisanych definicji: `TEXT`, `STRING`, `TEXTAREA`, `EMAIL`, `DATE`, `SELECT` i `RADIO` oczekują stringa; `NUMBER` oczekuje skończonej liczby i obsługuje `validation.min` / `validation.max`; `PASS_FAIL` przyjmuje `PASS` lub `FAIL`; `CHECKBOX` oczekuje boolean, a `MULTI_SELECT` listy stringów. `required` oraz `requiredWhen` są egzekwowane przy zakończeniu; `FAIL` blokuje zakończenie. Odpowiedź nieznanego pola lub wartość złego typu jest odrzucana także przy zapisie szkicu. Ukryte pola nie są wymagane, ale ich przesłane wartości nadal przechodzą kontrolę typu.

Warunki są ograniczonymi rekordami danych, bez skryptów:

```json
{
  "visibleWhen": { "field": "hasSerial", "operator": "equals", "value": true },
  "requiredWhen": { "field": "hasSerial", "operator": "equals", "value": true },
  "blockCompletionWhen": { "field": "inspection", "operator": "equals", "value": "FAIL" }
}
```

Dozwolone operatory: `equals`, `notEquals`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `isEmpty`, `isNotEmpty`. Warunki odwołują się do stabilnego klucza pola tej samej wersji. Sekcja obsługuje wyłącznie `visibleWhen`; reguły required i block-completion należą do pól. Nie ma `eval()`, `Function()`, rekurencyjnego DSL ani wykonywania wartości JSON. Ewaluator Variable Engine i pełna integracja triggerów pozostają zakresem etapu 8.

## Audyt, auth i transakcje

Zmiany są audytowane przez istniejącą tabelę `audit_logs`, używając parametryzowanych zapytań w tej samej transakcji co zapis domenowy. Szczegóły zawierają identyfikator celu, aktora (`user_id`), nazwę operacji oraz poprzednie i nowe wartości. Aktualizacje odpowiedzi zapisują jeden zbiorczy wpis audytowy, zamiast zapytania per pole.

Warstwa HTTP nie jest częścią tego etapu. Serwisy przyjmują `actorId`; przyszłe kontrolery muszą przekazać uwierzytelnionego użytkownika oraz użyć istniejących `authenticate` / `requirePermission` i kontroli zakresu dostępu do instancji. Nie dodano alternatywnego auth ani RBAC. Reguła PRECONFIGURATION ≠ ASSEMBLY nie jest realizowana przez ten lifecycle: żaden serwis nie zapisuje relacji fizycznego montażu.

## Błędy domenowe

`FormDomainError` udostępnia typowane kody, m.in. `VERSION_NOT_DRAFT`, `VERSION_NOT_PUBLISHED`, `DRAFT_ALREADY_EXISTS`, `INVALID_DEFINITION`, `INVALID_RESPONSES`, `INVALID_INSTANCE_STATUS` i `REJECTION_COMMENT_REQUIRED`. Mapowanie tych błędów na statusy HTTP należy do etapu 5.

## Testy i ryzyka

Testy jednostkowe: `backend/tests/unit/services/FormEngineServices.test.ts`. Pokrywają publikację i niemutowalność, tworzenie/kopiowanie wersji, przypięcie instancji, wymagane pola, granice NUMBER, typy odpowiedzi, PASS/FAIL, warunki widoczności i required, audyt oraz approve/reject. Ostatni pomiar dla nowego kodu: **95,1% instrukcji/linii, 83,61% gałęzi i 100% funkcji**.

Istotne ryzyka / dalsze kroki:

- Dostęp do usług poza HTTP nie jest sam w sobie granicą RBAC; kontrolery muszą egzekwować istniejące uprawnienia i zakres rekordu.
- Operacje audytowe wymagają dostępnej tabeli `audit_logs` oraz poprawnego identyfikatora użytkownika.
- Schemat warunków jest minimalny i tylko polowy; pełne zmienne kontekstowe, reguły triggerów i reguły przypisań runtime są poza zakresem tego etapu.
- Obsługa załączników, workflow Task oraz automatyczne tworzenie instancji przez triggery wymagają dalszej integracji.

Nie dodano migracji ani zależności.
