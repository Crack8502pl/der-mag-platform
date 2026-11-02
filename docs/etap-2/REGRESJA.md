# Lista regresji R

To rzeczy, które działają dziś i muszą działać po każdym PR. W0b zamienia je w automatyczny test w CI (`Regression`), a każde zgłoszenie V sprawdza je dodatkowo i dopisuje nowe punkty dla właśnie dodanej funkcji. Lista rośnie razem z etapem: po W1 dochodzi R13, po W2a R14, po W2b R15, po W3a R16 itd.

| Nr | Obszar | Co musi działać | Sposób |
| --- | --- | --- | --- |
| R1 | Instalacja od zera | `node dist/scripts/migrate-and-seed.js` na pustej bazie: kod 0, jest admin, 10 ról, 13 typów zadań; drugie uruchomienie: kod 0, nic się nie dubluje | CI |
| R2 | Logowanie | admin / Admin123! = 200 i wymuszenie zmiany hasła; złe hasło = 401 „Błędne hasło”; nieistniejący login = 404; odświeżenie tokenu działa; zapis bez nagłówka CSRF = 403; `/api/users` bez tokenu = 401 | CI |
| R3 | Uprawnienia ról | użytkownik z rolą `viewer` nie tworzy kontraktu (403); `/api/admin/*` tylko dla admina | CI |
| R4 | Kontrakty i zadania | utworzenie kontraktu i zadania z `contractId`; zadanie dostaje numer `Z…` | CI |
| R5 | Formularze | szablon → wersja → publikacja → formularz dla zadania; pola „Dane z systemu” wypełnione; pole tylko do odczytu odrzuca zmianę; Tabela BOM ma pozycje zadania i odrzuca: „zamontowane” przy ilości 0, więcej niż plan bez uwag, zmianę ilości planowanej; odpowiedź FAIL blokuje zakończenie; zakończenie i akceptacja działają | CI |
| R6 | Podgląd formularza | `POST /api/forms/versions/:id/preview` z zadaniem zwraca dane i nie tworzy formularza w bazie | CI |
| R7 | PDF | `GET /api/forms/instances/:id/pdf` = 200, A4, nagłówek i stopka na każdej stronie, „Strona X z Y”; po wyrenderowaniu strony do obrazu (`pdftoppm`) tekst z polskimi znakami jest widoczny (OCR albo porównanie z wzorcem); „PROJEKT” przed akceptacją | CI |
| R8 | Nagłówki i stopki | upload logo PNG, stopki PDF; plik tekstowy udający PNG odrzucony | CI |
| R9 | Build | backend: `dist/templates/emails` istnieje; frontend buduje się; `npm audit --audit-level=high` = 0 w obu; liczba błędów ESLint nie większa niż przed PR | CI |
| R10 | Testy jednostkowe | wszystkie zielone w backendzie i frontendzie; liczba testów nie maleje | CI |
| R11 | Docker | `docker compose up` na pustych wolumenach, logowanie działa; `down` + `up` zachowuje dane i wgrane pliki | CI (istniejący test) + V przy zmianach w Dockerze |
| R12 | Istniejące kreatory i wyzwalacze | `POST` i `GET /api/wizard-drafts/:wizardType` zapisuje i zwraca wersję roboczą kreatora kontraktu; `GET /api/bom-triggers` = 200 dla admina | CI |
| R13 | Funkcje obok ról (W1) | seeder tworzy funkcje `PROCESS_BUILDERS`, `PROCESS_AUDITORS`, `TECHNICAL_REVIEW`; funkcja z „all” odrzucona (400); `viewer` z funkcją `contracts.create` tworzy kontrakt, `/api/auth/me` zwraca to uprawnienie i `functionGroups`; funkcja nie otwiera `/api/admin/*` (403); po odebraniu funkcji `POST /api/contracts` = 403, a historia członkostwa zostaje (`valid_to` ustawione) | CI |
| R14 | Automatyzacje (W2a) | łańcuch `send_email` na `FORM_APPROVED` zapisany na wersji roboczej; katalog `GET /api/automation/actions` zawiera `send_email`; nieznana zmienna w treści = 400; `POST /api/automation/chains/:id/test` (tryb testowy) zwraca OK i zapisuje run z `dry_run = true`; po akceptacji formularza w bazie jest dokładnie jeden `automation_run` SUCCEEDED | CI |
| R15 | Pole „Automatyzacje” w edytorze formularzy (W2b) | przez API to samo, co robi interfejs: zapis łańcucha z 2 krokami dla wersji roboczej formularza i odczyt w tej samej kolejności (zmiana kolejności zapisuje się w tym samym łańcuchu); „Po zatwierdzeniu” i „Po odrzuceniu” to osobne łańcuchy; brak wymaganego ustawienia = 400 ze wskazaniem kroku (`details[].stepIndex`), a zapis się nie zmienia; katalog klocków opisuje pola zależne od odbiorcy (`showWhen`); test na zadaniu zwraca wyniki kroków w kolejności łańcucha; `GET /api/automation/lookups` zwraca nazwy osób, ról, funkcji i typów zadań; `GET /api/automation/runs?instanceId=` zwraca tylko uruchomienia wskazanego formularza; wersja opublikowana = 409, a nowa wersja robocza dostaje kopię łańcucha | CI |
| R16 | Definicje procesów z wersjami (W3a) | `GET /api/admin/task-types`: SSP i SUG mają „Krytyczny dla bezpieczeństwa”; `POST /api/workflows` + `PUT /api/workflows/versions/:id`: proces 3 etapów z regułą powrotu (warunek na polu formularza etapu) i łańcuchem `STEP_ENTERED`; `POST …/validate` = brak problemów; `POST …/publish` = PUBLISHED; zmiana opublikowanej wersji = 409; `POST …/next-version` kopiuje etapy, przejścia i łańcuchy; publikacja wersji 2 → wersja 1 SUPERSEDED; zła definicja zwraca wszystkie błędy naraz po polsku, a publikacja = 400 `DEFINITION_INVALID`; `minApprovals = 0` = 400; proces dla SSP: pominięcie audytu celowości domyślnie wyłączone, bez uzasadnienia = 400, z uzasadnieniem = 200 + ostrzeżenie; przełącznik typu zadania przelicza wersje robocze; istniejące role poza adminem nie mają `workflow.read` ani `workflow.build`; `viewer` bez `workflow.read` = 403 | CI (`r16-workflow-definition.test.ts`) + test migracji z istniejącymi typami |
| R17 | Realizacje procesów (W3b) | start opublikowanego procesu dla zadania; druga aktywna realizacja tej samej definicji i przedmiotu = 409; formularz etapu musi być zakończony i zachowuje reguły R5 (wymagane odpowiedzi, FAIL, pola DATA tylko do odczytu); wynik FAIL powoduje powrót z nowym podejściem, PASS prowadzi do końca; publikacja nowej wersji nie zmienia rozpoczętej realizacji; historia zawiera cztery `step_run` i osobne formularze obu kontroli; lista filtruje definicję, przedmiot i status; dwa równoczesne zakończenia etapu dają jedno przejście | CI (`r17-workflow-run.test.ts`, `workflow-instances.test.ts`) |

Automatyzacja: workflow `.github/workflows/regression.yml` (job `Regression`), testy w `backend/tests/regression/rNN-*.test.ts` (jeden plik na punkt), progi w `backend/tests/regression/baseline.json` i `frontend/.eslint-baseline`. Uruchomienie lokalne: sekcja „Test regresji” w `README.md`. Nowy punkt R = nowy plik testu w `backend/tests/regression/`.

Test migracji W3a na danych istniejących uruchomisz z `backend/` przez
`FORM_ENGINE_TEST_DATABASE_URL=<izolowana-baza-testowa> npm test -- --runTestsByPath tests/integration/workflow-definition-migration.test.ts`.
Test tworzy i usuwa wyłącznie własny schemat PostgreSQL.

### R17 — sprawdzenie ręczne API (bez zmian interfejsu)

1. Opublikuj formularz z polem wyboru `wynik` o wartościach PASS/FAIL. Typ pola
   `PASS_FAIL` nadal blokuje zakończenie przy FAIL — do reguły powrotu użyj zwykłego pola wyboru.
2. Opublikuj proces dla typu zadania: „Montaż” → „Kontrola” (z formularzem).
   Dodaj przejście z kontroli do montażu, gdy `wynik` równa się FAIL.
3. Jako użytkownik z `workflow.start` wywołaj `POST /api/workflow-instances`
   z `{ definitionId, subjectType: "TASK", subjectId }`. Zachowaj identyfikator realizacji.
4. Wykonawca z `workflow.execute` kończy etap przez
   `POST /api/workflow-instances/:id/steps/current/complete`. Formularz kontroli wypełnij
   i zakończ przez istniejące API formularzy; najpierw podaj FAIL, przy drugim podejściu PASS.
   Jeśli wersja szablonu ma `settings.approvalRequired = true`, przed ukończeniem etapu
   wymagane jest również zatwierdzenie formularza (APPROVED); samo SUBMITTED nie wystarczy,
   także dla administratora. To ustawienie backendu — konfiguracja interfejsu jest poza W3b.
5. `GET /api/workflow-instances/:id` (wymaga `workflow.read`) powinien zwrócić COMPLETED
   oraz cztery wpisy historii, z podejściami 1 i 2. Nowa publikacja procesu nie zmienia `versionId`.
6. `GET /api/workflow-instances/my-steps` (wymaga `workflow.read`) pokazuje zadania wykonawcy również z jego roli,
   aktywnej funkcji i brygady. Lista `GET /api/workflow-instances` obsługuje filtry
   `definitionId`, `status`, `stepKey`, `subjectType`, `subjectId`, `overdue=true`.
7. Z `workflow.override` sprawdź `POST /api/workflow-instances/:id/force`
   (`toStepKey`, `reason`) oraz `POST /api/workflow-instances/:id/cancel` (`reason`).
   Pusty powód ma być odrzucony; wymuszenie zostawia w historii outcome FORCED.

Uruchomienie samego R17: z `backend/` wykonaj
`npm run test:regression -- --runTestsByPath tests/regression/r17-workflow-run.test.ts`
przy działającym lokalnym serwerze i bazie przygotowanych według `README.md`.
Testy blokad PostgreSQL, migracji, wykonawców grupowych, zatwierdzeń formularzy i zdarzeń:
z `backend/` wykonaj
`FORM_ENGINE_TEST_DATABASE_URL=<izolowana-baza-testowa> npm test -- --runTestsByPath tests/integration/workflow-instances.test.ts --runInBand`.
Testy korzystają wyłącznie z lokalnej bazy i tworzą własny schemat.

To, co dziś jest znanym błędem, nie trafia na listę jako wymóg. Na przykład nieznana ścieżka `/api/...` zwraca stronę HTML zamiast JSON 404. Takie rzeczy mają być osobnymi zgłoszeniami błędów poza Etapem 2.
