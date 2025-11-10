# Quick Start Guide - Demo Frontend

Ten przewodnik pomoże Ci szybko uruchomić demo frontend Der-Mag Platform.

## Wymagania wstępne

- Node.js 18+ 
- npm 9+
- Działający backend API (na `http://localhost:3000`)

## Krok 1: Instalacja backendu

Przed uruchomieniem frontendu musisz mieć działający backend:

```bash
cd backend
npm install
cp .env.example .env
# Edytuj .env z ustawieniami bazy danych
npm run dev
```

Backend powinien być dostępny na `http://localhost:3000`.

## Krok 2: Instalacja frontendu

```bash
cd frontend
npm install
cp .env.example .env
```

Domyślna konfiguracja w `.env` powinna być odpowiednia:
```
VITE_API_URL=http://localhost:3000/api
```

## Krok 3: Uruchomienie frontendu

```bash
npm run dev
```

Frontend będzie dostępny na: `http://localhost:5173`

## Krok 4: Logowanie

Otwórz przeglądarkę i przejdź do `http://localhost:5173`. Zobaczysz ekran logowania.

### Demo konta:

**Admin** (pełne uprawnienia):
- Login: `admin`
- Hasło: `password`

**Manager** (zarządzanie zadaniami):
- Login: `manager`
- Hasło: `password`

**Koordynator** (tylko zadania serwisowe):
- Login: `koordynator`
- Hasło: `password`

## Funkcjonalności

Po zalogowaniu będziesz mógł:

1. **Dashboard** - Zobacz statystyki zadań w czasie rzeczywistym
   - Liczba wszystkich zadań
   - Liczba aktywnych zadań
   - Liczba zakończonych zadań
   - Zadania utworzone dzisiaj
   - Wykresy według typu i statusu

2. **Lista zadań** - Przeglądaj i filtruj zadania
   - Filtruj według statusu (utworzone, przypisane, w trakcie, zakończone)
   - Filtruj według typu zadania (SMW, CSDIP, SERWIS, etc.)
   - Kliknij numer zadania aby zobaczyć szczegóły

3. **Szczegóły zadania** - Zobacz pełne informacje o zadaniu
   - Typ zadania
   - Status i priorytet
   - Lokalizacja i klient
   - Daty planowane i faktyczne
   - Pełny opis

## Troubleshooting

### Problem: Frontend nie łączy się z backendem

**Rozwiązanie**: 
- Upewnij się, że backend działa na `http://localhost:3000`
- Sprawdź plik `.env` w katalogu frontend
- Sprawdź konsolę przeglądarki (F12) dla błędów CORS

### Problem: Błąd 401 - Unauthorized

**Rozwiązanie**:
- Token JWT mógł wygasnąć (8 godzin)
- Wyloguj się i zaloguj ponownie
- Sprawdź localStorage w przeglądarce (F12 > Application > Local Storage)

### Problem: Brak danych na Dashboard

**Rozwiązanie**:
- Backend może nie mieć żadnych zadań w bazie
- Zaloguj się jako admin lub manager i utwórz kilka zadań przez API
- Alternatywnie, uruchom seeding bazy danych:
  ```bash
  cd backend
  psql -U dermag_user -d dermag_platform < scripts/seed-data.sql
  ```

## Dalszy rozwój

To jest demo aplikacji z podstawowymi funkcjonalnościami. W pełnej wersji można dodać:

- Tworzenie i edycję zadań przez UI
- Zarządzanie BOM (Bill of Materials)
- Upload zdjęć kontroli jakości
- Checklisty aktywności
- Zarządzanie użytkownikami
- Zaawansowane filtry i wyszukiwanie
- Eksport danych do Excel/PDF
- Powiadomienia real-time
- Wersja mobilna (React Native)

## Wsparcie

W razie problemów sprawdź:
- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Backend API Testing Guide](backend/API_TESTING.md)

---

**Der-Mag Platform** © 2024
