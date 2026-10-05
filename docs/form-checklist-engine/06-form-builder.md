# Form & Checklist Engine — Form Builder

**Etap:** 6 dla issue #691, podrzędny do #685.  
**Zależności:** API etapów 4–5, dostępne pod `/api/forms`; schemat etapu 3 musi być wdrożony.

## Zakres

Panel administracyjny dostępny pod `/admin/forms` zapewnia listę szablonów oraz cztery widoki wybranej wersji:

- **Form Builder** — edycja tytułu, opisu, sekcji i pól wersji roboczej; przeciąganie sekcji i pól, kopiowanie/usuwanie pól, required, typy, walidacja liczbowa, jednostki, opcje wyboru i deklaratywne warunki.
- **Versions** — lista wersji, otwieranie istniejących wersji i tworzenie następnej wersji na podstawie opublikowanej.
- **Preview** — od etapu 7 interaktywny [DynamicFormRenderer](07-dynamic-form-renderer.md) zapisanej wersji, z warunkami widoczności; bez zapisu odpowiedzi.
- **Assignments / Rules** — odczyt i zapis reguł przypisań wyłącznie dla draftów.

Tworzenie nowego formularza wymaga klucza, nazwy, rodzaju `FORM`/`CHECKLIST` i jednej z obsługiwanych procedur. Nie są dodawane przykładowe formularze biznesowe ani zależności od konkretnych procedur poza dozwolonymi wartościami domenowymi.

## Integracja

- `frontend/src/components/admin/FormBuilderPage.tsx` udostępnia panel i edytor.
- `frontend/src/components/admin/FormBuilderPage.css` korzysta z tokenów motywu i wspiera `grover` oraz `husky`.
- `frontend/src/services/forms.service.ts` typuje wywołania API; `frontend/src/hooks/useFormTemplates.ts` pobiera listę i udostępnia odświeżenie.
- `frontend/src/types/forms.types.ts` zawiera minimalne modele UI. `permissions.types.ts`, route `/admin/forms` i karta panelu administratora używają istniejącego modułu uprawnień `forms`.
- `backend/src/controllers/RoleController.ts` wystawia akcje `forms` w istniejącym schemacie macierzy uprawnień, aby administratorzy mogli przydzielać je przez UI RBAC.
- Drag & drop korzysta z istniejącego `@dnd-kit/core`. Nie dodano zależności; brak `@dnd-kit/sortable` nie blokuje sortowania prostym mechanizmem core.

Wykorzystywane endpointy: `GET/POST /forms/templates`, `GET /forms/templates/:id/versions`, `POST /forms/templates/:id/draft`, `GET /forms/versions/:id`, `PUT /forms/versions/:id/draft`, `POST /forms/versions/:id/publish`, `POST /forms/versions/:id/next`, `GET/PUT /forms/versions/:id/assignment-rules`. API pozostaje źródłem prawdy dla walidacji, publikacji, audytu i niemutowalności wersji. Builder nie modyfikuje danych bezpośrednio i nie implementuje runtime reguł.

Role potrzebują `forms.read` do otwarcia panelu; akcje są prezentowane zależnie od `forms.create`, `forms.update`, `forms.publish` oraz `forms.assign`. Backend nadal egzekwuje to samo RBAC dla każdego endpointu. Brak skonfigurowanych uprawnień skutkuje odmową dostępu — nie jest automatycznie zmieniana konfiguracja ról.

## Ograniczenia i ryzyka

- Warunki są edytowane jako ograniczone deklaratywne dane pól/sekcji. Sekcje obsługują tylko `visibleWhen`; pola: `visibleWhen`, `requiredWhen`, `blockCompletionWhen`. Publikacja ponownie waliduje referencje i operatory według API.
- `options.values` przechowuje wybrane opcje, a `options.unit` jednostkę prezentacyjną. Etap 5 nie egzekwuje jeszcze wyboru z listy opcji podczas walidacji odpowiedzi.
- Podgląd używa zapisanej wersji: niezapisane edycje nie są widoczne. Pełny Variable Engine i triggery nadal pozostają poza zakresem.
- Reguły przypisań są konfigurowane, ale nie wykonywane automatycznie (etap 8). Wymagane cele i zgodność triggera z wersją są ostatecznie walidowane przez API.
- Trasy API listują do 100 szablonów na stronę; UI korzysta z pierwszej strony. Dla dużych katalogów należy dodać paginację UI z istniejącymi `page`/`limit`, bez nowych filtrów API.
- Nowe wersje opublikowanej definicji pozostają osobnymi snapshotami; edycja i publikacja starszej wersji nie są oferowane.
- Obsługa załączników, wykonanie instancji i pełne reguły runtime nie należą do tego etapu.

Testy frontendowe należy uruchamiać poleceniem `cd frontend && npx vitest run <ścieżki>`, a TypeScript/Vite weryfikuje `cd frontend && npm run build`.
