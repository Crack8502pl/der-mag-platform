> **Wymaga:** {{#V6b}} (V6b) zamknięte.

## Zasada jak w V

Bez zmian kodu produkcyjnego.

- [ ] **1.** Cała lista R1-R23 zielona w CI i lokalnie, także przez docker compose na pustych wolumenach (R11): logowanie, migracje, nowe tabele obecne.
- [ ] **2.** Kopia i przywrócenie bazy (docker/backup) obejmuje nowe tabele; po przywróceniu audit/verify OK.
- [ ] **3.** Scenariusz końcowy jako test end-to-end (backend/tests/regression/r99-stage2-acceptance.test.ts):
  - a) admin nadaje funkcje 4 osobom;
  - b) budowniczy tworzy proces dla SSP: 4 etapy, formularz z PASS/FAIL, reguła powrotu, łańcuch "Wygeneruj PDF" + "Wyślij e-mail";
  - c) próba pominięcia audytu bez potwierdzenia ryzyka = 409;
  - d) audyt celowości zwraca z uwagą BLOCKING; poprawka; 2 akceptacje audytorów (min. 2); przegląd techniczny; publikacja;
  - e) realizacja dla zadania SSP: FAIL -> powrót -> PASS -> koniec; PDF i e-mail wygenerowane raz;
  - f) zgłoszenie problemu -> hotfix z potwierdzeniem ryzyka -> audyt wsteczny negatywny -> alarm, obowiązkowe uwagi, blokada następnej wersji -> rozwiązanie -> następna wersja przechodzi;
  - g) anomalie: SAFETY_AUDIT_SKIPPED i MANUAL_OVERRIDE widoczne;
  - h) dziennik audytowy zawiera wszystkie kroki a-g, verify OK.
- [ ] **4.** Kryteria K1-K7 z docs/etap-2/PLAN.md: tabela z wynikiem i dowodem (test albo zrzut). K1 oznacz "do potwierdzenia przez właściciela".
- [ ] **5.** Aktualizacja docs/etap-2/: instrukcja obsługi kreatora dla budowniczego i audytora (po polsku, ze zrzutami).

---

**Epik:** {{#EPIK}} · **Milestone:** Etap 2 – Workflow · **Wielkość:** M

**Zablokowane przez:** {{#V6b}} (V6b). Nie zaczynaj, dopóki nie są zamknięte.
