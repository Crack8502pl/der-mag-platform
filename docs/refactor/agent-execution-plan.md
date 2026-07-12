# Agent Execution Plan – realizacja PR roadmapy

## Cel

Zlecić agentowi wykonanie serii zależnych PR zgodnie z roadmapą, z zachowaniem jakości i ograniczeń projektu.

## Zasady wykonania przez agenta

1. Agent realizuje **jeden PR na sesję** (chyba że wyraźnie wskazano inaczej).
2. Agent musi respektować `depends_on` – brak obchodzenia zależności.
3. Każdy PR zawiera:
   - opis zmian,
   - ograniczenia,
   - możliwe błędy,
   - plan testów,
   - update dokumentacji.
4. Każdy PR przechodzi:
   - `tsc` bez błędów,
   - testy modułowe/integracyjne,
   - utrzymanie celu coverage 70–80% dla nowego kodu.
5. Brak `any`, brak static services, obowiązkowe DI.
6. Dla migracji DB: nazwa z datą utworzenia.
7. Jeśli PR dotyka UI/CSS:
   - sprawdzenie `grover-theme` i `huskey-theme`.

## Kolejność uruchamiania (pipeline)

### Faza A: fundamenty
1. PR-1
2. PR-2
3. PR-3

### Faza B: domeny (równolegle)
4. PR-4
5. PR-5 (po PR-4 i PR-2)
6. PR-6 (po PR-2)

### Faza C: jakość i funkcje
7. PR-7
8. PR-8
9. PR-9

### Faza D: rollout
10. PR-10 (po PR-2 i PR-6 minimum; preferencyjnie po PR-3/7/9)

---

## Szablon zadania dla agenta (do każdego PR)

## Task: PR-{N} – {Tytuł z roadmapy}

### Inputs
- Repo: `Crack8502pl/der-mag-platform`
- Branch base: domyślna gałąź repo (lub wskazana przez maintainera)
- Referencja: `docs/refactor/variable-engine-refactor-plan.md`
- Referencja: `docs/refactor/variable-engine-pr-roadmap.md`

### Scope
- Wykonaj wyłącznie zakres opisany w PR-{N}.
- Nie implementuj elementów z kolejnych PR bez wyraźnej zgody.

### Constraints
- Strict TypeScript, bez `any`.
- DI mandatory, brak static services.
- Zachowaj kompatybilność wsteczną jeśli roadmapa tego wymaga.
- Nie łam zależności `depends_on`.
- Aktualizuj dokumentację po zmianach.

### Required checks
- `tsc` green
- test suite green
- coverage dla nowego kodu w przedziale 70–80%
- lint (jeśli repo posiada)
- smoke test dla obszaru zmiany

### PR description must include
1. **Zakres zmian**
2. **Zależności**
3. **Ograniczenia**
4. **Możliwe błędy / ryzyka**
5. **Jak testowano**
6. **Rollback plan** (jeśli dotyczy)

### Deliverables
- Commit(y)
- PR z pełnym opisem
- Zaktualizowane docs

---

## Gate review (przed merge każdego PR)

Checklist:
- [ ] Zgodność z roadmapą i zależnościami
- [ ] Brak nadmiarowego scope creep
- [ ] TS build bez błędów
- [ ] Testy green
- [ ] Coverage zgodny z celem
- [ ] Dokumentacja zaktualizowana
- [ ] Sekcja ryzyk i ograniczeń uzupełniona
- [ ] (UI) temat dark/light zweryfikowany
- [ ] (DB) migracje z datą w nazwie

---

## Kryteria stop (wstrzymanie pipeline)

Wstrzymaj kolejne PR-y, jeśli:
1. PR krytyczny nie przeszedł testów stabilności.
2. Wykryto regresję w renderowaniu templatek.
3. Pojawił się problem wydajnościowy przekraczający ustalone progi.
4. Wystąpiła niezgodność architektoniczna (np. naruszenie DI/OCP).

---

## Raportowanie postępu (po każdym PR)

Agent powinien raportować:
- Status: `DONE / BLOCKED / NEEDS_DECISION`
- Co zostało wdrożone
- Wyniki testów i build
- Ryzyka otwarte
- Następny PR gotowy do startu
