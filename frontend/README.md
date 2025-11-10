# Der-Mag Platform - Frontend Demo

Demo aplikacji frontendowej dla platformy Der-Mag - systemu zarządzania zadaniami infrastrukturalnymi.

## 🎯 Opis

To jest demo aplikacja frontendowa zbudowana w React + TypeScript, która prezentuje możliwości API backendu Der-Mag Platform.

## ✨ Funkcjonalności

- ✅ **Logowanie** - system uwierzytelniania JWT
- ✅ **Dashboard** - przegląd metryk i statystyk
- ✅ **Lista zadań** - przeglądanie wszystkich zadań z filtrowaniem
- ✅ **Szczegóły zadania** - pełne informacje o wybranym zadaniu
- ✅ **Responsywny design** - działa na desktop i mobile

## 🛠 Technologie

- **React 18** - biblioteka UI
- **TypeScript** - typowanie statyczne
- **Vite** - szybki build tool
- **React Router** - routing
- **Axios** - komunikacja z API
- **CSS3** - stylowanie

## 📦 Instalacja

```bash
# Zainstaluj zależności
npm install

# Skopiuj plik konfiguracyjny
cp .env.example .env

# Edytuj .env jeśli backend działa na innym porcie
# VITE_API_URL=http://localhost:3000/api
```

## 🚀 Uruchomienie

### Środowisko deweloperskie

```bash
npm run dev
```

Aplikacja uruchomi się na `http://localhost:5173`

### Build produkcyjny

```bash
npm run build
```

Zbudowane pliki znajdą się w katalogu `dist/`

### Preview buildu

```bash
npm run preview
```

## 🔑 Dane testowe

Użyj danych z seed-data.sql backendu:

**Administrator:**
- Username: `admin`
- Password: `Admin123!`

**Manager:**
- Username: `manager`
- Password: `Manager123!`

**Technician:**
- Username: `technician`
- Password: `Tech123!`

## 📂 Struktura projektu

```
frontend/
├── src/
│   ├── api/              # Klient API
│   │   └── client.ts
│   ├── components/       # Komponenty React
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/         # React Context
│   │   └── AuthContext.tsx
│   ├── pages/            # Strony aplikacji
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   └── TaskDetail.tsx
│   ├── types/            # Definicje TypeScript
│   │   └── index.ts
│   ├── App.tsx           # Główny komponent
│   └── main.tsx          # Entry point
├── public/               # Pliki statyczne
├── .env.example          # Przykładowa konfiguracja
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔧 Konfiguracja

### API Backend

Upewnij się, że backend działa na `http://localhost:3000` lub zaktualizuj `VITE_API_URL` w pliku `.env`.

### CORS

Backend musi mieć poprawnie skonfigurowany CORS. W pliku `.env` backendu ustaw:

```env
CORS_ORIGIN=http://localhost:5173
```

## 🎨 Komponenty

### Login (`/login`)
- Formularz logowania
- Walidacja danych
- Obsługa błędów
- Przekierowanie po zalogowaniu

### Dashboard (`/dashboard`)
- Metryki ogólne (wszystkie/aktywne/ukończone/opóźnione zadania)
- Zadania według statusu
- Zadania według typu
- Ostatnie zadania

### Lista zadań (`/tasks`)
- Wyświetlanie wszystkich zadań
- Filtrowanie według statusu
- Karty zadań z podstawowymi informacjami
- Link do szczegółów

### Szczegóły zadania (`/tasks/:taskNumber`)
- Pełne informacje o zadaniu
- Osoby przypisane
- Harmonogram
- Historia zmian

## 🔐 Bezpieczeństwo

- ✅ JWT token przechowywany w localStorage
- ✅ Automatyczne dodawanie tokenu do żądań
- ✅ Przekierowanie na login przy wygaśnięciu tokenu
- ✅ Protected routes dla zalogowanych użytkowników

## 📱 Responsive Design

Aplikacja jest w pełni responsywna i działa na:
- Desktop (1920px+)
- Laptop (1280px+)
- Tablet (768px+)
- Mobile (320px+)

## 🐛 Debug

### Problem z połączeniem API

1. Sprawdź czy backend działa: `curl http://localhost:3000/health`
2. Sprawdź CORS w backend `.env`
3. Sprawdź `VITE_API_URL` w frontend `.env`

### Token wygasł

- Wyloguj się i zaloguj ponownie
- Token ma ważność 8 godzin (konfigurowane w backendzie)

## 📄 Licencja

MIT License - zobacz [LICENSE](../LICENSE)

## 👥 Wsparcie

W przypadku problemów:
- Sprawdź dokumentację backendu w `backend/README.md`
- Sprawdź logi backendu
- Użyj narzędzi deweloperskich przeglądarki (F12)

---

**Der-Mag Platform Demo** © 2024

