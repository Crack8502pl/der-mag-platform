# Instrukcja obsługi mechaniki formularzy i konfiguracji BOM

## Cel dokumentu

Ten dokument opisuje:
- jak działa mechanika formularzy,
- za co odpowiadają pola w modelu danych,
- jakie dane można wpisywać,
- jak skonfigurować formularz pod BOM z checkboxem `zainstalowane`,
- możliwe błędy i dobre praktyki.

---

## 1. Jak działa mechanika formularzy (skrót)

Formularz jest wersjonowany i składa się z warstw:

1. **Szablon** (`form_templates`) — kontener biznesowy (stały klucz, nazwa, procedura).
2. **Wersja szablonu** (`form_template_versions`) — konkretna wersja treści (np. v1, v2).
3. **Sekcje** (`form_sections`) — grupy pól.
4. **Pola** (`form_field_definitions`) — definicje wejść (typ, wymagane, walidacje, kolejność).
5. **Instancja formularza** (`form_instances`) — pojedyncze wypełnienie formularza.
6. **Wartości pól** (`form_field_values`) — wpisane odpowiedzi (JSONB).
7. **Akceptacje** (`form_approvals`) — kroki zatwierdzeń.

---

## 2. Opis pól: za co odpowiadają i co wpisywać

## A) Szablon formularza (`form_templates`)

- **`key`** (unikalny, np. `PREFAB_CHECKLIST_001`)  
  Stały identyfikator techniczny.
  - Rekomendacja: `UPPER_SNAKE_CASE`, bez spacji.
- **`name`** (np. `Checklista prefabrykacji szafy`)  
  Nazwa widoczna dla użytkowników.
- **`description`**  
  Opis celu formularza.
- **`kind`**  
  Typ formularza: `FORM` albo `CHECKLIST`.
- **`procedure_type`**  
  Dozwolone wartości:
  - `CABINET_PREFABRICATION`
  - `DEVICE_PRECONFIGURATION`
  - `FIELD_INSTALLATION`
- **`active`**  
  Czy szablon jest aktywny.

## B) Wersja szablonu (`form_template_versions`)

- **`template_id`** — powiązanie z `form_templates.id`.
- **`version`** — numer wersji (`> 0`).
- **`status`** — `DRAFT` lub `PUBLISHED`.
- **`title`** — tytuł wersji.
- **`description`** — opis zmian.
- **`kind`**, **`procedure_type`** — powinny być spójne z domeną.
- **`settings`** (JSONB) — ustawienia UI/logiki wersji.

**Praktyka:**
- `DRAFT` = edycja,
- `PUBLISHED` = wersja operacyjna.
- `header_id` i `footer_id` wskazują wybrane elementy biblioteki. Publikacja zapisuje także `header_snapshot` i `footer_snapshot`, dzięki czemu późniejsza edycja wpisu nie zmienia już wydanej wersji.

## Biblioteka nagłówków i stopek

W panelu administratora wybierz **Nagłówki i stopki formularzy** (`/admin/forms/branding`). Element ma rodzaj nagłówka albo stopki i jeden z trybów:

- **Plik** — obraz PNG/JPG lub PDF o maksymalnym rozmiarze 5 MB. Serwer sprawdza rzeczywisty typ pliku i jego poprawność; nazwa pliku ani deklarowany MIME nie są źródłem zaufania.
- **Własny układ** — trzy kolumny z tekstem, logo PNG/JPG, zatwierdzonymi zmiennymi systemowymi, numerem strony lub datą wydruku. Źródła zmiennych pochodzą z katalogu `usableInForms`.

Można ustawić po jednym aktywnym domyślnym elemencie dla nagłówka i stopki. W edytorze wersji wybierz konkretny wpis albo pozostaw „Domyślny element”; w tym drugim przypadku aktywny default jest kopiowany do snapshotu przy publikacji. Kopia nowej wersji zachowuje ustawienia źródłowej wersji. Usunięcie wpisu jest miękkie; pliki są zachowywane, aby historyczne wersje nadal działały.

**Możliwe błędy:** format niezgodny z zawartością, uszkodzony PDF/obraz, plik większy niż 5 MB, niezatwierdzone źródło zmiennej, brak istniejącego logo w układzie lub wybór wpisu niewłaściwego rodzaju blokuje zapis/publikację. Użytkownik zarządzający biblioteką potrzebuje `forms.read` oraz `forms.update`; dodanie nowego wpisu dodatkowo wymaga `forms.create`, a publikacja `forms.publish`.

## Pobieranie wypełnionego formularza PDF

W widoku instancji wybierz **Pobierz PDF**. Najpierw zapisz zmienione odpowiedzi: eksport obejmuje dane zapisane na serwerze. Przycisk działa również dla formularza zatwierdzonego/tylko do odczytu; potrzebne jest `forms.read` oraz dostęp do danej instancji.

Dokument A4 automatycznie dzieli treść i tabele BOM na strony. Nagłówek i stopka powtarzają się na każdej stronie; papier firmowy PDF używa wyłącznie pierwszej strony pliku. Polskie znaki obsługuje osadzony Noto Sans. `FAIL` jest pogrubione, a blok akceptacji zawiera ostatnią decyzję, osobę, datę i komentarz. Każdy status inny niż `APPROVED` oznacza znak wodny **PROJEKT**.

**Możliwe błędy:** odebrane uprawnienia lub przypisanie blokują pobieranie; brak historycznego pliku logo/brandingu na wolumenie albo brak fontów po wdrożeniu powoduje błąd generowania, a nie niepełny dokument. Nie usuwaj plików brandingu używanych w snapshotach. Bardzo rozbudowane układy nagłówków/stopek są pomniejszane do wybranej wysokości; zwiększ wysokość, jeśli tekst staje się nieczytelny.

**Stan planu:** B2, B3, C1 i C2 są zaimplementowane; B4 (podgląd szkicu na wybranym zadaniu bez zapisu instancji) pozostaje otwarte.

## C) Sekcja (`form_sections`)

- **`key`** — unikalny klucz sekcji w obrębie wersji.
- **`title`** — nazwa sekcji.
- **`description`** — opis opcjonalny.
- **`sort_order`** — kolejność wyświetlania.
- **`conditions`** (JSONB) — warunki widoczności sekcji.

## D) Pole formularza (`form_field_definitions`)

- **`key`** — unikalny klucz pola w wersji.
- **`label`** — etykieta w UI.
- **`field_type`** — typ pola (identyfikator tekstowy, np. `text`, `number`, `select`, `checkbox`, `date`, `photo`).
- **`required`** — czy pole jest wymagane.
- **`sort_order`** — kolejność pola.
- **`validation`** (JSONB) — reguły walidacji (min/max/regex itp.).
- **`options`** (JSONB) — opcje dla pól wyboru.
- **`conditions`** (JSONB) — warunki dynamicznej widoczności/aktywności.

Typ `DATA` automatycznie pobiera wartość ze źródła systemowego przy tworzeniu instancji:

```json
{
  "source": "task.number",
  "mode": "readonly",
  "valueType": "string"
}
```

W edytorze wybierz grupę (`Zadanie`, `Kontrakt` lub `Użytkownik`), pole i tryb. `readonly` pokazuje wartość wraz ze źródłem, odrzuca modyfikację API i można ją odświeżyć przed wysłaniem formularza. `prefill` wstawia wartość początkową, którą wykonawca może zmienić; późniejsze odświeżanie nie nadpisuje tej edycji. Pole DATA wymaga odpowiedniego kontekstu instancji (`taskId`, `contractId` lub użytkownika). Brak danych jest zapisywany jako `null` i wyświetlany jako „brak danych w zadaniu”. Katalog dopuszcza tylko źródła, dla których model ma wiarygodne mapowanie; np. `contract.customer.name` korzysta z `task.client` lub jawnych metadanych klienta, a nie z nazwy kontraktu.

Typ `BOM_TABLE` zapisuje snapshot pozycji BOM zadania i odpowiedzi instalacyjne w jednej wartości JSON:

```json
{
  "columns": ["plannedQty", "installedQty", "installed", "note"],
  "filter": "Urządzenia"
}
```

Źródłem snapshotu jest `task_materials` (encja `TaskMaterial`), nie `task_warehouse_stock`: tabela wykonawcza nie odczytuje ani nie zmienia rezerwacji i stanów magazynowych. Dla każdej pozycji zapisuje `bomItemId`, nazwę, jednostkę, ilość planowaną, a początkowo `installedQty: null`, `installed: false` i pustą notatkę. Opcjonalny filtr porównuje dokładnie kategorię materiału. Nazwa, jednostka, ID i plan są niemodyfikowalne przez API; odpowiedź nie może usuwać ani dodawać pozycji. `installed = true` wymaga `installedQty > 0`, a ilość ponad plan wymaga notatki. Dodatnia ilość z `installed = false` jest ostrzeżeniem o częściowym montażu, a nie blokadą. Przycisk „Wszystko zgodnie z planem” uzupełnia ilości i zaznacza pozycje, ale nie aktualizuje urządzeń ani magazynu.

## E) Wartość pola (`form_field_values`)

- **`value`** (JSONB) — przechowywana odpowiedź użytkownika.

Przykładowe mapowanie danych względem `field_type`:

- `text`, `textarea` → `string`  
- `number` → `number`  
- `checkbox` → `boolean`  
- `date` → `YYYY-MM-DD`  
- `datetime` → ISO datetime  
- `select` → `string` (klucz opcji)  
- `multiselect` → `string[]`  
- pola złożone → obiekt JSON

Przykład wartości złożonej:

```json
{
  "verified": true,
  "measurements": [12, 13]
}
```

## F) Akceptacje (`form_approvals`)

- **`step_order`** — numer kroku akceptacji.
- **`round`** — numer rundy.
- **`decision`** — decyzja (`APPROVED` / `REJECTED` wg modelu).
- **`decided_by_id`** — użytkownik podejmujący decyzję.

---

## 3. Konfiguracja formularza pod BOM + checkbox „zainstalowane”

## Założenie

Formularz powinien działać w kontekście pozycji BOM:
- `workflow_bom_item_id` **lub**
- `task_generated_bom_item_id`.

## Proponowana sekcja BOM

Dla każdej pozycji BOM w formularzu wyświetlać:
- ilość planowaną,
- ilość rzeczywistą,
- checkbox `zainstalowane`.

Przykładowy zapis wartości (JSONB):

```json
{
  "bomItemId": 123,
  "plannedQty": 4,
  "installedQty": 4,
  "installed": true,
  "note": "zamontowano bez uwag"
}
```

## Rekomendowany zestaw pól

- `bom_item_id` (hidden/read-only)
- `material_name` (read-only)
- `planned_qty` (read-only number)
- `installed_qty` (number)
- `installed` (checkbox)
- `installation_note` (textarea, opcjonalnie)
- `installation_photos` (opcjonalnie)

## Rekomendowane reguły walidacji

- Jeśli `installed = true` → `installed_qty > 0`.
- Jeśli `installed_qty >= planned_qty` → sugestia ustawienia `installed = true`.
- Jeśli `installed = false` i `installed_qty > 0` → warning (częściowy montaż).

## Ważna zasada domenowa

Samo zaznaczenie checkboxa `installed` w formularzu powinno oznaczać **status biznesowy formularza**, a nie automatyczną aktualizację relacji fizycznego montażu urządzeń.  
Aktualizacja stanu urządzeń/BOM powinna następować osobnym, kontrolowanym krokiem (np. workflow po akceptacji).

---

## 4. Dwie opcje implementacyjne BOM

## Opcja A — szybka (MVP)

Jedno pole np. `bom_installation_table` zawierające tablicę JSON.

Przykład:

```json
[
  { "bomItemId": 101, "plannedQty": 2, "installedQty": 2, "installed": true },
  { "bomItemId": 102, "plannedQty": 5, "installedQty": 3, "installed": false }
]
```

**Plusy:** szybkie wdrożenie.  
**Minusy:** trudniejsza walidacja i raportowanie SQL.

## Opcja B — docelowa (enterprise)

Powtarzalna sekcja z osobnymi polami dla każdej pozycji BOM.

**Plusy:** lepsza walidacja, audyt, raporty.  
**Minusy:** więcej logiki po stronie UI/API.

---

## 5. Najczęstsze błędy

1. **Brak tabel formularzy**  
   Objaw: `relacja "form_templates" nie istnieje`.
2. **Niepoprawne `procedure_type` / `kind`**  
   Naruszenie check constraintów.
3. **Duplikaty kluczy (`key`)**  
   Naruszenie unikalności.
4. **Niespójny typ i wartość**  
   Np. `number` i wartość tekstowa.
5. **Mieszanie statusu formularza z fizycznym montażem**  
   Brak rozdzielenia procesu biznesowego i procesu instalacji.
6. **N+1 zapytań** przy dociąganiu BOM.
7. **Race condition** przy równoległej edycji tej samej pozycji.

---

## 6. Dobre praktyki

- Klucze (`key`) trzymaj jako `UPPER_SNAKE_CASE`.
- Daty zapisuj w ISO (`YYYY-MM-DD`, datetime jako ISO-8601).
- Dla `select` trzymaj `options` jako tablicę obiektów:

```json
[
  { "value": "OK", "label": "OK" },
  { "value": "NOK", "label": "Nie OK" }
]
```

- Walidacje zapisuj jawnie (`min`, `max`, `regex`, komunikaty).
- Warunki (`conditions`) trzymaj w spójnym DSL.
- Po publikacji wersji: zamiast edycji twórz nową wersję.

---

## 7. Lista kontrolna przed wdrożeniem

- [ ] Migracje wykonane na właściwej bazie/schemacie.
- [ ] `form_templates` i powiązane tabele istnieją.
- [ ] Endpointy tworzenia/odczytu działają (GET/POST templates).
- [ ] Walidacje `installed` vs `installed_qty` działają.
- [ ] Brak automatycznej zmiany fizycznego montażu tylko od checkboxa.
- [ ] Logowanie i audyt zmian działają.

---

## 8. Dalsze kroki (propozycja)

1. Dodać kontrakt API dla danych BOM w kontekście formularza.
2. Dodać walidator backendowy dla `installed`/`installed_qty`.
3. Dodać testy integracyjne ścieżki BOM + akceptacje.
4. Uzupełnić dokumentację techniczną o przykładowe payloady request/response.
