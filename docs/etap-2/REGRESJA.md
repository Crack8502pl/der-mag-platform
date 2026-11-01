# Lista regresji R

To rzeczy, które działają dziś i muszą działać po każdym PR. W0b zamienia je w automatyczny test w CI (`Regression`), a każde zgłoszenie V sprawdza je dodatkowo i dopisuje nowe punkty dla właśnie dodanej funkcji. Lista rośnie razem z etapem: po W1 dochodzi R13 itd.

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

Automatyzacja: workflow `.github/workflows/regression.yml` (job `Regression`), testy w `backend/tests/regression/rNN-*.test.ts` (jeden plik na punkt), progi w `backend/tests/regression/baseline.json` i `frontend/.eslint-baseline`. Uruchomienie lokalne: sekcja „Test regresji” w `README.md`. Nowy punkt R = nowy plik testu w `backend/tests/regression/`.

To, co dziś jest znanym błędem, nie trafia na listę jako wymóg. Na przykład nieznana ścieżka `/api/...` zwraca stronę HTML zamiast JSON 404. Takie rzeczy mają być osobnymi zgłoszeniami błędów poza Etapem 2.
