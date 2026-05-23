# Frontend Testing Guide — der-mag-platform

## Spis treści
- [Przegląd](#przegląd)
- [Konfiguracja](#konfiguracja)
- [Uruchamianie testów](#uruchamianie-testów)
- [Struktura testów](#struktura-testów)
- [Pokrycie kodu](#pokrycie-kodu)
- [Roadmap rozszerzenia testów](#roadmap-rozszerzenia-testów)
- [Konwencje](#konwencje)
- [Troubleshooting](#troubleshooting)

## Przegląd

Frontend używa **Vitest** jako frameworka testowego z **@testing-library/react** dla komponentów React.

## Konfiguracja

Plik konfiguracyjny: `frontend/vitest.config.ts`

- Środowisko: `jsdom`
- Provider pokrycia: `v8`
- Próg pokrycia: **70%** branches/functions/lines/statements

## Uruchamianie testów

```bash
# Wszystkie testy (jednorazowo)
npm test

# Tryb watch
npm run test:watch

# Z raportem pokrycia
npm run test:coverage
```

## Struktura testów

```text
frontend/src/
├── utils/
│   ├── csvParser.ts
│   ├── csvParser.test.ts          ✅ Pokrycie ~90%
│   ├── permissionCodec.ts
│   ├── permissionCodec.test.ts    ✅ Pokrycie ~90%
│   ├── pluralization.ts
│   ├── pluralization.test.ts      ✅ Pokrycie ~100%
│   ├── priority.ts
│   ├── priority.test.ts           ✅ Pokrycie ~100%
│   ├── ruleFormulaGenerator.ts
│   ├── ruleFormulaGenerator.test.ts ✅ Pokrycie ~80%
│   ├── isExtensionError.ts
│   └── isExtensionError.test.ts   ✅ Istniejący
├── hooks/
│   ├── usePasswordValidation.ts
│   └── usePasswordValidation.test.ts ✅ Pokrycie ~80%
└── test/
    ├── setup.ts
    └── ThemeContext.test.tsx       ✅ Pokrycie ~75%
```

## Pokrycie kodu

### Cele

| Moduł        | Minimum | Cel    |
|--------------|---------|--------|
| utils/       | 70%     | 90%+   |
| hooks/       | 70%     | 80%+   |
| contexts/    | 70%     | 75%+   |
| services/    | -       | Roadmap|
| components/  | -       | Roadmap|

### Raporty

Po `npm run test:coverage`:
- **Konsola**: podsumowanie tekstowe
- **HTML**: `coverage/index.html`
- **LCOV**: `coverage/lcov.info`

## Roadmap rozszerzenia testów

### 🟢 Łatwy — `src/hooks/usePasswordValidation`

**Status**: ✅ Zaimplementowany  
**Wymaga**: `renderHook` z `@testing-library/react`  
**Przypadki testowe**:
- Walidacja długości (8–12 znaków)
- Walidacja wielkich liter, cyfr, znaków specjalnych
- `usePasswordMatch` — zgodność haseł

---

### 🟡 Średni — `src/contexts/ThemeContext`

**Status**: ✅ Zaimplementowany  
**Wymaga**: `render` + mockowanie localStorage + `act()`  
**Przypadki testowe**:
- Domyślny motyw `grover`
- Przełączanie między `grover` ↔ `husky`
- Tryb `auto` — motyw zależny od godziny
- Zapis do localStorage
- Atrybut `data-theme` na `document.documentElement`

---

### 🟡 Średni — `src/services/auth.service`

**Status**: 📋 Do zaimplementowania  
**Plik**: `frontend/src/services/auth.service.ts`  
**Wymaga**: `vi.mock('axios')` lub mockowanie modułu `api`  
**Przypadki testowe**:
- `login(credentials)` → poprawna odpowiedź → zwraca token
- `login(credentials)` → błąd 401 → rzuca wyjątek
- `logout()` → czyści localStorage/store
- `refreshToken()` → zwraca nowy token
- Obsługa błędów sieciowych (timeout, brak sieci)

**Przykład**:
```typescript
import { vi } from 'vitest';
import axios from 'axios';
vi.mock('axios');

describe('auth.service', () => {
  it('should return token on successful login', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'abc123' } });
    // ...
  });
});
```

---

### 🔴 Trudny — `src/components/common/*`

**Status**: 📋 Do zaimplementowania  
**Wymaga**: `render` + `MemoryRouter` + mockowanie kontekstów (AuthContext, ThemeContext)  
**Priorytetowe komponenty**:

#### `LocationPicker`
- Renderowanie z pustymi coords
- `onChange` wywoływany po zmianie wejścia
- Parsowanie linku Google Maps → ekstrakcja lat/lon

#### `SerialPatternSettings`
- Renderowanie sekcji testowej
- Kliknięcie "Testuj" → wynik walidacji

#### Komponenty formularzy (`TaskCreateModal`, `TaskEditModal`)
- Wypełnienie pól → poprawny DTO
- Walidacja wymaganych pól
- Submit → wywołanie serwisu

**Wzorzec mockowania kontekstów**:
```typescript
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ThemeProvider>{ui}</ThemeProvider>
    </MemoryRouter>
  );
```

---

### 🔴 Trudny — `src/utils/dependencyRuleEngine`

**Status**: 📋 Do zaimplementowania  
**Plik**: `frontend/src/utils/dependencyRuleEngine.ts`  
**Przypadki testowe**:
- Ewaluacja reguły SUM z kilkoma wejściami
- Ewaluacja CEIL_DIV z operandem
- Warunki progowe (thresholds) — wynik w zakresie → zastąpienie wartości
- SELECT_RECORDER / SELECT_DISKS — specjalne przypadki
- Nieznana reguła → wartość domyślna lub błąd

---

## Konwencje

### Nazewnictwo

- Pliki testowe: `*.test.ts` lub `*.test.tsx`
- Bloki: `describe('NazwaModułu', () => { ... })`
- Przypadki: `it('should ...')` lub `test('should ...')`

### Organizacja

```typescript
// Arrange
const input = ...;

// Act
const result = functionUnderTest(input);

// Assert
expect(result).toBe(expected);
```

### Mocki

```typescript
// Vitest — NIE używaj jest.fn()
const mockFn = vi.fn();
vi.mock('../services/api');
vi.spyOn(localStorage, 'setItem');

// Reset po każdym teście
afterEach(() => {
  vi.clearAllMocks();
});
```

### Import

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
```

## Troubleshooting

### Problem: `localStorage is not defined`
**Rozwiązanie**: vitest.config.ts używa `jsdom` — sprawdź `setupFiles: ['./src/test/setup.ts']`

### Problem: Testy przekraczają próg pokrycia
**Rozwiązanie**: Sprawdź `vitest.config.ts` — `include` obejmuje tylko `src/utils/**`. Komponenty React wymagają osobnej konfiguracji.

### Problem: `Cannot find module` dla serwisów
**Rozwiązanie**: Użyj `vi.mock()` przed importem lub w `beforeAll`:
```typescript
vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
```

### Problem: `act()` warnings przy hookach
**Rozwiązanie**: Opakuj aktualizacje stanu w `act()`:
```typescript
import { act } from '@testing-library/react';
act(() => { result.current.setTheme('husky'); });
```
