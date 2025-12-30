# Symfonia Handel WebAPI Integration

## Status: Placeholder / Oczekiwanie na dokumentację

Ten moduł zawiera strukturę przygotowaną pod integrację z Symfonia Handel WebAPI.

### Aktualna implementacja

**Status:** Placeholder - oczekiwanie na dokumentację API Symfonia Handel

**Dostępna funkcjonalność:**
- Struktura typów danych (SymfoniaTypes.ts)
- System konfiguracji (SymfoniaConfig.ts)
- Mapowanie danych Symfonia → MaterialStock (SymfoniaMapper.ts)
- Szkielet klienta API (SymfoniaApiClient.ts) - wymaga implementacji

### Użycie alternatywne: Import CSV/Excel

Do momentu udostępnienia dokumentacji Symfonia WebAPI, należy używać funkcji importu CSV/Excel:

1. Wyeksportuj dane z Symfonia Handel do pliku CSV
2. Użyj endpointu `POST /api/materials/stocks/import`
3. System automatycznie rozpozna format Symfonia

Szczegółowa instrukcja: `docs/SYMFONIA_EXPORT_GUIDE.md`

### Konfiguracja (przyszłość)

Po otrzymaniu dokumentacji API, skonfiguruj zmienne środowiskowe:

```env
SYMFONIA_API_URL=https://api.symfonia.pl
SYMFONIA_API_KEY=twoj_klucz_api
SYMFONIA_USERNAME=uzytkownik
SYMFONIA_PASSWORD=haslo
```

### Pliki

- **SymfoniaTypes.ts** - Definicje typów TypeScript dla danych Symfonia
- **SymfoniaConfig.ts** - Zarządzanie konfiguracją połączenia
- **SymfoniaMapper.ts** - Mapowanie danych między formatami (gotowe)
- **SymfoniaApiClient.ts** - Klient HTTP API (placeholder)

### Endpoint statusu

```bash
GET /api/integrations/symfonia/status
```

Zwraca aktualny status konfiguracji i dostępności API.

### Do zaimplementowania (po otrzymaniu dokumentacji)

1. **SymfoniaApiClient.ts:**
   - [ ] Implementacja `testConnection()`
   - [ ] Implementacja `getProducts()`
   - [ ] Implementacja `getStockLevels()`
   - [ ] Implementacja `getProductStock()`
   - [ ] Obsługa autoryzacji (API Key / OAuth / Basic Auth)
   - [ ] Obsługa błędów i retry logic
   - [ ] Rate limiting

2. **Nowy serwis:**
   - [ ] SymfoniaImportService - automatyczny import z API
   - [ ] Synchronizacja okresowa (cron job)
   - [ ] Obsługa webhook'ów (jeśli dostępne)

3. **Nowe endpointy:**
   - [ ] `POST /api/integrations/symfonia/sync` - ręczna synchronizacja
   - [ ] `GET /api/integrations/symfonia/last-sync` - info o ostatniej sync
   - [ ] `POST /api/integrations/symfonia/configure` - konfiguracja połączenia

### Kontakt

W razie pytań lub po otrzymaniu dokumentacji API Symfonia, zaktualizuj ten moduł.

---

**Data utworzenia:** 2025-12-29  
**Autor:** Grover Platform Development Team
