# Integracja z API Jowisz

## Status: Oczekiwanie na dokumentację

Ten moduł jest przygotowany do integracji z systemem Jowisz, ale wymaga dokumentacji API.

## Struktura modułu

```
integrations/jowisz/
├── JowiszApiClient.ts   - Klient HTTP do komunikacji z API
├── JowiszMapper.ts      - Mapowanie danych między systemami
├── JowiszTypes.ts       - Definicje typów TypeScript
└── README.md            - Ten plik
```

## Co jest potrzebne do implementacji?

### 1. Dokumentacja API Jowisz

Potrzebujemy następujących informacji:

- **Endpoint URL**: Bazowy adres API
- **Autentykacja**: Metoda uwierzytelniania (API Key, OAuth, Basic Auth?)
- **Endpointy**: Lista dostępnych endpointów API
- **Formaty danych**: Struktura requestów i responsów (JSON, XML?)
- **Rate limiting**: Czy istnieją limity zapytań?
- **Wersjonowanie**: Czy API jest wersjonowane?

### 2. Wymagane operacje

Obecnie zaimplementowano placeholdery dla:

- ✅ `getContract(contractNumber)` - Pobranie pojedynczego kontraktu
- ✅ `searchContracts(query)` - Wyszukiwanie kontraktów
- ✅ `testConnection()` - Test połączenia z API
- ✅ `importContract(contractNumber)` - Import kontraktu do Der-Mag
- ✅ `syncContract(contractNumber)` - Synchronizacja danych kontraktu

### 3. Konfiguracja środowiska

Dodaj do pliku `.env`:

```env
# Jowisz API Configuration
JOWISZ_API_URL=https://api.jowisz.example.com
JOWISZ_API_KEY=your-api-key-here
JOWISZ_USERNAME=your-username
JOWISZ_PASSWORD=your-password
```

## Jak używać (po implementacji)

```typescript
import { jowiszClient } from './integrations/jowisz/JowiszApiClient';

// Test połączenia
const status = await jowiszClient.testConnection();
console.log(status);

// Pobierz kontrakt
const contract = await jowiszClient.getContract('R0000123_A');

// Wyszukaj kontrakty
const results = await jowiszClient.searchContracts('PKP', 1, 10);

// Import kontraktu
const imported = await jowiszClient.importContract('R0000123_A');
```

## Dostępne endpointy (po implementacji)

### Backend API endpoints (placeholder)

```
POST   /api/contracts/import-jowisz  # Zwraca 501 Not Implemented
GET    /api/jowisz/test-connection   # Zwraca status konfiguracji
```

## Kontakt

Jeśli masz dokumentację API Jowisz lub pytania dotyczące integracji, skontaktuj się z zespołem deweloperskim.

## TODO

- [ ] Otrzymać dokumentację API Jowisz
- [ ] Zaimplementować autentykację
- [ ] Zaimplementować klienta HTTP
- [ ] Zaimplementować mappery danych
- [ ] Dodać obsługę błędów
- [ ] Dodać retry logic
- [ ] Dodać testy jednostkowe
- [ ] Dodać testy integracyjne
- [ ] Zaktualizować dokumentację
