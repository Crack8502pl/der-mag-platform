# Form & Checklist Engine — DynamicFormRenderer

Etap 7, issue #692, parent #685. Wspólny runtime dla `FORM` i `CHECKLIST`, bez komponentów konkretnych formularzy biznesowych.

## Komponenty i integracja

- `frontend/src/components/forms/DynamicFormRenderer.tsx` pobiera definicję przez istniejące `formsService.getVersion(versionId)` (`GET /api/forms/versions/:id`). Renderuje wyłącznie tę zapisaną wersję, nie najnowszą wersję szablonu ani niezapisany stan buildera.
- `fieldRegistry.tsx` mapuje FIELD TYPE na kontrolowane komponenty React Hook Form.
- `formSchema.ts` buduje schemat Zod z pól snapshotu; resolver pracuje na aktualnych odpowiedziach. Nie implementuje serwisów domenowych, lifecycle, triggerów, Variable Engine ani approval.
- `DynamicFormRenderer.css` korzysta z istniejących tokenów `grover-theme.css` (ciemny) i `husky-theme.css` (jasny; w repo nazwa to **husky**, nie huskey).
- Zakładka **Preview** w `/admin/forms` korzysta z tego samego renderera. Pola są interaktywne, warunki działają, ale odpowiedzi nie są zapisywane. Najpierw trzeba zapisać edycję definicji w builderze.

```tsx
<DynamicFormRenderer
  versionId={instance.templateVersionId}
  initialValues={responses}
  requireRequired={false}
  onSubmit={saveResponses}
/>
```

`initialValues` jest mapą odpowiedzi według stabilnych kluczy; renderer pomija nieznane klucze. Zmiana tych danych resetuje kontrolki (np. po pobraniu odpowiedzi), więc host powinien utrzymywać stabilny obiekt i nie zmieniać go podczas edycji. Zmiana `versionId` ładuje nowy snapshot i odrzuca spóźnione wyniki poprzednich zapytań.

`onSubmit(responses, version)` jest opcjonalnym, asynchronicznym adapterem hosta. Jego brak oznacza podgląd bez przycisku zapisu. Host wykonania instancji ma pobrać jej `templateVersionId` z istniejącego API, zmapować `GET /instances/:id/values` na klucze pól i przekazać odpowiedzi do istniejącego `PUT /instances/:id/values` jako `{ responses }`. Renderer nie tworzy instancji, nie wybiera innej wersji i nie wywołuje `complete` ani `approve`. Pełny ekran wykonania instancji należy do etapu 9.

Domyślnie schemat egzekwuje wymagalność widocznych pól. `requireRequired={false}` umożliwia częściowy zapis zgodnie z API etapu 5, zachowując kontrolę typów i zakresów. `disabled` zapewnia tryb tylko do odczytu. `submitLabel` pozwala dostosować etykietę akcji. Sukces jest pokazywany dopiero po rozwiązaniu callbacka; odrzucenie daje bezpieczny komunikat błędu bez szczegółów serwera.

## Registry i format odpowiedzi

| FIELD TYPE | UI | Wartość |
| --- | --- | --- |
| TEXT / STRING | Input tekstowy | string |
| TEXTAREA | Textarea | string |
| EMAIL / DATE | Input email / date | string |
| NUMBER | Input number, jednostka z `options.unit` | skończona number; wyczyszczenie: null |
| SELECT | Select z `options.values` | string |
| RADIO | Grupa radio z `options.values` | string |
| MULTI_SELECT | Select multiple | string[] |
| PASS_FAIL | Wybór PASS / FAIL | `"PASS"` / `"FAIL"` |
| CHECKBOX | Wybór Tak / Nie / brak odpowiedzi | true / false / null |

`CHECKBOX` świadomie rozróżnia **false** i brak odpowiedzi: wymagane pole boolean nie oznacza konieczności zaznaczenia „Tak”. Nie wstawiamy automatycznej odpowiedzi false do nietkniętego pola. Puste odpowiedzi mają semantykę backendu (`null`, brak, pusty/whitespace string, pusta tablica); 0 i false nie są puste.

Opcje pochodzą ze snapshotu. Istniejące wartości spoza listy są prezentowane bez utraty danych, ponieważ API etapu 5 nie egzekwuje jeszcze membership. Schemat nie dodaje nowych reguł EMAIL/DATE, regexów ani walidacji opcji nieobecnych w backendzie. Natywna walidacja submitu jest wyłączona; Zod zapewnia jednolite komunikaty i ARIA.

## Warunki i schemat

Warunki mają istniejący format `{ field, operator, value? }`. Sekcja: `visibleWhen`; pole: `visibleWhen`, `requiredWhen`. Operatory: `equals`, `notEquals`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `isEmpty`, `isNotEmpty`. Porównania nie konwertują stringów na liczby/booleany i nie wykonują kodu. Nie ma `eval`, własnego języka skryptowego ani pełnego silnika reguł.

Pole jest widoczne, gdy spełnia warunek sekcji **i** własny warunek. Wymagane jest `required || requiredWhen`; `requiredWhen` nie wyłącza statycznego required. Ukrycie zachowuje odpowiedź w React Hook Form i payloadzie, aby przełączanie warunków nie usuwało pracy użytkownika. Typy ukrytych odpowiedzi nadal są sprawdzane, zgodnie z API. Wymagalność dotyczy tylko widocznych pól.

Backend pozostaje źródłem prawdy: ponownie sprawdza zapis względem wersji instancji, uprawnienia, zakres rekordu oraz ukończenie. `FAIL` i `blockCompletionWhen` mogą blokować **complete**, ale nie zapis odpowiedzi; renderer nie duplikuje tych reguł ukończenia.

## UI, błędy i ryzyka

- Stany: ładowanie, błąd pobrania/nieobsługiwana definicja z retry, brak widocznych pól, zapis w toku, sukces i błąd zapisu.
- Etykiety, oznaczenie required, grupy radio, `aria-required`, `aria-invalid` i `aria-describedby`; blokada pól podczas zapisu, focus ring z tokenu motywu. Układ działa na małym ekranie.
- ID kontrolek, opcji RADIO i błędów mają osobne namespace z separatorem niedozwolonym w kluczach pól, więc np. `result`, `result-1` i `result-error` nie powodują kolizji etykiet.
- Nieobsługiwany typ, zarezerwowane/niebezpieczne klucze i niespójna definicja blokują renderowanie zamiast pomijać pole lub rejestrować niebezpieczną ścieżkę RHF.
- Brak RBAC lub utrata dostępu skutkuje błędem API. Rozwiązaniem jest prawidłowe nadanie istniejących uprawnień, nigdy pominięcie autoryzacji.
- Ukryte, ale błędnie typowane historyczne dane mogą blokować zapis. Host powinien pokazać poprawny snapshot i umożliwić korektę danych; nie usuwać ich automatycznie.
- Zmiana warunków może odsłonić nowe wymagane pola. Walidacja przy submit zawsze używa aktualnych wartości, nie wcześniej wyliczonej widoczności.
- Brak uploadu/ACL załączników i kontraktu specjalnych pól urządzeń: registry obsługuje wszystkie typy dopuszczone obecnie przez backend, bez fikcyjnych endpointów. Rozszerzenie wymaga najpierw wersjonowanego kontraktu API.
- Renderer nie zmienia statusów urządzeń/zadań i nie tworzy `installedIn`; zachowuje PRECONFIGURATION ≠ ASSEMBLY.

## Weryfikacja

Istniejące narzędzia: Vitest + Testing Library, V8 coverage, TypeScript/Vite, ESLint. Testy obejmują registry, schematy, warunki, walidację, snapshoty, zachowanie ukrytych wartości, stany UI, callbacki i wyścigi zapytań oraz integrację Preview.

Z katalogu `frontend`:

```bash
npx vitest run src/components/forms src/components/admin/FormBuilderPage.test.tsx
npx vitest run src/components/forms --coverage --coverage.include='src/components/forms/**/*.{ts,tsx}'
npm run build
```

Konfiguracja coverage obejmuje nowy runtime, pomija testy i zachowuje istniejące progi 70% dla linii, statements, funkcji i gałęzi.

Weryfikacja etapu 7: pełny frontend **35 zestawów / 456 testów** bez błędów; TypeScript/Vite build i ukierunkowany ESLint przeszły. Pokrycie nowych modułów (linie / gałęzie): renderer **100% / 95,23%**, registry **100% / 100%**, schemat **99,03% / 98,93%**. Vite poprawnie serwuje stronę i moduł renderer’a przez HTTP. Kontrola wizualna przeglądarką nie była możliwa z powodu niedostępnego transportu narzędzia; interakcje UI zweryfikowano przez Testing Library. Build zachowuje ostrzeżenia o brakujących certyfikatach, cyklicznych chunkach i wielkości bundle, bez błędów kompilacji.
