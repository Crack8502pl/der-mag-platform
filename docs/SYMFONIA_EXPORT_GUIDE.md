# 📋 Instrukcja eksportu danych z Symfonia Handel do CSV

## Spis treści
1. [Eksport stanów magazynowych](#eksport-stanów-magazynowych)
2. [Eksport kartoteki towarów](#eksport-kartoteki-towarów)
3. [Format pliku CSV](#format-pliku-csv)
4. [Import do Der-Mag Platform](#import-do-der-mag-platform)
5. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## 1. Eksport stanów magazynowych

### Symfonia Handel (wersja desktopowa)

1. **Otwórz moduł Magazyn**
   - Menu główne → Magazyn → Stany magazynowe

2. **Ustaw filtry** (opcjonalnie)
   - Wybierz magazyn
   - Ustaw datę stanu
   - Filtruj po kategorii jeśli potrzebne

3. **Eksportuj do pliku**
   - Kliknij: Plik → Eksport → Eksport do CSV
   - Lub: Ctrl + E → Wybierz format CSV

4. **Ustawienia eksportu**
   - Separator: Średnik (;)
   - Kodowanie: UTF-8 lub Windows-1250
   - Zaznacz: ☑ Eksportuj nagłówki kolumn

5. **Wybierz kolumny do eksportu:**
   - ☑ Indeks (numer katalogowy)
   - ☑ Nazwa
   - ☑ Stan (ilość)
   - ☑ JM (jednostka miary)
   - ☑ Cena
   - ☑ Magazyn
   - ☑ Dostawca
   - ☑ Kod kreskowy (jeśli używany)

6. **Zapisz plik**
   - Nazwa: `stany_magazynowe_RRRR-MM-DD.csv`
   - Lokalizacja: wybierz folder

---

## 2. Eksport kartoteki towarów

### Symfonia Handel

1. **Otwórz kartotekę towarów**
   - Menu: Słowniki → Towary

2. **Wybierz zakres eksportu**
   - Wszystkie towary lub
   - Zaznaczone pozycje

3. **Eksportuj**
   - Narzędzia → Eksport do CSV
   - Lub: Prawy przycisk → Eksportuj

4. **Kolumny dla pełnej kartoteki:**
   - ☑ Id (ID wewnętrzne Symfonia)
   - ☑ Indeks
   - ☑ Symbol
   - ☑ Nazwa
   - ☑ Nazwa pełna
   - ☑ JM
   - ☑ Cena zakupu
   - ☑ Cena sprzedaży
   - ☑ VAT
   - ☑ Grupa towarowa
   - ☑ Dostawca domyślny
   - ☑ Kod kreskowy
   - ☑ EAN
   - ☑ Stan minimalny
   - ☑ Uwagi

---

## 3. Format pliku CSV

### Wymagana struktura dla Der-Mag Platform

```csv
Indeks;Nazwa;Stan;JM;Cena;Magazyn;Dostawca;KodKreskowy;EAN
MAT-001;Kabel UTP Cat6 305m;150;szt;250.00;MAG-01;Elektro-Kabel;4902778123456;4902778123456
MAT-002;Gniazdo RJ45 Cat6;500;szt;12.50;MAG-01;Molex;4902778123457;
MAT-003;Patch panel 24-port;25;szt;180.00;MAG-02;Panduit;;4902778123458
```

### Obsługiwane nazwy kolumn

| Pole w systemie | Akceptowane nazwy kolumn |
|-----------------|-------------------------|
| Numer katalogowy | Indeks, Symbol, PartNumber, Part Number, Nr katalogowy |
| Nazwa | Nazwa, Name, Description, Opis |
| Ilość | Stan, Ilość, Qty, Quantity, Dostępne |
| Jednostka | JM, Jednostka, Unit, UOM |
| Cena | Cena, Price, Cena jednostkowa, Unit Price |
| Magazyn | Magazyn, Warehouse, Location, Lokalizacja |
| Dostawca | Dostawca, Vendor, Supplier |
| Kod kreskowy | KodKreskowy, Barcode, Kod |
| EAN | EAN, EAN13, EAN-13 |

### Ważne uwagi

- Separator: średnik (;) dla plików z Symfonia
- Kodowanie: UTF-8 (zalecane) lub Windows-1250
- Liczby dziesiętne: przecinek lub kropka (oba akceptowane)
- Puste wartości: dozwolone dla opcjonalnych pól

---

## 4. Import do Der-Mag Platform

### Przez interfejs webowy

1. Zaloguj się jako Manager lub Admin
2. Przejdź do: Menu → Materiały → Import
3. Kliknij "Wybierz plik" i wskaż plik CSV/Excel
4. Wybierz mapowanie kolumn:
   - "Symfonia Handel" (domyślne)
   - "Alternatywne (angielskie)"
   - "Własne mapowanie"
5. Kliknij "Importuj"
6. Sprawdź raport importu

### Przez API

```bash
curl -X POST http://localhost:3000/api/materials/stocks/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@stany_magazynowe.csv" \
  -F "mappingType=symfonia" \
  -F "delimiter=;"
```

---

## 5. Rozwiązywanie problemów

### Problem: Polskie znaki wyświetlają się nieprawidłowo

**Rozwiązanie:**
1. Otwórz plik w Notatniku
2. Zapisz jako → Kodowanie: UTF-8
3. Lub: W Symfonia wybierz eksport z kodowaniem UTF-8

### Problem: Nieprawidłowe rozpoznanie kolumn

**Rozwiązanie:**
1. Sprawdź nazwy kolumn w pierwszym wierszu
2. Usuń spacje przed/po nazwie kolumny
3. Użyj "Własne mapowanie" i wskaż prawidłowe kolumny

### Problem: Błędy w liczbach

**Rozwiązanie:**
1. Sprawdź separator dziesiętny (przecinek lub kropka)
2. Usuń spacje z liczb
3. Usuń znaki waluty (zł, PLN)

### Problem: Duplikaty

**Rozwiązanie:**
- System automatycznie aktualizuje istniejące rekordy po numerze katalogowym
- Sprawdź raport importu dla szczegółów

---

## Szybki start

1. **Eksport z Symfonia:**
   ```
   Magazyn → Stany magazynowe → Ctrl+E → CSV (separator: ;)
   ```

2. **Import do Der-Mag:**
   ```
   Materiały → Import → Wybierz plik → Importuj
   ```

3. **Weryfikacja:**
   ```
   Materiały → Stany magazynowe → Sprawdź zaimportowane dane
   ```

---

## Kontakt i wsparcie

W razie problemów skontaktuj się z administratorem systemu lub sprawdź dokumentację techniczną API.

**Data aktualizacji:** 2025-12-29  
**Wersja:** 1.0
