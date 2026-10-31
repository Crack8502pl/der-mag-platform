# Form & Checklist Engine — Form Builder

**Etap:** 6 dla issue #691, podrzędny do #685.  
**Zależności:** API etapów 4–5, dostępne pod `/api/forms`; schemat etapu 3 musi być wdrożony.

## Zakres

Panel administracyjny dostępny pod `/admin/forms` zapewnia listę szablonów oraz cztery widoki wybranej wersji. Edytor używa polskich, przyjaznych nazw typów pól i warunków; pola `STRING` są ukryte przy wyborze nowych typów, ale pozostają obsługiwane w istniejących definicjach.

- **Edytor** — edycja tytułu, opisu, sekcji i pól wersji roboczej; przeciąganie sekcji i pól, kopiowanie/usuwanie pól, wymagane pola, typy, walidacja liczbowa, jednostki, deklaratywne warunki i opcje list edytowane jako wiersze. Pole „Dane z systemu” wybiera grupę, źródło i tryb `Tylko do odczytu` / `Wartość początkowa (można zmienić)` z katalogu Variable Engine. „Tabela BOM” pozwala wybrać kolumny oraz opcjonalną kategorię materiału. Klucze sekcji i pól są generowane z nazw/etykiet jako unikalne `UPPER_SNAKE_CASE`; ręczna edycja jest dostępna w zwijanej sekcji „Zaawansowane”.
- **Branding wersji** — w szkicu można wybrać nagłówek i stopkę z biblioteki lub pozostawić rozstrzygnięcie aktywnego elementu domyślnego na publikację.
- **Biblioteka brandingu** — edycja własnego układu w trzech kolumnach z podglądem strony A4; papier firmowy PNG/JPG/PDF ma podgląd pasma nagłówka/stopki, a w selektorze wersji pokazuje się miniatura.
- **Wersje** — lista wersji, otwieranie istniejących wersji i tworzenie następnej wersji na podstawie opublikowanej.
- **Podgląd** — od etapu 7 interaktywny [DynamicFormRenderer](07-dynamic-form-renderer.md) zapisanej wersji, z warunkami widoczności; bez zapisu odpowiedzi.
- **Przypisania i reguły** — odczyt i zapis reguł przypisań wyłącznie dla draftów; użytkownicy, brygady i triggery wersji są wybierani z wyszukiwanych list. Warunek przypisania korzysta z tego samego edytora warunków, co pola i sekcje.

Tworzenie nowego formularza wymaga klucza, nazwy, rodzaju `FORM`/`CHECKLIST` i jednej z obsługiwanych procedur. Nie są dodawane przykładowe formularze biznesowe ani zależności od konkretnych procedur poza dozwolonymi wartościami domenowymi.

## Integracja

- `frontend/src/components/admin/FormBuilderPage.tsx` udostępnia panel i edytor.
- `frontend/src/components/admin/FormBrandingLibraryPage.tsx` oraz `/admin/forms/branding` udostępniają CRUD biblioteki, konfigurację trzech kolumn, upload logotypów i wybór wyłącznie źródeł `usableInForms`.
- `frontend/src/components/forms/FormBrandingPreview.tsx` obsługuje podgląd A4 i miniatury, z uwierzytelnionym pobieraniem plików.
- `frontend/src/components/admin/FormBuilderPage.css` korzysta z tokenów motywu i wspiera `grover` oraz `husky`.
- `frontend/src/services/forms.service.ts` typuje wywołania API formularzy, instancji oraz listy wyboru użytkowników i brygad; `variableEngine.service.ts` pobiera katalog źródeł. Triggery są odczytywane z odpowiedzi szczegółów wersji. `frontend/src/hooks/useFormTemplates.ts` pobiera listę i udostępnia odświeżenie.
- `frontend/src/types/forms.types.ts` zawiera minimalne modele UI. `permissions.types.ts`, route `/admin/forms` i karta panelu administratora używają istniejącego modułu uprawnień `forms`.
- `backend/src/controllers/RoleController.ts` wystawia akcje `forms` w istniejącym schemacie macierzy uprawnień, aby administratorzy mogli przydzielać je przez UI RBAC.
- Drag & drop korzysta z istniejącego `@dnd-kit/core`. Nie dodano zależności; brak `@dnd-kit/sortable` nie blokuje sortowania prostym mechanizmem core.
- Uchwyty przeciągania sekcji i pól są nieaktywne dla wersji tylko do odczytu oraz użytkowników bez `forms.update`.

Wykorzystywane endpointy obejmują API szablonów, wersji i reguł przypisań oraz `GET/POST/PUT/DELETE /forms/branding`, upload/odczyt logotypów i `GET /variable-engine/variables`. API pozostaje źródłem prawdy dla walidacji, publikacji, audytu i niemutowalności wersji. Builder nie modyfikuje danych bezpośrednio i nie implementuje runtime reguł.

Role potrzebują `forms.read` do otwarcia panelu; akcje są prezentowane zależnie od `forms.create`, `forms.update`, `forms.publish` oraz `forms.assign`. Backend nadal egzekwuje to samo RBAC dla każdego endpointu. Brak skonfigurowanych uprawnień skutkuje odmową dostępu — nie jest automatycznie zmieniana konfiguracja ról.

## Ograniczenia i ryzyka

- Warunki są edytowane jako ograniczone deklaratywne dane pól/sekcji/reguł przypisań, z kontrolkami wartości dopasowanymi do typu wskazanego pola. Sekcje obsługują tylko `visibleWhen`; pola: `visibleWhen`, `requiredWhen`, `blockCompletionWhen`; reguły przypisań: `when`. Publikacja ponownie waliduje referencje i operatory według API.
- `options.values` przechowuje wybrane opcje, a `options.unit` jednostkę prezentacyjną. `DATA` zapisuje źródło, tryb i typ zwracanej wartości; źródła są filtrowane przez `usableInForms` z katalogu API.
- Biblioteka przyjmuje pliki PNG/JPG/PDF do 5 MB (logo: PNG/JPG); treść jest sprawdzana po sygnaturze i dekodowana. Opublikowana wersja ma własny snapshot metadanych i ścieżkę pliku, więc późniejsza edycja/soft-delete nie zmienia renderowania. Pliki są zachowywane, co wymaga osobnego, bezpiecznego procesu retencji w przyszłości.
- Podgląd używa zapisanej wersji: niezapisane edycje nie są widoczne. Podgląd na wybranym zadaniu pozostaje późniejszym etapem.
- Reguły przypisań są konfigurowane, ale nie wykonywane automatycznie (etap 8). Wymagane cele i zgodność triggera z wersją są ostatecznie walidowane przez API.
- Pobieranie list użytkowników i brygad wymaga odpowiednio `users.read` i `brigades.read`; błędy są pokazywane obok selektorów. Lista użytkowników jest filtrowana przez istniejący parametr wyszukiwania API, a brygady i triggery są wyszukiwane w pobranych pozycjach.
- Trasy API listują do 100 szablonów na stronę; UI korzysta z pierwszej strony. Dla dużych katalogów należy dodać paginację UI z istniejącymi `page`/`limit`, bez nowych filtrów API.
- Nowe wersje opublikowanej definicji pozostają osobnymi snapshotami; edycja i publikacja starszej wersji nie są oferowane.
- Obsługa załączników, wykonanie instancji i pełne reguły runtime nie należą do tego etapu.

Testy frontendowe należy uruchamiać poleceniem `cd frontend && npx vitest run <ścieżki>`, a TypeScript/Vite weryfikuje `cd frontend && npm run build`.
