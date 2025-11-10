# Der-Mag Platform

**Platforma Zarządzania Zadaniami Infrastrukturalnymi**

System zarządzania projektami infrastrukturalnymi dla branży kolejowej i telekomunikacyjnej.

## 📋 Opis

Der-Mag Platform to kompleksowy system do zarządzania zadaniami infrastrukturalnymi, obsługujący 13 różnych typów projektów - od systemów monitoringu wizyjnego (SMW) po struktury światłowodowe.

## 🚀 Funkcjonalności

- ✅ Zarządzanie zadaniami z unikalnym 9-cyfrowym numerem
- 👥 System uwierzytelniania JWT z rolami (admin, manager, technician, viewer)
- 📦 BOM (Bill of Materials) - zarządzanie materiałami i komponentami
- 🔢 Śledzenie numerów seryjnych urządzeń
- 🌐 Automatyczna alokacja adresów IP z pul CIDR
- ✓ Szablony checklistów dla każdego typu zadania
- 📸 Kontrola jakości - upload zdjęć z EXIF, GPS, automatyczna kompresja
- 📊 Dashboard z metrykami i statystykami w czasie rzeczywistym

## 🛠 Technologie

### Backend
- Node.js 20 LTS + TypeScript 5.x
- Express 4.x
- TypeORM + PostgreSQL 15
- JWT + Bcrypt
- Sharp (przetwarzanie obrazów)
- Helmet, CORS, Rate Limiting

### Frontend (Demo)
- React 18 + TypeScript
- Vite
- React Router
- Axios
- CSS3

## 📦 Struktura projektu

```
der-mag-platform/
├── backend/              # Backend API (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/      # Konfiguracja
│   │   ├── entities/    # Encje bazy danych
│   │   ├── controllers/ # Kontrolery HTTP
│   │   ├── services/    # Logika biznesowa
│   │   ├── middleware/  # Middleware
│   │   ├── routes/      # Trasy API
│   │   └── dto/         # Data Transfer Objects
│   ├── scripts/         # Skrypty SQL
│   └── README.md        # Dokumentacja backend
├── frontend/             # Frontend Demo (React + TypeScript)
│   ├── src/
│   │   ├── api/         # Klient API
│   │   ├── components/  # Komponenty React
│   │   ├── contexts/    # React Context
│   │   ├── pages/       # Strony aplikacji
│   │   └── types/       # Definicje TypeScript
│   └── README.md        # Dokumentacja frontend
├── LICENSE
└── README.md            # Ten plik
```

## 🔧 Instalacja i uruchomienie

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edytuj .env z własnymi ustawieniami
npm run dev
```

Szczegółowa dokumentacja: [backend/README.md](backend/README.md)

### Frontend (Demo)

```bash
cd frontend
npm install
cp .env.example .env
# Backend powinien działać na http://localhost:3000
npm run dev
```

Aplikacja dostępna na: `http://localhost:5173`

Szczegółowa dokumentacja: [frontend/README.md](frontend/README.md)

## 📚 API Endpoints

- **Auth**: `/api/auth/*` - Uwierzytelnianie
- **Tasks**: `/api/tasks/*` - Zarządzanie zadaniami
- **BOM**: `/api/bom/*` - Bill of Materials
- **Devices**: `/api/devices/*` - Urządzenia
- **Activities**: `/api/activities/*` - Checklisty
- **Quality**: `/api/quality/*` - Kontrola jakości
- **IP**: `/api/ip/*` - Zarządzanie IP
- **Metrics**: `/api/metrics/*` - Statystyki
- **Users**: `/api/users/*` - Użytkownicy

## 🎯 Typy zadań

System obsługuje 13 typów zadań:

1. **SMW** - System Monitoringu Wizyjnego
2. **CSDIP** - Cyfrowe Systemy Dźwiękowego Informowania Pasażerów
3. **LAN PKP PLK** - Sieci LAN PKP PLK
4. **SMOK-IP/CMOK-IP (Wariant A/SKP)**
5. **SMOK-IP/CMOK-IP (Wariant B)**
6. **SSWiN** - System Sygnalizacji Włamania i Napadu
7. **SSP** - System Sygnalizacji Pożaru
8. **SUG** - Stałe Urządzenie Gaśnicze
9. **Obiekty Kubaturowe**
10. **Kontrakty Liniowe**
11. **LAN Strukturalny Miedziana**
12. **Zasilania**
13. **Struktury Światłowodowe**

## 🔐 Bezpieczeństwo

- JWT token-based authentication
- Bcrypt password hashing (10 rounds)
- Helmet.js security headers
- Rate limiting
- CORS configuration
- Input validation (class-validator)
- SQL injection prevention
- XSS protection

## 📄 Licencja

MIT License - zobacz [LICENSE](LICENSE)

## 👥 Wsparcie

Dla szczegółowej dokumentacji API, patrz [backend/README.md](backend/README.md)

---

**Der-Mag Platform** © 2024
