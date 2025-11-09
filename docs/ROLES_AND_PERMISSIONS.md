# Der-Mag Platform - System Ról i Uprawnień

**Wersja:** 2.0.0 (rozszerzona)  
**Data:** 2025-11-09  
**Liczba ról:** 6  

---

## 📋 Przegląd systemu

Der-Mag Platform wykorzystuje **Role-Based Access Control (RBAC)** z granularnymi uprawnieniami przechowywanymi w formacie JSON. System został rozszerzony z 4 do 6 ról w PR #2, aby lepiej odpowiadać wymaganiom biznesowym.

### Hierarchia ról:

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN                                │
│                    (pełny dostęp)                            │
│         ┌───────────────────────────────────┐               │
│         │    Zarządzanie systemem           │               │
│         │    Wszystkie operacje CRUD        │               │
│         │    Konfiguracja użytkowników      │               │
│         └───────────────────────────────────┘               │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   MANAGER    │  │  BOM EDITOR  │  │ COORDINATOR  │
│              │  │              │  │              │
│ Wszystkie    │  │ Zarządzanie  │  │ Tylko zadania│
│ typy zadań   │  │ materiałami  │  │   SERWIS     │
│ Użytkownicy  │  │ Integracja   │  │ Przypisania  │
│ Zatwierdzanie│  │ Symfonia     │  │ Aktualizacje │
└──────────────┘  └──────────────┘  └──────────────┘
        │               │                │
        └───────────────┼────────────────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
┌──────────────┐  ┌──────────────┐  
│ PREFABRICATOR│  │   WORKER     │  
│              │  │              │  
│ Rejestracja  │  │ Realizacja   │  
│ urządzeń     │  │ zadań        │  
│ Weryfikacja  │  │ Checklisty   │  
│ SN           │  │ Upload zdjęć │  
└──────────────┘  └──────────────┘  
```

---

## �� Szczegółowy opis ról

### 1. 🔑 Admin - Administrator Systemu

**Database name:** `admin`  
**Priorytet:** 1 (najwyższy)  
**Liczba użytkowników:** 1-2 (ograniczone)  

#### Uprawnienia:

```json
{
  "all": true
}
```

**Specjalne pole `all: true`** oznacza pełny dostęp do wszystkich funkcji systemu, niezależnie od innych ustawień uprawnień.

#### Możliwości:

✅ **Zadania:**
- Tworzenie wszystkich typów zadań (SMW, CSDIP, LAN, SERWIS, etc.)
- Edycja wszystkich zadań
- Usuwanie zadań (soft delete)
- Zmiana statusów
- Przypisywanie użytkowników
- Dostęp do historii zmian

✅ **Użytkownicy:**
- Tworzenie nowych użytkowników
- Edycja danych użytkowników
- Zmiana ról użytkowników
- Dezaktywacja kont
- Reset haseł
- Przeglądanie logów aktywności

✅ **System:**
- Konfiguracja typów zadań
- Zarządzanie szablonami BOM
- Zarządzanie szablonami aktywności
- Zarządzanie pulami IP
- Konfiguracja systemowa
- Backup i restore
- Dostęp do wszystkich raportów

✅ **BOM:**
- Tworzenie/edycja szablonów
- Zarządzanie kategoriami materiałów
- Import/export danych
- Synchronizacja z Symfonia

✅ **Kontrola jakości:**
- Zatwierdzanie/odrzucanie zdjęć
- Zarządzanie wymogami jakościowymi
- Dostęp do wszystkich zdjęć

#### Use Cases:

1. **Setup systemu:**
   ```
   Admin loguje się po raz pierwszy
   → Tworzy podstawowe typy zadań
   → Konfiguruje pule IP
   → Tworzy szablony BOM
   → Dodaje użytkowników (Manager, Koordynator, etc.)
   ```

2. **Zarządzanie kryzysowe:**
   ```
   Użytkownik zgłasza problem z dostępem
   → Admin resetuje hasło
   → Sprawdza logi aktywności
   → Weryfikuje uprawnienia roli
   ```

3. **Migracja danych:**
   ```
   Potrzeba importu starych zadań
   → Admin eksportuje dane z poprzedniego systemu
   → Mapuje dane na nowy format
   → Importuje przez API lub SQL
   ```

#### Ograniczenia:

⚠️ **Uwaga:** Admin ma pełny dostęp, ale z tym wiąże się odpowiedzialność:
- Wszystkie akcje są logowane
- Nie można usunąć samego siebie
- Zmiana hasła wymaga potwierdzenia emailem (planowane)
- Operacje krytyczne wymagają potwierdzenia

---

### 2. 📦 BOM Editor - Edytor Materiałów

**Database name:** `bom_editor`  
**Priorytet:** 2  
**Liczba użytkowników:** 1-3  
**Dodano w:** PR #2 (2025-11-09 01:40 UTC)  

#### Uprawnienia:

```json
{
  "bom": {
    "read": true,
    "create": true,
    "update": true,
    "delete": true
  },
  "users": {
    "read": true
  },
  "tasks": {
    "read": true
  }
}
```

#### Możliwości:

✅ **BOM Management:**
- Tworzenie nowych szablonów BOM dla typów zadań
- Edycja istniejących szablonów
- Usuwanie nieużywanych szablonów
- Zarządzanie kategoriami materiałów
- Definiowanie part numbers
- Ustawianie jednostek miary
- Oznaczanie materiałów wymagających SN

✅ **Materiały:**
- Przeglądanie zużycia materiałów per zadanie
- Aktualizacja szacowanych ilości
- Dodawanie nowych pozycji
- Import z systemu Symfonia (planowane)

✅ **Read-only:**
- Przeglądanie zadań (bez edycji)
- Przeglądanie listy użytkowników
- Dostęp do raportów materiałowych

❌ **Nie może:**
- Tworzyć/edytować zadań
- Zarządzać użytkownikami
- Zmieniać statusów zadań
- Przypisywać użytkowników
- Zatwierdzać zdjęć

#### Use Cases:

1. **Nowy typ zadania - przygotowanie BOM:**
   ```
   Manager tworzy nowy typ zadania "LAN Strukturalny Nowy"
   → BOM Editor otrzymuje powiadomienie
   → Tworzy szablon BOM dla nowego typu:
      * 100m kabel UTP Cat6
      * 50 szt. gniazd RJ45
      * 10 szt. patch panel 24-port
      * 5 szt. switch 24-port
   → Zapisuje szablon
   → Wszystkie nowe zadania tego typu otrzymują automatycznie BOM
   ```

2. **Synchronizacja z Symfonia:**
   ```
   BOM Editor uruchamia import z Symfonii
   → System pobiera aktualne ceny i dostępność
   → Aktualizuje part numbers
   → Mapuje produkty Symfonia → BOM templates
   → Generuje raport zmian
   ```

3. **Optymalizacja kosztów:**
   ```
   BOM Editor analizuje historyczne zużycie
   → Identyfikuje materiały często nadmiarowe
   → Redukuje szacowane ilości w szablonie
   → Monitoruje rzeczywiste zużycie
   → Dostosowuje szablony na bieżąco
   ```

#### Workflow diagram:

```
┌──────────────┐
│  BOM Editor  │
└──────┬───────┘
       │
       │ 1. Review materiałów
       ▼
┌──────────────┐
│   Szablon    │
│     BOM      │
└──────┬───────┘
       │
       │ 2. Aktualizacja
       ▼
┌──────────────┐       ┌──────────────┐
│   Symfonia   │◄──────│    Import    │
│     ERP      │       │   materiały  │
└──────────────┘       └──────────────┘
       │
       │ 3. Synchronizacja
       ▼
┌──────────────┐
│  Zadania     │
│  (auto-BOM)  │
└──────────────┘
```

---

### 3. 👨‍💼 Manager - Menedżer Projektów

**Database name:** `manager`  
**Priorytet:** 3  
**Liczba użytkowników:** 3-10  

#### Uprawnienia:

```json
{
  "tasks": {
    "read": true,
    "create": true,
    "update": true,
    "delete": true,
    "assign": true
  },
  "users": {
    "read": true,
    "create": true,
    "update": true
  },
  "bom": {
    "read": true,
    "update": true
  },
  "activities": {
    "read": true
  },
  "devices": {
    "read": true
  },
  "photos": {
    "read": true,
    "approve": true
  },
  "metrics": {
    "read": true
  }
}
```

#### Możliwości:

✅ **Pełne zarządzanie zadaniami:**
- Tworzenie **WSZYSTKICH** typów zadań:
  * SMW (System Monitoringu Wizyjnego)
  * CSDIP (Cyfrowe Systemy Dźwiękowe)
  * LAN PKP PLK
  * SMOK-IP/CMOK-IP (Wariant A i B)
  * SSWiN, SSP, SUG
  * Obiekty Kubaturowe
  * Kontrakty Liniowe
  * LAN Strukturalny
  * Zasilania
  * Struktury Światłowodowe
  * **SERWIS** ✅
- Edycja wszystkich pól zadania
- Usuwanie zadań (soft delete)
- Zmiana statusów przez cały workflow

✅ **Zarządzanie zespołem:**
- Tworzenie nowych użytkowników (Worker, Prefabricator)
- Edycja danych pracowników
- Przypisywanie użytkowników do zadań
- Przeglądanie performance zespołu

✅ **Kontrola jakości:**
- Zatwierdzanie zdjęć z terenu
- Odrzucanie zdjęć (z komentarzem)
- Wymaganie poprawek

✅ **BOM i materiały:**
- Przeglądanie zużycia materiałów
- Aktualizacja ilości użytych materiałów
- Dodawanie ad-hoc pozycji BOM

✅ **Raporty:**
- Dashboard z metrykami
- Statystyki per typ zadania
- Performance użytkowników
- Eksport do Excel (planowane)

❌ **Nie może:**
- Zarządzać systemem (Admin only)
- Tworzyć/usuwać typów zadań
- Tworzyć szablonów BOM (BOM Editor only)
- Zmieniać uprawnień użytkowników
- Dostęp do konfiguracji systemowej

#### Use Cases:

1. **Rozpoczęcie nowego projektu:**
   ```
   Manager otrzymuje zlecenie od PKP PLK
   → Tworzy zadanie typu "SMW"
   → Wypełnia dane:
      * Tytuł: "Montaż SMW Warszawa Centralna Peron 3"
      * Lokalizacja: "Warszawa Centralna"
      * Klient: "PKP PLK"
      * Planowany termin: 2025-11-15 - 2025-11-30
      * Priorytet: high
   → System automatycznie:
      * Generuje numer: 234567890
      * Przypisuje BOM z szablonu SMW
      * Alokuje pule IP
      * Tworzy checklistę aktywności
   → Manager przypisuje zespół:
      * 2x Worker (realizacja)
      * 1x Prefabricator (przygotowanie urządzeń)
   → Zadanie gotowe do realizacji
   ```

2. **Zarządzanie zadaniem serwisowym:**
   ```
   Manager lub Koordynator tworzy zadanie SERWIS
   → Tytuł: "Naprawa kamery SMW-CAM-042"
   → Typ: SERWIS
   → Opis problemu: "Brak obrazu z kamery nr 42"
   → Przypisuje Workera do diagnozy
   → Worker raportuje: "Uszkodzony zasilacz PoE"
   → Manager aktualizuje BOM: +1 zasilacz PoE
   → Worker wymienia zasilacz
   → Upload zdjęcia "przed" i "po"
   → Manager zatwierdza zdjęcia
   → Zmienia status: completed
   ```

3. **Zarządzanie zespołem:**
   ```
   Manager przegląda performance zespołu
   → User #15 ma 95% on-time completion
   → User #23 ma 60% on-time completion
   → Manager analizuje przyczyny:
      * User #23 ma bardziej skomplikowane zadania
      * User #23 pracuje sam, #15 w zespole
   → Manager dostosowuje przydział zadań
   → Przypisuje User #23 do mentora
   ```

#### Workflow typowego dnia:

```
08:00 - Login, sprawdzenie dashboardu
08:15 - Przegląd zadań w toku (status: in_progress)
08:30 - Utworzenie 2 nowych zadań (SMW, LAN)
09:00 - Przypisanie zespołów do zadań
09:30 - Zatwierdzenie zdjęć z wczorajszych zadań
10:00 - Meeting z klientem (nowe wymagania)
10:30 - Aktualizacja zadania (zmiana scope)
11:00 - Przegląd BOM i zamówienie materiałów
12:00 - Lunch break
13:00 - Przegląd raportów tygodniowych
14:00 - Zamknięcie 3 ukończonych zadań (status: completed)
15:00 - Utworzenie zadania serwisowego (awaria)
15:30 - Priorytetowe przypisanie (urgent)
16:00 - Podsumowanie dnia, plan na jutro
16:30 - Logout
```

---

### 4. 🛠 Coordinator - Koordynator Serwisu

**Database name:** `coordinator`  
**Priorytet:** 4  
**Liczba użytkowników:** 2-5  
**Dodano w:** PR #2 (2025-11-09 01:40 UTC)  

#### Uprawnienia:

```json
{
  "tasks": {
    "read": true,
    "update": true,
    "create": ["SERWIS"],
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

#### 🔑 Kluczowa cecha:

**Ograniczone tworzenie zadań:**
- Koordynator może tworzyć **TYLKO** zadania typu `SERWIS`
- Próba utworzenia innego typu (SMW, CSDIP, LAN, etc.) → **403 Forbidden**
- To jest jedyna rola z takim ograniczeniem
- Walidacja odbywa się w `TaskController.create()`

#### Możliwości:

✅ **Zadania serwisowe:**
- Tworzenie zadań typu SERWIS (naprawa, konserwacja, interwencje)
- Edycja zadań serwisowych
- Zmiana statusów
- Przypisywanie Workerów do serwisu

✅ **Zarządzanie serwisem:**
- Koordynacja interwencji awaryjnych
- Planowanie konserwacji prewencyjnej
- Śledzenie historii napraw
- Raportowanie usterek

✅ **Checklisty:**
- Przeglądanie checklisty serwisowej
- Oznaczanie aktywności jako wykonane
- Dodawanie notatek do aktywności

✅ **Read-only:**
- Przeglądanie wszystkich zadań (bez możliwości edycji nie-SERWIS)
- Przeglądanie użytkowników
- Przeglądanie urządzeń
- Przeglądanie zdjęć

❌ **Nie może:**
- Tworzyć zadań typu: SMW, CSDIP, LAN, etc. ❌ **403 Forbidden**
- Usuwać zadań
- Zatwierdzać zdjęć
- Zarządzać użytkownikami
- Edytować BOM templates

#### Walidacja uprawnień (kod):

```typescript
// src/controllers/TaskController.ts - create method
static async create(req: Request, res: Response): Promise<void> {
  try {
    const { taskTypeId } = req.body;
    
    // Pobierz użytkownika z rolą
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.userId },
      relations: ['role']
    });

    // Pobierz typ zadania
    const taskType = await AppDataSource.getRepository(TaskType).findOne({
      where: { id: taskTypeId }
    });

    // Specjalna walidacja dla Koordynator
    if (user?.role.name === 'coordinator') {
      const allowedTypes = user.role.permissions?.tasks?.create;
      
      // Sprawdź czy create jest tablicą
      if (!Array.isArray(allowedTypes)) {
        return res.status(403).json({
          success: false,
          message: 'Brak uprawnień do tworzenia zadań'
        });
      }

      // Sprawdź czy typ zadania jest na liście dozwolonych
      if (!allowedTypes.includes(taskType.code)) {
        return res.status(403).json({
          success: false,
          message: `Nie masz uprawnień do tworzenia zadań typu ${taskType.name}`,
          allowed_types: allowedTypes,
          attempted_type: taskType.code
        });
      }
    }

    // Kontynuuj tworzenie zadania...
    // ...
  }
}
```

#### Test scenarios:

**Test 1: Koordynator + SERWIS (powinno działać)**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $COORDINATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Naprawa kamery SMW-001",
    "taskTypeId": 14,
    "location": "Warszawa Centralna",
    "description": "Brak obrazu z kamery"
  }'

# Response: 201 Created ✅
{
  "success": true,
  "data": {
    "id": 42,
    "taskNumber": "345678901",
    "title": "Naprawa kamery SMW-001",
    "taskType": {
      "id": 14,
      "name": "Zadanie Serwisowe",
      "code": "SERWIS"
    },
    "status": "created"
  }
}
```

**Test 2: Koordynator + SMW (powinno zwrócić błąd)**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $COORDINATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Montaż SMW",
    "taskTypeId": 1,
    "location": "Gdańsk Główny"
  }'

# Response: 403 Forbidden ❌
{
  "success": false,
  "message": "Nie masz uprawnień do tworzenia zadań typu System Monitoringu Wizyjnego",
  "allowed_types": ["SERWIS"],
  "attempted_type": "SMW"
}
```

#### Use Cases:

1. **Zgłoszenie awarii:**
   ```
   08:30 - Telefon od stacji: "Kamera nr 5 nie działa"
   → Koordynator tworzy zadanie SERWIS
   → Tytuł: "Awaria kamery SMW-CAM-005"
   → Priorytet: urgent
   → Przypisuje najbliższego Workera
   → Worker jedzie na miejsce (30 min)
   → Diagnoza: uszkodzony kabel sieciowy
   → Worker wymienia kabel
   → Upload zdjęcia
   → Koordynator zamyka zadanie
   → Czas reakcji: 2h
   ```

2. **Konserwacja prewencyjna:**
   ```
   Koordynator planuje konserwację kwartalną
   → Tworzy 15 zadań SERWIS (po 1 dla każdej stacji)
   → Typ: konserwacja rutynowa
   → Checklist:
      * Czyszczenie obiektywów kamer
      * Sprawdzenie połączeń
      * Test nagrywania
      * Sprawdzenie miejsca na dysku
   → Przypisuje zespół po 2 Workerów
   → Planowany termin: tydzień
   → Monitoruje postęp
   → Wszystkie zadania completed ✅
   ```

3. **Koordynator próbuje stworzyć LAN (error):**
   ```
   Koordynator dostaje request: "Utwórz zadanie LAN"
   → Próbuje utworzyć przez interfejs
   → System blokuje: "Nie masz uprawnień do tworzenia zadań typu LAN PKP PLK"
   → Koordynator kontaktuje Managera
   → Manager tworzy zadanie LAN
   → Koordynator może je tylko przeglądać
   ```

---

### 5. 🔧 Prefabricator - Prefabrykant

**Database name:** `prefabricator`  
**Priorytet:** 5  
**Liczba użytkowników:** 2-4  
**Dodano w:** PR #2 (2025-11-09 01:40 UTC)  

#### Uprawnienia:

```json
{
  "devices": {
    "read": true,
    "create": true,
    "update": true,
    "verify": true
  },
  "bom": {
    "read": true
  },
  "tasks": {
    "read": true
  }
}
```

#### Możliwości:

✅ **Urządzenia:**
- Rejestracja nowych urządzeń z numerami seryjnymi
- Edycja danych urządzeń
- Weryfikacja SN po prefabrykacji
- Przypisywanie urządzeń do zadań
- Skanowanie QR/barcode (mobile app)

✅ **Prefabrykacja:**
- Przygotowanie urządzeń przed montażem
- Konfiguracja wstępna
- Testowanie funkcjonalności
- Nadawanie numerów inwentarzowych

✅ **BOM:**
- Przeglądanie listy materiałów dla zadania
- Sprawdzanie dostępności komponentów
- Raportowanie brakujących pozycji

✅ **Zadania:**
- Przeglądanie zadań (read-only)
- Sprawdzanie wymagań sprzętowych

❌ **Nie może:**
- Tworzyć/edytować zadań
- Zmieniać statusów zadań
- Zarządzać użytkownikami
- Zatwierdzać zdjęć
- Edytować BOM templates

#### Use Cases:

1. **Prefabrykacja kamer SMW:**
   ```
   Prefabricator otrzymuje zadanie #123456789 (SMW)
   → Sprawdza BOM:
      * 12x Kamera IP Axis P3375-V
      * 1x Switch PoE 24-port
      * 1x Rejestrator NVR
   → Pobiera urządzenia z magazynu
   → Dla każdej kamery:
      * Skanuje SN przez aplikację mobile
      * Rejestruje w systemie (POST /api/devices/serial)
      * Konfiguruje IP statyczne
      * Testuje obraz
      * Weryfikuje (PUT /api/devices/{id}/verify)
   → Wszystkie 12 kamer gotowe ✅
   → Worker może je zabrać na montaż
   ```

2. **Weryfikacja SN:**
   ```
   Worker zgłasza problem: "Kamera SN123 nie działa"
   → Prefabricator sprawdza:
      * GET /api/devices/SN123
      * Status: verified ✅
      * Data weryfikacji: 2025-11-05
      * Weryfikował: Prefabricator Jan Kowalski
   → Problem musi być w montażu, nie w sprzęcie
   → Prefabricator komunikuje Workerowi: "Sprzęt OK, sprawdź połączenia"
   ```

3. **Przygotowanie sprzętu awaryjnego:**
   ```
   Prefabricator prowadzi zapas urządzeń "gotowych"
   → Co tydzień przygotowuje:
      * 5x kamera IP (prefabrykowane, zweryfikowane)
      * 2x switch PoE (skonfigurowane)
      * 3x zasilacz (przetestowane)
   → W razie awarii:
      * Coordinator tworzy SERWIS
      * Worker bierze gotowy sprzęt
      * Wymiana trwa 30 min zamiast 2h
   ```

#### Workflow prefabrykacji:

```
┌──────────────┐
│  Magazyn     │
│  (sprzęt)    │
└──────┬───────┘
       │
       │ 1. Pobranie sprzętu
       ▼
┌──────────────┐       ┌──────────────┐
│ Prefabricator│       │  Mobile App  │
│              │◄──────│  QR Scanner  │
└──────┬───────┘       └──────────────┘
       │
       │ 2. Skanowanie SN
       ▼
┌──────────────┐
│   Backend    │
│   API        │
│ POST /devices│
└──────┬───────┘
       │
       │ 3. Konfiguracja
       ▼
┌──────────────┐
│   Urządzenie │
│ (IP, VLAN)   │
└──────┬───────┘
       │
       │ 4. Testowanie
       ▼
┌──────────────┐
│  Weryfikacja │
│ PUT /verify  │
└──────┬───────┘
       │
       │ 5. Gotowe do montażu
       ▼
┌──────────────┐
│   Worker     │
│  (montaż)    │
└──────────────┘
```

---

### 6. 👷 Worker - Pracownik Terenowy

**Database name:** `worker`  
**Priorytet:** 6 (najniższy)  
**Liczba użytkowników:** 10-50  
**Poprzednia nazwa:** `technician` (zmieniono w PR #2)  

#### Uprawnienia:

```json
{
  "tasks": {
    "read": true,
    "update": true
  },
  "activities": {
    "read": true,
    "update": true
  },
  "photos": {
    "create": true
  },
  "devices": {
    "read": true,
    "update": true
  }
}
```

#### Możliwości:

✅ **Realizacja zadań:**
- Przeglądanie przypisanych zadań
- Aktualizacja statusu (started, in_progress, completed)
- Dodawanie notatek
- Raportowanie problemów

✅ **Checklisty:**
- Przeglądanie aktywności dla zadania
- Oznaczanie aktywności jako wykonane
- Dodawanie zdjęć do aktywności
- Dodawanie komentarzy

✅ **Zdjęcia:**
- Upload zdjęć z terenu (mobile app)
- Automatyczne GPS z EXIF
- Przypisywanie do aktywności
- Dokumentacja montażu/naprawy

✅ **Urządzenia:**
- Przeglądanie urządzeń dla zadania
- Aktualizacja statusu instalacji
- Raportowanie uszkodzeń
- Skanowanie SN (weryfikacja na miejscu)

❌ **Nie może:**
- Tworzyć nowych zadań
- Usuwać zadań
- Przypisywać innych użytkowników
- Edytować BOM
- Zatwierdzać własnych zdjęć (Manager only)
- Zmieniać uprawnień

#### Use Cases:

1. **Typowy dzień Workera:**
   ```
   07:00 - Login do mobile app
   07:15 - Sprawdzenie przypisanych zadań (GET /api/tasks/my)
          → 3 zadania na dziś:
            1. Montaż SMW Warszawa (status: assigned)
            2. Naprawa SERWIS Gdańsk (status: assigned)
            3. Testowanie CSDIP Kraków (status: in_progress)
   
   08:00 - Przyjazd na Warszawa Centralna
   08:05 - Zmiana statusu: started (PATCH /api/tasks/123456789/status)
   08:30 - Checklist - krok 1: "Montaż kamery" ✅
          (POST /api/activities/15/complete)
   09:00 - Upload zdjęcia kamery (POST /api/quality/photos)
          → GPS: 52.2297, 21.0122 (automatycznie z EXIF)
   09:30 - Checklist - krok 2: "Podłączenie kabli" ✅
   10:00 - Checklist - krok 3: "Test obrazu" ✅
   10:30 - Wszystkie aktywności wykonane
   10:35 - Zmiana statusu: completed
   
   11:00 - Przerwa na kawę
   11:30 - Przyjazd do Gdańsk (SERWIS)
   11:35 - Zmiana statusu: started
   12:00 - Diagnoza: uszkodzony zasilacz
   12:05 - Notatka: "Wymiana zasilacza PoE wymagana"
   12:30 - Wymiana zasilacza
   12:45 - Upload zdjęcia "przed" i "po"
   13:00 - Test działania: OK ✅
   13:05 - Zmiana statusu: completed
   
   14:00 - Lunch break
   15:00 - Testowanie w Kraków (kontynuacja z wczoraj)
   15:30 - Finalizacja testów
   16:00 - Zmiana statusu: completed
   16:30 - Wyjazd do bazy
   17:00 - Logout
   ```

2. **Problem w terenie:**
   ```
   Worker na montażu SMW
   → Sprawdza BOM: potrzebne 12 kamer
   → W magazynie prefabrykanta tylko 10
   → Worker dodaje notatkę: "Brak 2 kamer, kontynuacja niemożliwa"
   → Zmienia status: on_hold (blocked)
   → Manager otrzymuje powiadomienie
   → Manager zamawia 2 kamery
   → 2 dni później: kamery dostarczone
   → Manager zmienia status: assigned
   → Worker kontynuuje montaż
   ```

3. **Urgent SERWIS:**
   ```
   11:30 - Worker dostaje push notification
          "URGENT: Awaria kamery Warszawa, zadanie #999888777"
   → Worker sprawdza lokalizację: 15 min jazdy
   → Worker kończy obecne zadanie (5 min)
   → 11:40 - Wyjazd na interwencję
   → 11:55 - Na miejscu
   → 12:00 - Zmiana statusu: started
   → 12:10 - Diagnoza: kabel uszkodzony
   → 12:30 - Wymiana kabla
   → 12:40 - Test: kamera działa ✅
   → 12:45 - Upload zdjęcia
   → 12:50 - Zmiana statusu: completed
   → Total: 1h 20 min od zgłoszenia do naprawy
   ```

#### Mobile App Features (React Native):

```
📱 Der-Mag Worker App

┌─────────────────────────┐
│  🏠 Moje Zadania (3)    │
├─────────────────────────┤
│ 📍 Warszawa Centralna   │
│ SMW - Montaż            │
│ Status: assigned        │
│ [START] [DETAILS]       │
├─────────────────────────┤
│ 🔧 Gdańsk Główny        │
│ SERWIS - Naprawa        │
│ Status: assigned        │
│ [START] [DETAILS]       │
├─────────────────────────┤
│ ✅ Kraków Główny        │
│ CSDIP - Test            │
│ Status: in_progress     │
│ [CONTINUE] [DETAILS]    │
└─────────────────────────┘

┌─────────────────────────┐
│  📋 Checklist (5/8)     │
├─────────────────────────┤
│ ✅ Montaż kamery        │
│ ✅ Podłączenie kabli    │
│ ✅ Konfiguracja IP      │
│ ✅ Test połączenia      │
│ ✅ Test obrazu          │
│ ☐ Dokumentacja foto     │
│ ☐ Testy końcowe         │
│ ☐ Odbiór klienta        │
└─────────────────────────┘

┌─────────────────────────┐
│  📸 Zdjęcia (3)         │
├─────────────────────────┤
│ [CAMERA] [GALLERY]      │
│                         │
│ 🏞️ photo_001.jpg       │
│ 📍 52.2297, 21.0122    │
│ ⏰ 09:00                │
│                         │
│ 🏞️ photo_002.jpg       │
│ 📍 52.2298, 21.0125    │
│ ⏰ 09:30                │
└─────────────────────────┘
```

---

## 🔐 Permission Matrix

### Tabela uprawnień (wszystkie role):

| Funkcja | Admin | Manager | BOM Editor | Coordinator | Prefabricator | Worker |
|---------|-------|---------|------------|-------------|---------------|--------|
| **Zadania - Read** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| **Zadania - Create All** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Zadania - Create SERWIS** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Zadania - Update** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (own) |
| **Zadania - Delete** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Zadania - Assign** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Users - Read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Users - Create** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users - Update** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **BOM - Read** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **BOM - Create** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **BOM - Update** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **BOM - Delete** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Devices - Read** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Devices - Create** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Devices - Update** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Devices - Verify** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Activities - Read** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Activities - Update** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Photos - Read** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (own) |
| **Photos - Create** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Photos - Approve** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Metrics - Read** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **System Config** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legenda:**
- ✅ = Pełny dostęp
- ✅ (own) = Dostęp tylko do własnych
- ❌ = Brak dostępu

---

## 🧪 Testing Scenarios

### Scenariusz 1: Kompletny workflow zadania SMW

```
1. Manager tworzy zadanie SMW
   POST /api/tasks
   Auth: Bearer <MANAGER_TOKEN>
   Response: 201 ✅

2. Manager przypisuje zespół
   POST /api/tasks/123456789/assign
   Body: { userIds: [5, 7, 12] }
   Response: 200 ✅

3. Prefabricator przygotowuje sprzęt
   POST /api/devices/serial
   Auth: Bearer <PREFAB_TOKEN>
   Response: 201 ✅
   
   PUT /api/devices/42/verify
   Response: 200 ✅

4. Worker rozpoczyna montaż
   PATCH /api/tasks/123456789/status
   Auth: Bearer <WORKER_TOKEN>
   Body: { status: "started" }
   Response: 200 ✅

5. Worker wykonuje checklistę
   POST /api/activities/15/complete
   Response: 200 ✅
   
   POST /api/activities/16/complete
   Response: 200 ✅

6. Worker uploaduje zdjęcia
   POST /api/quality/photos
   Response: 201 ✅

7. Worker kończy zadanie
   PATCH /api/tasks/123456789/status
   Body: { status: "completed" }
   Response: 200 ✅

8. Manager zatwierdza zdjęcia
   PUT /api/quality/photos/88/approve
   Auth: Bearer <MANAGER_TOKEN>
   Response: 200 ✅
```

### Scenariusz 2: Koordynator - ograniczenia

```
1. Koordynator próbuje utworzyć SMW
   POST /api/tasks
   Auth: Bearer <COORDINATOR_TOKEN>
   Body: {
     "title": "Montaż SMW",
     "taskTypeId": 1
   }
   Response: 403 ❌
   Message: "Nie masz uprawnień do tworzenia zadań typu System Monitoringu Wizyjnego"

2. Koordynator tworzy SERWIS
   POST /api/tasks
   Body: {
     "title": "Naprawa kamery",
     "taskTypeId": 14
   }
   Response: 201 ✅

3. Koordynator przypisuje Workera
   POST /api/tasks/345678901/assign
   Body: { userIds: [7] }
   Response: 200 ✅

4. Koordynator aktualizuje checklist
   POST /api/activities/20/complete
   Response: 200 ✅

5. Koordynator próbuje zatwierdzić zdjęcie
   PUT /api/quality/photos/99/approve
   Response: 403 ❌
   Message: "Brak uprawnień"
```

---

## 📊 Statistics

**Utworzone role:** 6  
**Dodane w PR #2:** 3 (BOM Editor, Coordinator, Prefabricator)  
**Zmienione nazwy:** 1 (Technician → Worker)  
**Granularne uprawnienia:** Wszystkie 6 ról  
**Format permissions:** JSONB  
**Total permission keys:** ~15 różnych uprawnień  

---

**Dokument zakończony:** 2025-11-09  
**Wersja systemu ról:** 2.0.0  

*Copyright © 2025 Der-Mag. All rights reserved.*
