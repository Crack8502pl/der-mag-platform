# Der-Mag Platform - Demo Guide

Przewodnik użytkownika dla demo frontendu platformy Der-Mag.

## 🚀 Szybki Start

### 1. Przygotowanie środowiska

Upewnij się, że masz zainstalowane:
- Node.js 20+ LTS
- PostgreSQL 15+
- npm 9+

### 2. Uruchomienie Backendu

```bash
# Przejdź do katalogu backend
cd backend

# Zainstaluj zależności
npm install

# Skopiuj i skonfiguruj .env
cp .env.example .env

# Uruchom backend
npm run dev
```

Backend powinien być dostępny na `http://localhost:3000`

### 3. Uruchomienie Frontendu

```bash
# W nowym terminalu, przejdź do katalogu frontend
cd frontend

# Zainstaluj zależności
npm install

# Skopiuj .env (opcjonalnie - domyślne ustawienia działają)
cp .env.example .env

# Uruchom frontend
npm run dev
```

Frontend będzie dostępny na `http://localhost:5173`

## 🔑 Dane Logowania

System zawiera predefiniowanych użytkowników z różnymi poziomami uprawnień:

### Administrator
- **Username:** `admin`
- **Password:** `Admin123!`
- **Uprawnienia:** Pełny dostęp do wszystkich funkcji

### Manager
- **Username:** `manager`
- **Password:** `Manager123!`
- **Uprawnienia:** Zarządzanie zadaniami, użytkownikami, raportami

### Technician
- **Username:** `technician`
- **Password:** `Tech123!`
- **Uprawnienia:** Dostęp do zadań przypisanych, aktualizacja statusu

### Coordinator
- **Username:** `coordinator`
- **Password:** `Coord123!`
- **Uprawnienia:** Tworzenie zadań serwisowych, zarządzanie przypisaniami

### Viewer
- **Username:** `viewer`
- **Password:** `View123!`
- **Uprawnienia:** Tylko odczyt

## 📖 Przewodnik po Interfejsie

### Strona Logowania

1. Otwórz `http://localhost:5173/login`
2. Wprowadź dane logowania (np. admin / Admin123!)
3. Kliknij "Zaloguj się"
4. Po pomyślnym zalogowaniu zostaniesz przekierowany do Dashboard

### Dashboard

Dashboard wyświetla:

- **Metryki ogólne:**
  - Wszystkie zadania
  - Aktywne zadania
  - Ukończone zadania
  - Opóźnione zadania

- **Zadania według statusu:**
  - created (utworzone)
  - assigned (przypisane)
  - started (rozpoczęte)
  - in_progress (w trakcie)
  - completed (ukończone)

- **Zadania według typu:**
  - SMW, CSDIP, LAN PKP PLK, itp.
  - SERWIS (nowy typ zadań serwisowych)

- **Ostatnie zadania:**
  - Lista najnowszych zadań w systemie

### Lista Zadań

Dostęp: Kliknij "Zadania" w menu nawigacyjnym

Funkcje:
- Wyświetlanie wszystkich zadań w formie kart
- **Filtrowanie według statusu:**
  - Dropdown: "Wszystkie statusy" / "Utworzone" / "Przypisane" / etc.
- **Informacje na karcie:**
  - Numer zadania (9-cyfrowy)
  - Tytuł zadania
  - Status (kolorowy badge)
  - Lokalizacja
  - Klient (jeśli dostępny)
  - Typ zadania
  - Priorytet (Niski/Średni/Wysoki/Pilny)
  - Data utworzenia
- Kliknięcie karty prowadzi do szczegółów zadania

### Szczegóły Zadania

Dostęp: Kliknij dowolną kartę zadania

Sekcje:
1. **Informacje podstawowe:**
   - Status
   - Priorytet
   - Lokalizacja
   - Klient
   - Typ zadania

2. **Opis:**
   - Szczegółowy opis zadania

3. **Harmonogram:**
   - Planowany start
   - Planowane zakończenie
   - Faktyczny start
   - Faktyczne zakończenie

4. **Osoby:**
   - Utworzone przez
   - Przypisane do (lista osób)

5. **Daty systemowe:**
   - Data utworzenia
   - Ostatnia aktualizacja

Nawigacja:
- Link "← Powrót do listy zadań" na górze strony

### Menu Nawigacyjne

Górny pasek zawiera:
- **Der-Mag Platform** - logo/link do dashboard
- **Dashboard** - przejście do strony głównej
- **Zadania** - przejście do listy zadań
- **Informacje o użytkowniku:**
  - Imię i nazwisko
  - Rola (admin/manager/technician/etc.)
  - Przycisk "Wyloguj"

## 🎨 Responsywność

Aplikacja jest w pełni responsywna:

- **Desktop (1920px+):** Pełny układ z wieloma kolumnami
- **Laptop (1280px+):** Dostosowany układ 2-3 kolumn
- **Tablet (768px+):** Układ 1-2 kolumn, uprościone menu
- **Mobile (320px+):** Jednowierszowy układ, kompaktowe komponenty

## 🔄 Typowy Przepływ Pracy

### Scenariusz 1: Administrator sprawdza system

1. Zaloguj się jako `admin`
2. Zobacz dashboard z wszystkimi metrykami
3. Przejdź do "Zadania"
4. Wybierz zadanie do sprawdzenia
5. Przeglądaj szczegóły zadania
6. Wróć do listy zadań

### Scenariusz 2: Manager filtruje zadania

1. Zaloguj się jako `manager`
2. Przejdź do "Zadania"
3. Użyj filtra statusu - wybierz "W trakcie"
4. Zobacz tylko zadania w trakcie realizacji
5. Kliknij na wybrane zadanie
6. Sprawdź postęp i osoby przypisane

### Scenariusz 3: Technician sprawdza swoje zadania

1. Zaloguj się jako `technician`
2. Zobacz dashboard - metryki będą pokazywać dane
3. Przejdź do "Zadania"
4. Przefiltruj zadania według statusu
5. Znajdź swoje zadania do wykonania

## 🛠 Funkcje Demo

### Zaimplementowane:
- ✅ Logowanie JWT
- ✅ Dashboard z metrykami
- ✅ Lista zadań z filtrowaniem
- ✅ Szczegóły zadania
- ✅ Responsywny design
- ✅ Protected routes
- ✅ Nawigacja
- ✅ Wylogowanie

### Obecnie niedostępne (backend API istnieje):
- ❌ Tworzenie nowych zadań
- ❌ Edycja zadań
- ❌ Przypisywanie użytkowników
- ❌ Upload zdjęć
- ❌ Zarządzanie materiałami (BOM)
- ❌ Zarządzanie urządzeniami
- ❌ Checklisty aktywności
- ❌ Zarządzanie użytkownikami

*Uwaga: Te funkcje można łatwo dodać - API backend jest gotowe!*

## 🐛 Rozwiązywanie Problemów

### Problem: "Network Error" przy logowaniu

**Przyczyna:** Backend nie działa lub CORS nie jest skonfigurowany

**Rozwiązanie:**
1. Sprawdź czy backend działa: `curl http://localhost:3000/health`
2. W backend/.env dodaj: `CORS_ORIGIN=http://localhost:5173`
3. Zrestartuj backend

### Problem: "Token expired" / Automatyczne wylogowanie

**Przyczyna:** Token JWT wygasł (8 godzin)

**Rozwiązanie:**
1. Zaloguj się ponownie
2. Token jest automatycznie odświeżany przy kolejnych requestach

### Problem: Nie widzę żadnych zadań

**Przyczyna:** Brak danych w bazie

**Rozwiązanie:**
1. Upewnij się, że uruchomiłeś seed data:
   ```bash
   psql -U dermag_user -d dermag_platform -f backend/scripts/seed-data.sql
   ```

### Problem: Strona się nie ładuje

**Przyczyna:** Frontend nie działa

**Rozwiązanie:**
1. Sprawdź czy serwer dev działa: `npm run dev` w katalogu frontend
2. Sprawdź terminal pod kątem błędów
3. Otwórz konsolę przeglądarki (F12) i sprawdź błędy

## 📊 API Endpoints Używane

Frontend komunikuje się z następującymi endpointami:

- `POST /api/auth/login` - Logowanie
- `POST /api/auth/logout` - Wylogowanie
- `GET /api/auth/me` - Dane zalogowanego użytkownika
- `GET /api/tasks` - Lista zadań (z parametrami filtrowania)
- `GET /api/tasks/:taskNumber` - Szczegóły zadania
- `GET /api/metrics/dashboard` - Metryki dashboard

## 🔐 Bezpieczeństwo

### Zaimplementowane mechanizmy:
- JWT token authentication
- Automatyczne dołączanie tokenu do requestów
- Przekierowanie na login przy 401
- Protected routes (wymagają logowania)
- Token przechowywany w localStorage

### Zalecenia produkcyjne:
- Użyj HTTPS w produkcji
- Rozważ httpOnly cookies zamiast localStorage
- Zaimplementuj refresh token rotation
- Dodaj rate limiting na frontendzie
- Zaimplementuj CSP headers

## 📈 Dalszy Rozwój

Sugerowane następne kroki:

1. **Dodaj tworzenie zadań:**
   - Formularz tworzenia zadania
   - Walidacja danych
   - Wybór typu zadania

2. **Dodaj edycję zadań:**
   - Formularz edycji
   - Zmiana statusu
   - Przypisywanie użytkowników

3. **Dodaj zarządzanie BOM:**
   - Lista materiałów
   - Dodawanie/usuwanie materiałów
   - Śledzenie zużycia

4. **Dodaj checklisty:**
   - Wyświetlanie aktywności
   - Oznaczanie jako wykonane
   - Upload zdjęć

5. **Dodaj panel administracyjny:**
   - Zarządzanie użytkownikami
   - Zarządzanie typami zadań
   - Raporty i statystyki

## 🎓 Nauka z Demo

To demo pokazuje:

### Frontend Best Practices:
- Separacja concerns (API/Components/Pages/Types)
- React Context dla stanu globalnego
- Protected routes
- Type-safe TypeScript
- Responsive design
- Error handling
- Loading states

### Backend Integration:
- Axios interceptors
- JWT token management
- API client pattern
- Type-safe API responses
- Error handling

### User Experience:
- Intuitive navigation
- Clear feedback
- Responsive design
- Loading indicators
- Error messages in Polish

## 📄 Dodatkowe Zasoby

- **Backend API Docs:** `backend/API_TESTING.md`
- **Backend README:** `backend/README.md`
- **Frontend README:** `frontend/README.md`
- **Implementation Notes:** `IMPLEMENTATION_NOTES.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`

---

**Der-Mag Platform Demo** © 2024

Powered by React + TypeScript + Node.js
