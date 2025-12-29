# 🔄 Przewodnik migracji danych do Der-Mag Platform

## Spis treści
1. [Migracja z istniejących systemów](#migracja-z-istniejących-systemów)
2. [Przygotowanie danych](#przygotowanie-danych)
3. [Skrypty migracyjne](#skrypty-migracyjne)
4. [Weryfikacja migracji](#weryfikacja-migracji)
5. [Rollback i troubleshooting](#rollback-i-troubleshooting)

---

## 1. Migracja z istniejących systemów

### Wspierane źródła danych

- **Symfonia Handel** - eksport CSV/Excel
- **Excel/Calc** - arkusze kalkulacyjne
- **CSV** - pliki tekstowe z danymi
- **Istniejące bazy danych** - przez export do CSV

---

## 2. Przygotowanie danych

### Z Symfonia Handel

1. **Eksportuj stany magazynowe do CSV**
   - Szczegółowa instrukcja: [SYMFONIA_EXPORT_GUIDE.md](SYMFONIA_EXPORT_GUIDE.md)
   - Format: CSV z separatorem średnik (;)
   - Kodowanie: UTF-8

2. **Eksportuj kartotekę towarów**
   - Menu: Słowniki → Towary → Eksport
   - Upewnij się że eksportujesz wszystkie wymagane kolumny

3. **Uporządkuj numery katalogowe**
   - Usuń duplikaty
   - Ujednolic format (np. MAT-001 vs MAT001)

### Z arkuszy Excel

1. **Ustandaryzuj nazwy kolumn**
   ```
   Wymagane:
   - Indeks / PartNumber
   - Nazwa / Name
   
   Opcjonalne:
   - Stan / Quantity
   - JM / Unit
   - Cena / Price
   - Magazyn / Warehouse
   - Dostawca / Supplier
   ```

2. **Usuń formatowanie**
   - Usuń kolory, ramki, scalanie komórek
   - Usuń formuły - zostaw tylko wartości
   - Usuń puste wiersze

3. **Zapisz jako CSV lub XLSX**
   - CSV: separator średnik (;), UTF-8
   - XLSX: standardowy format Excel

### Przykładowy format CSV

```csv
Indeks;Nazwa;Stan;JM;Cena;Magazyn;Dostawca
CAB-001;Kabel UTP Cat6 305m;150;szt;250.00;MAG-01;Elektro-Kabel
CAM-001;Kamera IP Dome 4MP;50;szt;450.00;MAG-03;Hikvision
SW-001;Switch PoE 24-port;10;szt;1200.00;MAG-02;Cisco
```

---

## 3. Skrypty migracyjne

### Skrypt 1: migrate-materials.ts

Importuje materiały z pliku CSV.

**Przygotowanie:**

1. Umieść plik CSV w `backend/scripts/data/materials_migration.csv`
2. Upewnij się że plik zawiera nagłówki kolumn
3. Sprawdź kodowanie (UTF-8)

**Uruchomienie:**

```bash
cd backend
npm install  # jeśli jeszcze nie zainstalowano
npx ts-node scripts/migrate-materials.ts
```

**Output:**
```
🚀 Rozpoczynam migrację materiałów...

📊 Znaleziono 150 wierszy do przetworzenia

✅ Dodano: MAT-001 - Kabel UTP Cat6 305m
✅ Dodano: MAT-002 - Gniazdo RJ45 Cat6
🔄 Zaktualizowano: MAT-003 - Patch panel 24-port
...

✅ Migracja zakończona!
   📥 Zaimportowano: 120
   🔄 Zaktualizowano: 25
   ❌ Błędów: 5
```

### Skrypt 2: seed-material-stocks.ts

Dodaje przykładowe dane testowe.

**Uruchomienie:**

```bash
cd backend
npx ts-node scripts/seed-material-stocks.ts
```

Ten skrypt dodaje 15 przykładowych materiałów do celów testowych i demonstracyjnych.

### Import przez API

**Endpoint:**
```
POST /api/materials/stocks/import
```

**cURL:**
```bash
# Zdobądź token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.token')

# Importuj plik
curl -X POST http://localhost:3000/api/materials/stocks/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@stany_magazynowe.csv" \
  -F "mappingType=symfonia" \
  -F "delimiter=;"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "importLog": {
      "id": 1,
      "fileName": "stany_magazynowe.csv",
      "status": "completed"
    },
    "imported": 120,
    "updated": 25,
    "errors": 5
  }
}
```

---

## 4. Weryfikacja migracji

### 1. Sprawdź liczbę zaimportowanych rekordów

**SQL:**
```sql
SELECT COUNT(*) as total,
       source,
       is_active
FROM material_stocks
GROUP BY source, is_active;
```

**API:**
```bash
curl -X GET "http://localhost:3000/api/materials/stocks?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Porównaj sumy stanów

**SQL:**
```sql
SELECT 
  warehouse_location,
  COUNT(*) as items_count,
  SUM(quantity_available) as total_quantity,
  SUM(quantity_available * unit_price) as total_value
FROM material_stocks
WHERE is_active = true
GROUP BY warehouse_location;
```

### 3. Zweryfikuj losowo wybrane pozycje

Wybierz 10-20 losowych materiałów i porównaj je z danymi źródłowymi:

**SQL:**
```sql
SELECT part_number, name, quantity_available, unit_price, warehouse_location
FROM material_stocks
WHERE is_active = true
ORDER BY RANDOM()
LIMIT 20;
```

### 4. Sprawdź błędy importu

**API:**
```bash
curl -X GET "http://localhost:3000/api/materials/stocks/import-history" \
  -H "Authorization: Bearer $TOKEN"
```

**Szczegóły konkretnego importu:**
```bash
curl -X GET "http://localhost:3000/api/materials/stocks/import/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Rollback i troubleshooting

### Rollback całej migracji

**SQL:**
```sql
-- Usuń wszystkie zaimportowane materiały
DELETE FROM material_stocks 
WHERE source = 'csv_import' 
  AND last_import_file = 'materials_migration.csv';

-- Lub oznacz jako nieaktywne
UPDATE material_stocks 
SET is_active = false
WHERE source = 'csv_import' 
  AND last_import_file = 'materials_migration.csv';
```

### Rollback konkretnego importu

**SQL:**
```sql
-- Znajdź ID importu
SELECT id, file_name, imported_rows, created_at 
FROM material_import_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Usuń materiały z tego importu
DELETE FROM material_stocks 
WHERE last_import_file = 'nazwa_pliku.csv'
  AND last_import_at = '2025-12-29 10:00:00';
```

### Problemy i rozwiązania

#### Problem 1: Duplikaty numerów katalogowych

**Symptom:**
```
Error: duplicate key value violates unique constraint "IDX_..."
```

**Rozwiązanie:**
1. Znajdź duplikaty w pliku źródłowym
2. Usuń lub zmień numery katalogowe
3. Ponownie importuj

**SQL do znajdowania duplikatów:**
```sql
SELECT part_number, COUNT(*) 
FROM material_stocks 
GROUP BY part_number 
HAVING COUNT(*) > 1;
```

#### Problem 2: Błędne kodowanie

**Symptom:**
```
Polskie znaki wyświetlają się jako: Ä™Å¼Ã³Å
```

**Rozwiązanie:**
1. Otwórz plik w edytorze tekstowym
2. Zapisz jako UTF-8 (z BOM)
3. Ponownie importuj

#### Problem 3: Błędne typy danych

**Symptom:**
```
Error: invalid input syntax for type numeric
```

**Rozwiązanie:**
1. Sprawdź separator dziesiętny (przecinek vs kropka)
2. Usuń znaki niebędące cyframi (zł, $, spacje)
3. Napraw i ponownie importuj

#### Problem 4: Brakujące kolumny

**Symptom:**
```
Część materiałów została pominięta
```

**Rozwiązanie:**
1. Sprawdź raport importu dla szczegółów
2. Dodaj brakujące kolumny w pliku CSV
3. Użyj "własnego mapowania" kolumn

---

## Przykładowy workflow migracji

```bash
# 1. Przygotuj dane
# - Wyeksportuj z Symfonia do CSV
# - Umieść w backend/scripts/data/materials_migration.csv

# 2. Zrób backup bazy danych
pg_dump dermag_platform > backup_$(date +%Y%m%d).sql

# 3. Uruchom migrację
cd backend
npx ts-node scripts/migrate-materials.ts

# 4. Zweryfikuj wyniki
npx ts-node -e "
  import { AppDataSource } from './src/config/database';
  import { MaterialStock } from './src/entities/MaterialStock';
  
  AppDataSource.initialize().then(async () => {
    const repo = AppDataSource.getRepository(MaterialStock);
    const count = await repo.count({ where: { isActive: true } });
    console.log('Aktywnych materiałów:', count);
    await AppDataSource.destroy();
  });
"

# 5. W razie problemów - rollback
psql dermag_platform < backup_20251229.sql
```

---

## Migracja inkrementalna

Jeśli chcesz importować dane w partiach:

1. **Podziel plik źródłowy**
```bash
split -l 1000 materials.csv material_part_
```

2. **Importuj w partiach**
```bash
for file in material_part_*; do
  echo "Importuję $file"
  cp "$file" backend/scripts/data/materials_migration.csv
  npx ts-node backend/scripts/migrate-materials.ts
  sleep 2
done
```

3. **Monitoruj postęp**
```sql
SELECT source, COUNT(*), MAX(last_import_at) 
FROM material_stocks 
GROUP BY source;
```

---

## Checklisty

### Pre-migration checklist
- [ ] Backup bazy danych utworzony
- [ ] Plik CSV/Excel przygotowany i zweryfikowany
- [ ] Kodowanie UTF-8 potwierdzone
- [ ] Duplikaty usunięte
- [ ] Testowa migracja na środowisku dev zakończona sukcesem

### Post-migration checklist
- [ ] Liczba rekordów poprawna
- [ ] Sumy stanów magazynowych się zgadzają
- [ ] Losowa weryfikacja danych zakończona
- [ ] Raport błędów przeanalizowany
- [ ] Błędy naprawione lub udokumentowane
- [ ] Backup zachowany na wypadek rollback

---

## Kontakt

W razie problemów lub pytań:
- Sprawdź logi importu w systemie
- Przejrzyj szczegóły błędów w raporcie importu
- Skontaktuj się z administratorem systemu

**Data aktualizacji:** 2025-12-29  
**Wersja:** 1.0
