# Etap 2 – zgłoszenia do założenia w GitHubie

W tym folderze jest gotowy zestaw zgłoszeń Etapu 2:

- `00-EPIK.md` – epik (zgłoszenie główne),
- `01-W0a.md` … `28-V-END.md` – 28 sub-issues w kolejności wykonania
  (14 zadań wdrożeniowych W, 13 weryfikacji V, odbiór końcowy V-END),
- `manifest.json` – tytuły, etykiety i zależności „blocked by”,
- `REGRESJA.md` – lista regresji R1–R12 (W0a przenosi ją do `docs/etap-2/`),
- `create_issues.py` – skrypt, który zakłada wszystko naraz,
- `../workflows/etap2-create-issues.yml` – przycisk w zakładce Actions.

Zapisy `{{#V0}}` w treści to miejsca na numery zgłoszeń. Skrypt sam wstawia tam
prawdziwe numery (np. `#4`), więc w GitHubie są to klikalne odnośniki.

## Jak założyć zgłoszenia (przez GitHub)

1. Te pliki muszą być na gałęzi `main` (np. scalone jednym PR).
2. Wejdź w **Actions → „Etap 2: załóż zgłoszenia” → Run workflow**.
   Zostaw zaznaczone **„Próba”** i uruchom. Nic się nie zakłada, w logu widać plan,
   a w wynikach jest artefakt `podglad-zgloszen` z gotowymi treściami.
3. Jeśli plan się zgadza, uruchom ponownie **bez** zaznaczonej „Próby”.
   Powstaną: etykiety, milestone „Etap 2 – Workflow”, epik, 28 sub-issues
   i zależności „blocked by”.
4. Skrypt można uruchomić drugi raz bez obaw: istniejących zgłoszeń nie dubluje.

Jeśli w logu pojawi się „nie udało się ustawić zależności”, ustaw ją ręcznie:
w zgłoszeniu panel **Relationships → Mark as blocked by**. Treść zgłoszenia i tak
ma linię „Wymaga: …”.

## Po założeniu

1. Ustaw ochronę gałęzi `main` (Settings → Rules → Rulesets), jak opisano w epiku.
2. Przypisz do Copilota **tylko W0a**. Każde następne dopiero po zamknięciu
   poprzedniego (GitHub pokaże je jako zablokowane).
3. Po zakończeniu Etapu 2 ten folder i workflow `etap2-create-issues.yml`
   można usunąć.

## Bez skryptu (ręcznie)

Każdy plik `.md` to gotowa treść jednego zgłoszenia, a tytuł jest w `manifest.json`.
Zakładaj je w kolejności numerów i zamieniaj `{{#KLUCZ}}` na numer wcześniej
założonego zgłoszenia.
