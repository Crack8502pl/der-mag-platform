# Der-Mag Platform - Demo Frontend

Demo aplikacja frontendowa dla Der-Mag Platform - System Zarządzania Zadaniami Infrastrukturalnymi.

## 🚀 Technologie

- **React 18** - Biblioteka UI
- **TypeScript** - Typowanie statyczne
- **Vite** - Narzędzie do budowania
- **React Router** - Routing
- **Axios** - Klient HTTP
- **Tailwind CSS** - Framework CSS

## 📦 Instalacja

```bash
cd frontend
npm install
```

## 🔧 Konfiguracja

Skopiuj plik `.env.example` do `.env` i dostosuj ustawienia:

```bash
cp .env.example .env
```

Domyślna konfiguracja:
```
VITE_API_URL=http://localhost:3000/api
```

## 🏃 Uruchomienie

### Tryb deweloperski

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: `http://localhost:5173`

### Budowanie produkcyjne

```bash
npm run build
```

Pliki produkcyjne zostaną wygenerowane w katalogu `dist/`.

### Podgląd buildu produkcyjnego

```bash
npm run preview
```

## 🔐 Logowanie

Aplikacja wymaga działającego backendu. Upewnij się, że backend jest uruchomiony na `http://localhost:3000`.

### Demo konta:

- **Admin**: `admin` / `password`
- **Manager**: `manager` / `password`
- **Koordynator**: `koordynator` / `password`
- **Technician**: `technik` / `password`
- **Viewer**: `viewer` / `password`

## 📱 Funkcjonalności

### ✅ Zaimplementowane:

- 🔐 Logowanie użytkowników (JWT)
- 📊 Dashboard z metrykami i statystykami
- 📋 Lista zadań z filtrowaniem
- 🔍 Szczegóły zadania
- 🧭 Nawigacja
- 👤 Informacje o zalogowanym użytkowniku
- 🚪 Wylogowanie

### 🚧 Do zaimplementowania (pełna wersja):

- ➕ Tworzenie nowych zadań
- ✏️ Edycja zadań
- 📦 Zarządzanie BOM (Bill of Materials)
- 📸 Upload zdjęć kontroli jakości
- ✓ Checklisty aktywności
- 🔢 Zarządzanie urządzeniami i numerami seryjnymi
- 🌐 Alokacja adresów IP
- 👥 Zarządzanie użytkownikami (admin)
- 📈 Zaawansowane raporty

## 🏗 Struktura projektu

```
frontend/
├── src/
│   ├── components/        # Komponenty React
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/             # Strony aplikacji
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── TasksPage.tsx
│   │   └── TaskDetailPage.tsx
│   ├── services/          # API clients
│   │   └── api.ts
│   ├── hooks/             # Custom hooks
│   │   └── useAuth.tsx
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   ├── App.tsx            # Główny komponent
│   ├── main.tsx           # Entry point
│   └── index.css          # Style globalne
├── public/                # Pliki statyczne
├── .env.example           # Przykładowa konfiguracja
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔄 API Integration

Aplikacja komunikuje się z backendem przez REST API:

- **Auth**: `/api/auth/*`
- **Tasks**: `/api/tasks/*`
- **Metrics**: `/api/metrics/*`

Wszystkie requesty są automatycznie autoryzowane przez token JWT przechowywany w `localStorage`.

## 🎨 Styling

Aplikacja wykorzystuje Tailwind CSS dla stylowania. Główne kolory:

- **Primary**: Indigo (`indigo-600`)
- **Success**: Green (`green-600`)
- **Warning**: Orange (`orange-600`)
- **Error**: Red (`red-600`)

## 🔒 Bezpieczeństwo

- JWT token-based authentication
- Automatyczne przekierowanie do logowania przy 401
- Protected routes
- Token przechowywany w localStorage (w produkcji rozważ httpOnly cookies)

## 📄 Licencja

MIT License - zobacz [LICENSE](../LICENSE)

---

**Der-Mag Platform** © 2024
