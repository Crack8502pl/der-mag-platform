# Der-Mag Platform - API Testing Guide

Przewodnik testowania API dla platformy Der-Mag.

## 🔧 Wymagania wstępne

1. **Uruchomiony serwer backend**
```bash
cd backend
npm install
npm run dev
```

2. **Narzędzia do testowania**
- curl (command line)
- Postman
- Insomnia
- lub dowolny klient HTTP

## 🔐 1. Uwierzytelnianie

### Login - uzyskanie tokenu

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }'
```

**Odpowiedź:**
```json
{
  "success": true,
  "message": "Zalogowano pomyślnie",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@dermag.lan",
      "firstName": "Administrator",
      "lastName": "Systemu",
      "role": "admin"
    }
  }
}
```

**Zapisz `accessToken` - będzie potrzebny do wszystkich następnych żądań!**

## 🔑 Role użytkowników

System obsługuje następujące role:

### Admin
- Pełne uprawnienia do wszystkich funkcji systemu
- Może tworzyć wszystkie typy zadań
- Zarządza użytkownikami i ustawieniami systemu

### Manager (Menedżer)
- Zarządzanie wszystkimi zadaniami
- Tworzenie wszystkich typów zadań
- Zarządzanie użytkownikami
- Przypisywanie zadań

### Coordinator (Koordynator)
- **Ograniczone uprawnienia do tworzenia zadań**
- Może tworzyć **tylko zadania typu SERWIS**
- Może aktualizować zadania
- Może przypisywać użytkowników do zadań
- Dostęp do odczytu użytkowników, urządzeń i aktywności

### Technician (Technik)
- Wykonywanie przypisanych zadań
- Aktualizacja statusów zadań
- Dodawanie zdjęć i dokumentacji

### Viewer (Podgląd)
- Tylko odczyt danych
- Brak możliwości edycji

### Pobranie informacji o zalogowanym użytkowniku

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Odświeżenie tokenu

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 📝 2. Zadania (Tasks)

### Typy zadań

System obsługuje następujące typy zadań:

1. **SMW** - System Monitoringu Wizyjnego (ID: 1)
2. **CSDIP** - Cyfrowe Systemy Dźwiękowego Informowania Pasażerów (ID: 2)
3. **LAN_PKP_PLK** - Sieci LAN PKP PLK (ID: 3)
4. **SMOK_IP_A** - System monitorowania obiektów kolejowych - Wariant A (ID: 4)
5. **SMOK_IP_B** - System monitorowania obiektów kolejowych - Wariant B (ID: 5)
6. **SSWIN** - System Sygnalizacji Włamania i Napadu (ID: 6)
7. **SSP** - System Sygnalizacji Pożaru (ID: 7)
8. **SUG** - Stałe Urządzenie Gaśnicze (ID: 8)
9. **OBIEKTY_KUBATUROWE** - Obiekty budowlane kubaturowe (ID: 9)
10. **KONTRAKTY_LINIOWE** - Kontrakty liniowe kolejowe (ID: 10)
11. **LAN_STRUKTURALNY** - LAN Strukturalny - okablowanie miedziane (ID: 11)
12. **ZASILANIA** - Systemy zasilania (ID: 12)
13. **STRUKTURY_SWIATLO** - Infrastruktura światłowodowa (ID: 13)
14. **SERWIS** - Zadanie Serwisowe (ID: 14) - **Tylko ten typ może tworzyć koordynator**

### Utworzenie nowego zadania

**Uwaga:** Koordynatorzy mogą tworzyć tylko zadania typu SERWIS (kod: 'SERWIS'). Próba utworzenia innego typu zadania przez koordynatora zwróci błąd 403.

#### Przykład: Zadanie SMW (Admin/Manager)
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Montaż SMW - Stacja Warszawa Centralna",
    "description": "Instalacja systemu monitoringu wizyjnego",
    "taskTypeId": 1,
    "location": "Warszawa Centralna, Peron 1",
    "client": "PKP PLK S.A.",
    "contractNumber": "KNT/2024/001",
    "plannedStartDate": "2024-12-01",
    "plannedEndDate": "2024-12-15",
    "priority": 1
  }'
```

#### Przykład: Zadanie SERWIS (Admin/Manager/Coordinator)
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Naprawa kamery - Stacja Gdańsk Główny",
    "description": "Wymiana uszkodzonej kamery monitoringu",
    "taskTypeId": 14,
    "location": "Gdańsk Główny, Peron 3",
    "client": "PKP PLK S.A.",
    "contractNumber": "SRW/2024/015",
    "plannedStartDate": "2024-12-05",
    "plannedEndDate": "2024-12-06",
    "priority": 2
  }'
```

**Odpowiedź zawiera automatycznie wygenerowany 9-cyfrowy numer zadania!**

**Błąd dla koordynatora próbującego utworzyć zadanie nie-SERWIS:**
```json
{
  "success": false,
  "message": "Koordynator może tworzyć tylko zadania serwisowe"
}
```

### Pobranie listy wszystkich zadań

```bash
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Z filtrowaniem:**
```bash
curl "http://localhost:3000/api/tasks?status=created&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Pobranie szczegółów zadania

```bash
curl http://localhost:3000/api/tasks/123456789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Aktualizacja zadania

```bash
curl -X PUT http://localhost:3000/api/tasks/123456789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Montaż SMW - Stacja Warszawa Centralna (ZAKTUALIZOWANE)",
    "status": "in_progress",
    "priority": 2
  }'
```

### Zmiana statusu zadania

```bash
curl -X PATCH http://localhost:3000/api/tasks/123456789/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

**Dozwolone statusy:** `created`, `assigned`, `started`, `in_progress`, `completed`, `cancelled`

### Przypisanie użytkowników do zadania

```bash
curl -X POST http://localhost:3000/api/tasks/123456789/assign \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [1, 2, 3]
  }'
```

### Usunięcie zadania (soft delete)

```bash
curl -X DELETE http://localhost:3000/api/tasks/123456789 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Moje zadania

```bash
curl http://localhost:3000/api/tasks/my \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📦 3. BOM (Bill of Materials)

### Pobranie szablonów BOM dla typu zadania

```bash
curl http://localhost:3000/api/bom/templates/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Pobranie materiałów zadania

```bash
curl http://localhost:3000/api/tasks/123456789/bom \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Aktualizacja użycia materiału

```bash
curl -X PUT http://localhost:3000/api/tasks/123456789/bom/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "usedQuantity": 5,
    "serialNumbers": ["SN001", "SN002", "SN003", "SN004", "SN005"]
  }'
```

## 🔢 4. Urządzenia (Devices)

### Rejestracja urządzenia

```bash
curl -X POST http://localhost:3000/api/devices/serial \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "CAM-IP-2MP-001",
    "deviceType": "Kamera IP",
    "deviceModel": "HIK-DS-2CD2023G0-I",
    "manufacturer": "Hikvision",
    "status": "prefabricated"
  }'
```

### Pobranie urządzenia po numerze seryjnym

```bash
curl http://localhost:3000/api/devices/CAM-IP-2MP-001 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Weryfikacja urządzenia

```bash
curl -X PUT http://localhost:3000/api/devices/1/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Pobranie urządzeń zadania

```bash
curl http://localhost:3000/api/tasks/123456789/devices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## ✓ 5. Aktywności (Checklisty)

### Pobranie szablonów aktywności dla typu zadania

```bash
curl http://localhost:3000/api/activities/templates/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Pobranie aktywności zadania

```bash
curl http://localhost:3000/api/tasks/123456789/activities \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Oznaczenie aktywności jako ukończonej

```bash
curl -X POST http://localhost:3000/api/activities/1/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📸 6. Kontrola jakości (Zdjęcia)

### Upload zdjęcia

```bash
curl -X POST http://localhost:3000/api/quality/photos \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "photo=@/path/to/photo.jpg" \
  -F "taskId=1" \
  -F "activityId=1" \
  -F "notes=Zdjęcie z montażu kamery"
```

### Pobranie zdjęć zadania

```bash
curl http://localhost:3000/api/tasks/123456789/photos \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Zatwierdzenie zdjęcia

```bash
curl -X PUT http://localhost:3000/api/quality/photos/1/approve \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🌐 7. Zarządzanie IP

### Pobranie pul IP

```bash
curl http://localhost:3000/api/ip/pools \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Alokacja adresu IP

```bash
curl -X POST http://localhost:3000/api/ip/allocate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 1
  }'
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": {
    "ipAddress": "192.168.10.1"
  }
}
```

### Zwolnienie adresu IP

```bash
curl -X POST http://localhost:3000/api/ip/release \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": 1,
    "ipAddress": "192.168.10.1"
  }'
```

## 📊 8. Metryki i statystyki

### Dashboard - statystyki ogólne

```bash
curl http://localhost:3000/api/metrics/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": {
    "totalTasks": 150,
    "activeTasks": 45,
    "completedTasks": 95,
    "completedToday": 5,
    "averageCompletionTime": 120
  }
}
```

### Statystyki według typów zadań

```bash
curl http://localhost:3000/api/metrics/task-types \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Statystyki użytkownika

```bash
curl http://localhost:3000/api/metrics/users/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Statystyki dzienne

```bash
curl "http://localhost:3000/api/metrics/daily?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 👥 9. Użytkownicy

### Lista użytkowników

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Utworzenie użytkownika

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jan.kowalski",
    "email": "jan.kowalski@dermag.lan",
    "password": "SecurePass123!",
    "firstName": "Jan",
    "lastName": "Kowalski",
    "phone": "+48123456789",
    "roleId": 3
  }'
```

### Aktualizacja użytkownika

```bash
curl -X PUT http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+48987654321",
    "active": true
  }'
```

## 🔍 10. Health Check

### Sprawdzenie statusu serwera

```bash
curl http://localhost:3000/health
```

**Odpowiedź:**
```json
{
  "status": "OK",
  "timestamp": "2024-11-08T20:00:00.000Z",
  "uptime": 3600
}
```

## 📝 Przykładowy workflow

### Scenariusz: Pełny cykl życia zadania

```bash
# 1. Zaloguj się
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' \
  | jq -r '.data.accessToken')

# 2. Utwórz zadanie
TASK=$(curl -s -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "taskTypeId": 1,
    "location": "Test Location"
  }')

TASK_NUMBER=$(echo $TASK | jq -r '.data.taskNumber')
echo "Utworzono zadanie: $TASK_NUMBER"

# 3. Przypisz użytkownika
curl -s -X POST http://localhost:3000/api/tasks/$TASK_NUMBER/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userIds": [1]}' | jq

# 4. Zmień status na "started"
curl -s -X PATCH http://localhost:3000/api/tasks/$TASK_NUMBER/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "started"}' | jq

# 5. Pobierz szczegóły zadania
curl -s http://localhost:3000/api/tasks/$TASK_NUMBER \
  -H "Authorization: Bearer $TOKEN" | jq

# 6. Pobierz BOM zadania
curl -s http://localhost:3000/api/tasks/$TASK_NUMBER/bom \
  -H "Authorization: Bearer $TOKEN" | jq

# 7. Pobierz aktywności zadania
curl -s http://localhost:3000/api/tasks/$TASK_NUMBER/activities \
  -H "Authorization: Bearer $TOKEN" | jq

# 8. Oznacz zadanie jako ukończone
curl -s -X PATCH http://localhost:3000/api/tasks/$TASK_NUMBER/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' | jq
```

## 🐛 Debugowanie

### Sprawdzenie logów serwera

```bash
# W terminalu gdzie uruchomiony jest serwer
npm run dev
```

### Testowanie z verbose output

```bash
curl -v http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

## ⚠️ Kody błędów

- `200` - OK
- `201` - Created
- `400` - Bad Request (błędne dane wejściowe)
- `401` - Unauthorized (brak lub nieprawidłowy token)
- `403` - Forbidden (brak uprawnień)
- `404` - Not Found
- `500` - Internal Server Error

## 📚 Dodatkowe zasoby

- [Dokumentacja API](./README.md)
- [Struktura projektu](./README.md#struktura-projektu)
- [Konfiguracja środowiska](./README.md#konfiguracja)

---

**Powodzenia w testowaniu!** 🚀
