# Implementacja: Koordynator i Zadania Serwisowe

## Przegląd zmian

Implementacja dodaje nową rolę **koordynatora** oraz typ zadania **SERWIS** z ograniczeniami uprawnień do tworzenia zadań.

## 1. Nowy typ zadania: SERWIS

### Właściwości:
- **Kod**: `SERWIS`
- **Nazwa**: `Zadanie Serwisowe`
- **Opis**: `Naprawa, konserwacja i interwencje serwisowe`
- **Konfiguracja**: 
  - `has_bom`: true (obsługa materiałów BOM)
  - `has_ip_config`: false (brak zarządzania adresami IP)

### Szablony BOM (10 pozycji):
1. Kabel UTP Cat5e - 10m (2 szt.)
2. Kabel UTP Cat5e - 20m (2 szt.)
3. Kabel UTP Cat5e - 50m (1 szt.)
4. Złączki RJ45 (10 szt.)
5. Opaski zaciskowe 200mm (50 szt.)
6. Opaski zaciskowe 300mm (20 szt.)
7. Taśma izolacyjna (2 szt.)
8. Rękawiczki robocze (2 pary)
9. Śrubki montażowe M6 (10 szt.)
10. Kołki rozporowe (10 szt.)

### Szablony aktywności (4 kroki):
1. **Diagnoza problemu** - Identyfikacja i diagnoza usterki (wymaga 1 zdjęcie)
2. **Naprawa lub wymiana** - Wykonanie naprawy lub wymiany elementów (wymaga 2 zdjęcia)
3. **Testy funkcjonalne** - Przeprowadzenie testów poprawności działania
4. **Dokumentacja prac** - Sporządzenie dokumentacji wykonanych prac (wymaga 1 zdjęcie)

## 2. Nowa rola: coordinator (Koordynator)

### Uprawnienia:
```json
{
  "tasks": {
    "read": true,
    "update": true,
    "create": ["SERWIS"],  // OGRANICZENIE: tylko zadania SERWIS
    "assign": true
  },
  "users": {
    "read": true
  },
  "activities": {
    "read": true,
    "update": true
  },
  "devices": {
    "read": true
  },
  "photos": {
    "read": true
  }
}
```

### Co może robić koordynator:
✅ Tworzyć zadania typu SERWIS
✅ Aktualizować zadania
✅ Przypisywać użytkowników do zadań
✅ Przeglądać użytkowników, urządzenia, aktywności
✅ Przeglądać zdjęcia kontroli jakości

### Czego NIE może robić koordynator:
❌ Tworzyć zadania typu SMW, CSDIP, itp.
❌ Usuwać zadania
❌ Zarządzać użytkownikami (tworzenie, edycja, usuwanie)

## 3. Logika autoryzacji

### TaskController.create - walidacja typu zadania

```typescript
static async create(req: Request, res: Response): Promise<void> {
  try {
    const { taskTypeId } = req.body;
    const user = req.user;

    // Sprawdź uprawnienia koordynatora do tworzenia zadań
    if (user?.role === 'coordinator') {
      // Pobierz typ zadania
      const taskTypeRepository = AppDataSource.getRepository(TaskType);
      const taskType = await taskTypeRepository.findOne({
        where: { id: taskTypeId, active: true }
      });

      if (!taskType) {
        res.status(404).json({
          success: false,
          message: 'Typ zadania nie znaleziony'
        });
        return;
      }

      // Koordynator może tworzyć tylko zadania typu SERWIS
      if (taskType.code !== 'SERWIS') {
        res.status(403).json({
          success: false,
          message: 'Koordynator może tworzyć tylko zadania serwisowe'
        });
        return;
      }
    }

    // Kontynuuj tworzenie zadania...
  }
}
```

### Błąd 403 - przykład odpowiedzi

Gdy koordynator próbuje utworzyć zadanie typu SMW:

```json
{
  "success": false,
  "message": "Koordynator może tworzyć tylko zadania serwisowe"
}
```

## 4. Zmiany w routach

### task.routes.ts

Przed:
```typescript
router.post('/', authenticate, authorize('admin', 'manager'), ...);
```

Po:
```typescript
router.post('/', authenticate, authorize('admin', 'manager', 'coordinator'), ...);
```

Koordynator ma dostęp do endpointów:
- POST `/api/tasks` - tworzenie zadań (z walidacją typu w kontrolerze)
- PUT `/api/tasks/:taskNumber` - aktualizacja zadań
- POST `/api/tasks/:taskNumber/assign` - przypisywanie użytkowników

## 5. Pliki zmodyfikowane

1. **backend/scripts/add-service-tasks.sql** (NOWY)
   - Migracja dodająca typ SERWIS
   - Dodanie roli koordynator
   - 10 szablonów BOM dla zadań serwisowych
   - 4 szablony aktywności

2. **backend/scripts/seed-data.sql**
   - Dodano rolę coordinator w sekcji ról
   - Dodano typ zadania SERWIS w sekcji typów zadań
   - Zaktualizowano konfigurację wszystkich typów zadań

3. **backend/src/controllers/TaskController.ts**
   - Dodano import `TaskType`
   - Dodano walidację roli koordynatora w metodzie `create`
   - Sprawdzanie kodu typu zadania przed utworzeniem

4. **backend/src/routes/task.routes.ts**
   - Dodano 'coordinator' do listy autoryzowanych ról
   - Trzy endpointy: create, update, assign

5. **backend/API_TESTING.md**
   - Dokumentacja wszystkich ról
   - Lista 14 typów zadań z ID
   - Przykłady tworzenia zadań SERWIS
   - Przykłady błędów autoryzacji

## 6. Testowanie

### Scenariusz 1: Koordynator tworzy zadanie SERWIS ✅

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"koordynator","password":"password"}' \
  | jq -r '.data.accessToken')

curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Naprawa kamery",
    "taskTypeId": 14,
    "location": "Warszawa"
  }'
```

**Oczekiwany wynik**: 201 Created - zadanie utworzone pomyślnie

### Scenariusz 2: Koordynator próbuje utworzyć zadanie SMW ❌

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Montaż SMW",
    "taskTypeId": 1,
    "location": "Warszawa"
  }'
```

**Oczekiwany wynik**: 403 Forbidden
```json
{
  "success": false,
  "message": "Koordynator może tworzyć tylko zadania serwisowe"
}
```

### Scenariusz 3: Manager tworzy dowolny typ zadania ✅

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager","password":"password"}' \
  | jq -r '.data.accessToken')

# Może utworzyć SMW
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Montaż SMW", "taskTypeId": 1, "location": "Warszawa"}'

# Może utworzyć SERWIS
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Naprawa", "taskTypeId": 14, "location": "Warszawa"}'
```

**Oczekiwany wynik**: Oba żądania zwracają 201 Created

## 7. Bezpieczeństwo

### Analiza CodeQL: ✅ PASSED
- Brak wykrytych luk bezpieczeństwa
- Brak injection vulnerabilities
- Właściwa walidacja wejść

### Weryfikacja TypeScript: ✅ PASSED
- Kompilacja bez błędów
- Wszystkie typy poprawnie zdefiniowane

### Najlepsze praktyki:
✅ Walidacja na poziomie kontrolera
✅ Komunikaty błędów w języku polskim
✅ Sprawdzanie aktywności typu zadania
✅ Obsługa błędów 404 dla nieistniejących typów
✅ Logika autoryzacji oparta na rolach

## 8. Uruchomienie migracji

```bash
# Połącz się z bazą danych
psql -U dermag_user -d dermag_platform

# Wykonaj migrację
\i backend/scripts/add-service-tasks.sql

# Lub przy pierwszym uruchomieniu systemu
\i backend/scripts/seed-data.sql
```

## 9. Podsumowanie

### Zalety implementacji:
- ✅ Minimalne zmiany w kodzie
- ✅ Bezpieczna implementacja z walidacją
- ✅ Kompletna dokumentacja
- ✅ Wszystkie komunikaty w języku polskim
- ✅ Szablony BOM i aktywności gotowe do użycia
- ✅ Brak regresji - istniejąca funkcjonalność nie została zmieniona

### Kompatybilność:
- ✅ Zgodność wsteczna - istniejące role działają bez zmian
- ✅ Istniejące typy zadań niezmienione
- ✅ API pozostaje kompatybilne

### Następne kroki:
1. Uruchomić migrację w środowisku deweloperskim
2. Utworzyć użytkownika z rolą coordinator
3. Przetestować wszystkie scenariusze
4. Wdrożyć na środowisko produkcyjne
