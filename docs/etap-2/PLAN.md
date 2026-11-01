# Plan Etapu 2

## Cel główny

Kierownik składa nowy proces w kreatorze bez programowania. Proces przechodzi audyt celowości, przegląd techniczny i publikację, a każde jego działanie i każda anomalia zostaje w dziennikach. Wdrożenie robi AI (Copilot) w 14 małych PR-ach. Po każdym PR osobne zgłoszenie weryfikacyjne sprawdza, czy nic wcześniej działającego się nie zepsuło.

Punkt wyjścia: `main` na commicie `519da63` (po #723). Zadania A–E z pierwszego planu są scalone.

## Kryteria sukcesu

- [ ] **K1** Proces z 5 etapami, formularzem i regułą powrotu da się zbudować w kreatorze bez wpisania kodu, JSON-a ani klucza _(sprawdzenie: ręczny test w V-END: osoba bez wiedzy technicznej)_
- [ ] **K2** Żadna wersja procesu nie trafia do użytku bez minimum 1 akceptacji audytu (wyjątek: szybka poprawka z audytem wstecznym) _(sprawdzenie: testy W5 + V-END)_
- [ ] **K3** Autor i admin bez funkcji audytora nie mogą zatwierdzić audytu _(sprawdzenie: testy W5)_
- [ ] **K4** Procesy dla SSP i SUG domyślnie wymagają pełnego audytu; próba pominięcia daje wyraźne ostrzeżenie i wpis w dzienniku _(sprawdzenie: testy W5 + V5a)_
- [ ] **K5** Dziennika audytowego nie da się zmienić ani usunąć, także z poziomu bazy _(sprawdzenie: test W6a)_
- [ ] **K6** Każda automatyzacja ma w dzienniku wejście, wynik i błąd; ponowienie nie dubluje skutków (np. e-maili) _(sprawdzenie: testy W2a)_
- [ ] **K7** Wszystkie punkty listy regresji R działają po każdym PR _(sprawdzenie: zgłoszenia V + CI)_

## Zakres

- Funkcje (grupy funkcyjne) obok ról.
- Automatyzacje jako klocki w kodzie, składane w jednym polu.
- Silnik procesów z wersjami i realizacjami.
- Kreator z testem „na sucho”.
- Przegląd, akceptacje, publikacja, szybka poprawka, zgłoszenia problemów.
- Dzienniki: audytowy, wykonania, błędów i anomalii, ekran „Zdrowie procesów”.

## Poza zakresem (osobny etap)

- Przeniesienie obecnych procesów (kompletacja, prefabrykacja, montaż urządzeń) na nowy silnik.
- Przeniesienie wyzwalaczy BOM na nowe automatyzacje.
- Wpisywanie automatyzacji zdaniem po polsku przez AI.
- Zastępstwa na czas urlopów.

## Decyzje projektowe

| Temat | Decyzja |
| --- | --- |
| Kolejność przeglądów | audyt celowości, potem przegląd techniczny |
| Pominięcie audytu celowości | możliwe z uzasadnieniem, jeśli proces na to pozwala; audytorzy dostają powiadomienie |
| Procesy krytyczne dla bezpieczeństwa | typy zadań SSP i SUG są oznaczone jako krytyczne (admin może oznaczyć kolejne). Proces powiązany z takim typem ma domyślnie zablokowane pomijanie audytu. Włączenie pomijania w kreatorze i każda próba pominięcia pokazują wyraźne ostrzeżenie, wymagają potwierdzenia i trafiają do dziennika |
| Liczba akceptacji | ustawiana w kreatorze dla każdego przeglądu, zawsze minimum 1 |
| Kto zatwierdza | funkcja (grupa osób), różne osoby, bez autora; uprawnienie admina „wszystko” nie omija audytu |
| Szybka poprawka | admin publikuje od razu z powodem i zgłoszeniem; potem audyt wsteczny |
| Negatywny audyt wsteczny | tylko alarm; uwagi obowiązkowe w następnej wersji; bez wycofania |
| Rozpoczęte realizacje | kończą się na swojej wersji |
| Daty | wszystkie nowe kolumny jako `timestamp with time zone` |
