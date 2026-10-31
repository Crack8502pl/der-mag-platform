# Formularze: dalsze prace po #721

Stan na 31.10.2026, 23:50 UTC.

## Podsumowanie

Wszystkie 12 zadań z pierwotnego planu zostało zrealizowanych. Z 9 poprawek z sekcji E osiem jest zakończonych, a poprawka godzin w PDF jest częściowa. Do wykonania pozostają dwa zgłoszenia opisane poniżej. Nie otwieraj ponownie zadań oznaczonych jako zakończone.

Stan sprawdzono na commicie `b6175da`: 2120 testów backendu i 480 testów frontendu zaliczonych, audyt i build bez błędów.

| Priorytet | Zakres | Stan |
| --- | --- | --- |
| 1 — średni | Jednoznaczne daty i godziny w bazie oraz PDF | Do zrobienia |
| 2 — mały | Polskie komunikaty i etykiety oraz podgląd bez zadania | Do zrobienia |

## Zgłoszenie 1: spójne daty i godziny w PDF

**Problem:** data utworzenia i akceptacji jest zapisywana przez bazę w UTC, natomiast data wysłania przez aplikację w czasie serwera. Kolumny mają typ `timestamp without time zone`. Na serwerze ustawionym na czas polski wartości „Utworzono” i „Kiedy” w PDF są o godzinę wcześniejsze niż „Wysłano”. W Dockerze działającym w UTC problem nie występował.

### Do zrobienia

1. Sprawdź dokładne kolumny, zapis i odczyt dat oraz typy kolumn w encjach i bazie.
2. Dodaj migrację TypeORM z datą w nazwie, która zmieni właściwe kolumny na `timestamp with time zone`. Konwersja istniejących danych ma jawnie uwzględniać dotychczasową semantykę: daty utworzenia i akceptacji są UTC, a data wysłania pochodzi z czasu serwera.
3. Ustal i udokumentuj strefę serwera właściwą dla historycznych wartości daty wysłania. Nie uzależniaj konwersji od strefy sesji PostgreSQL ani aktualnej konfiguracji serwera. Jeśli strefy historycznych danych nie da się ustalić, wstrzymaj wdrożenie migracji produkcyjnej do czasu uzgodnienia bezpiecznej konwersji.
4. Ujednolić zapis nowych dat tak, by przechowywać jednoznaczny moment w czasie.
5. Wszystkie daty w PDF wyświetlaj jawnie w strefie `Europe/Warsaw`, w formacie `dd.MM.yyyy, HH:mm`.

### Testy i akceptacja

- Test migracji potwierdza zachowanie właściwego momentu dla każdej migrowanej kolumny.
- Testy formatu PDF potwierdzają zgodne godziny niezależnie od strefy procesu i PostgreSQL.
- Uwzględnij datę letnią i zimową oraz zmianę czasu w `Europe/Warsaw`.
- Wygenerowany PDF pokazuje zgodne daty utworzenia, wysłania i akceptacji.

## Zgłoszenie 2: drobne poprawki formularzy i PDF

### Do zrobienia

1. Przetłumacz komunikaty „BOM item plannedQty cannot be changed” i „FAIL blocks completion” na poprawne, zrozumiałe komunikaty po polsku.
2. W PDF pokazuj polskie etykiety zamiast technicznych kodów, w szczególności `APPROVED` jako „Zatwierdzony” i `PASS` jako „OK”. Zmiana dotyczy prezentacji — nie zmieniaj wartości przechowywanych w bazie ani kontraktu API.
3. Gdy w podglądzie nie wybrano zadania, pokaż dane przykładowe zamiast błędu walidacji. Wyraźnie odróżnij je od rzeczywistych danych zadania; nie zapisuj ich ani nie wysyłaj jako danych formularza.

### Testy i akceptacja

- Testy obejmują polskie komunikaty oraz etykiety statusów i odpowiedzi w PDF.
- Podgląd bez wybranego zadania pokazuje dane przykładowe i nie zapisuje ich.
- Po wybraniu zadania podgląd nadal pokazuje jego rzeczywiste dane.

## Poza zakresem

Pozostałe poprawki z sekcji E są zakończone: czytelność czcionki i znak wodny PDF, podgląd wersji roboczej na zadaniu, edytor formularzy, ostrzeżenie o częściowym montażu, walidacja źródeł danych, podgląd nagłówka, profil `https-lan` oraz opis haseł ze znakiem `$`.
