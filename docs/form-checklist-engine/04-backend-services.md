# Form & Checklist Engine — backend services

**Etap:** 4 dla #689, podrzędny do #685
**Zakres:** usługi domenowe bez kontrolerów, tras HTTP ani zmian schematu.

## Usługi i metody

### `FormTemplateService`

- `createTemplate(input, actorId)` — tworzy wspólny template FORM/CHECKLIST.
- `createDraft(templateId, actorId)` — tworzy pierwszy szkic albo szkic będący kopią ostatniej opublikowanej wersji.
- `updateDraft(versionId, input, actorId)` — zmienia metadane i opcjonalnie zastępuje definicję szkicu.
- `publishVersion(versionId, actorId)` — sprawdza typy, granice liczbowe i warunki, rozwiązuje domyślny branding oraz zapisuje snapshoty przed atomową publikacją.
- `createNextVersion(publishedVersionId, actorId)` — tworzy następną kopię jako szkic, zachowując sekcje, pola, triggery i reguły przypisań.

Szkic przechowuje wybrane `headerId`/`footerId`; kopia opublikowanej wersji zachowuje także jej snapshoty. Publikacja utrwala nazwę, typ, wysokość, układ i ścieżkę pliku. Zmiana lub usunięcie wpisu biblioteki nie modyfikuje opublikowanych snapshotów.

Operacje zmieniające wersję są transakcyjne. Blokada template serializuje przydzielanie numerów wersji; blokada wersji chroni edycję i publikację. Serwis odrzuca edycję niebędącą szkicem. Migracja z etapu 3 zapewnia dodatkowo niemutowalność opublikowanych wersji i definicji na poziomie bazy.

### `FormInstanceService`

- `createInstance(input, actorId)` — tworzy instancję tylko dla opublikowanej wersji wskazanej przez `templateVersionId`; dla `BOM_TABLE` wymaga `taskId`, pobiera `task_materials` jednym zapytaniem i zapisuje pozycje jako snapshot.
- `refreshData(instanceId, actorId, accessGuard?)` — przed `SUBMITTED` odświeża wartości `DATA` w trybie `readonly`, transakcyjnie i z audytem.
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

`DATA` wymaga źródła z katalogu `FORM_DATA_SOURCES`, trybu `readonly`/`prefill` i typu zgodnego z katalogiem. Przy tworzeniu instancji z `taskId` `FormDataSourceResolver` używa `VariableEngineFactory`/`VariableEvaluator` z providerami Task, Contract i User. Współdzielony adapter odczytuje zadanie wraz z przypisaniami, kontraktem, podsystemem, brygadą i metrykami, a wartości są zapisywane w `form_field_values` jako typowany snapshot. Brak danych oznacza `null`; wartości `readonly` są chronione przed zmianą w API, a odświeżenie aktualizuje tylko te wartości. W formularzu dostępne są wiarygodne źródła zadania, podstawowe pola kontraktu i przypisanej osoby; dane finansowe i NIP nie są udostępniane jako źródła formularzy, ponieważ model kontraktu nie gwarantuje tych pól.

`BOM_TABLE` przechowuje listę pozycji `task_materials` ze stabilnym `bomItemId`, nazwą, jednostką i ilością planowaną oraz polami wykonania. API pobiera wszystkie pozycje zadania jednym zapytaniem, opcjonalny filtr stosuje do kategorii. Przy zapisie i zakończeniu sprawdza typ i reguły ilości; przy zapisie dodatkowo porównuje każdy element z zapisanym snapshotem i blokuje dodawanie/usuwanie pozycji oraz zmianę pól źródłowych. Ostrzeżenie o częściowym montażu jest informacyjne. Pole nie zapisuje do `task_warehouse_stock`, nie aktualizuje stanów magazynowych i nie zmienia statusu urządzeń.

### Biblioteka brandingu

Migracje `20261031_create_form_header_footers.ts` i `20261031_create_form_audit_logs.ts` tworzą bibliotekę/snapshoty oraz brakującą na świeżych instalacjach tabelę audytu. Druga jest idempotentna i zgodna z historycznym skryptem SQL audytu; rollback zachowuje wspólną historię bezpieczeństwa i formularzy. `db:verify-setup` sprawdza również dostępność tabeli audytu i kolumn snapshotów.

`FormHeaderFooterService` zarządza elementami `HEADER` i `FOOTER`. Pliki są sprawdzane na podstawie sygnatury i dekodowane przez Sharp/PDF-lib; limit wynosi 5 MB. Własny układ dopuszcza trzy kolumny, tekst, logo, źródła z `FORM_DATA_SOURCES`, numer strony i datę wydruku. Ścieżki logo muszą wskazywać plik w katalogu brandingu. Pliki nie są usuwane przy edycji ani soft-delete, ponieważ opublikowane wersje mogą nadal ich używać; automatyczne sprzątanie nie jest częścią C1.

### Eksport PDF (C2)

`FormInstancePdfService.generate(instanceId, accessGuard?)` generuje A4 przez `pdf-lib` i `@pdf-lib/fontkit`. Osadza regularny i pogrubiony Noto Sans z `src/assets/fonts` (licencja OFL dołączona); build kopiuje fonty i weryfikuje obecność zasobów. Eksport używa zapisanych odpowiedzi, respektuje widoczność sekcji/pól, łamie długie teksty i wiersze BOM między stronami oraz powtarza nagłówki tabel. `FAIL` jest pogrubione i czerwone.

Branding korzysta z historycznych snapshotów wersji. PDF papieru firmowego używa pierwszej strony, przyciętej do górnego/dolnego pasa; obrazy i logo są skalowane. Układ trzech kolumn jest dopasowany do dostępnej wysokości. Zmienne brandingu są obliczane przez Variable Engine dla kontekstu instancji, także gdy nie istnieje odpowiadające pole DATA. Numeracja `Strona X z Y` jest nanoszona po ustaleniu liczby stron. Na końcu widnieje ostatnia decyzja akceptacji (osoba, data, decyzja, komentarz); każda strona niezatwierdzonej instancji ma `PROJEKT`.

Warunki są ograniczonymi rekordami danych, bez skryptów:

```json
{
  "visibleWhen": { "field": "hasSerial", "operator": "equals", "value": true },
  "requiredWhen": { "field": "hasSerial", "operator": "equals", "value": true },
  "blockCompletionWhen": { "field": "inspection", "operator": "equals", "value": "FAIL" }
}
```

Dozwolone operatory: `equals`, `notEquals`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `isEmpty`, `isNotEmpty`. Warunki odwołują się do stabilnego klucza pola tej samej wersji. Sekcja obsługuje wyłącznie `visibleWhen`; reguły required i block-completion należą do pól. Nie ma `eval()`, `Function()`, rekurencyjnego DSL ani wykonywania wartości JSON. Automatyczna integracja triggerów pozostaje zakresem etapu 8.

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
