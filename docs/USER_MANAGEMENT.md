# Moduł Zarządzania Użytkownikami

## Przegląd
Pełny moduł zarządzania użytkownikami dostępny dla roli Administrator. System umożliwia kompleksowe zarządzanie kontami użytkowników, rolami, uprawnieniami oraz monitorowanie aktywności w systemie Grover Platform.

## Funkcjonalności

### Lista użytkowników
Kompletna tabela użytkowników z zaawansowanymi funkcjami:
- **Paginacja** - efektywne przeglądanie dużej liczby użytkowników
- **Filtrowanie** - według roli, statusu, daty utworzenia
- **Sortowanie** - wszystkie kolumny obsługują sortowanie

#### Kolumny tabeli:
| Kolumna | Opis |
|---------|------|
| ID | Unikalny identyfikator użytkownika |
| Imię | Imię użytkownika |
| Nazwisko | Nazwisko użytkownika |
| Email | Adres email (używany do powiadomień) |
| Login | Nazwa użytkownika do logowania |
| Rola | Przypisana rola systemowa |
| Status | Aktywny / Nieaktywny |
| Data utworzenia | Timestamp utworzenia konta |
| Ostatnie logowanie | Timestamp ostatniej sesji |

### Profile użytkowników
Szczegółowy widok i edycja profilu użytkownika:
- **Wyświetlanie danych** - wszystkie informacje o użytkowniku
- **Edycja profilu** - modyfikacja danych osobowych i kontaktowych
- **Historia zmian** - pełny log modyfikacji profilu z timestampami
- **Informacje o sesji** - lista aktywnych i historycznych sesji

### Zarządzanie rolami
System ról z predefiniowanymi uprawnieniami:

#### Dostępne role:
1. **admin** - Administrator systemu
   - Pełny dostęp do wszystkich funkcji
   - Zarządzanie użytkownikami i rolami
   - Konfiguracja systemowa

2. **manager** - Manager projektów
   - Zarządzanie kontraktami i zadaniami
   - Dostęp do raportów i statystyk
   - Zatwierdzanie działań

3. **bom_editor** - Edytor BOM
   - Zarządzanie zestawieniami materiałów
   - Import i eksport BOM
   - Integracja z Symfonia

4. **coordinator** - Koordynator
   - Przypisywanie zadań
   - Monitorowanie postępów
   - Komunikacja z zespołem

5. **prefabricator** - Pracownik prefabrykacji
   - Konfiguracja urządzeń
   - Weryfikacja konfiguracji
   - Przypisywanie numerów seryjnych

6. **worker** - Pracownik magazynu
   - Kompletacja materiałów
   - Skanowanie kodów kreskowych
   - Zgłaszanie braków

#### Operacje:
- **Przypisywanie ról** - zmiana roli użytkownika (tylko admin)
- **Wyświetlanie uprawnień** - podgląd uprawnień dla każdej roli
- **Walidacja** - automatyczne sprawdzanie uprawnień przy każdej akcji

### Historia aktywności
Kompletny dziennik akcji użytkownika w systemie:

#### Rejestrowane zdarzenia:
- **Logowanie** - timestamp, IP, user agent
- **Wylogowanie** - timestamp, typ (manualny/automatyczny)
- **Zmiana hasła** - timestamp (bez szczegółów hasła)
- **Akcje w systemie** - CRUD operations na różnych modułach:
  - Tworzenie/edycja/usuwanie kontraktów
  - Modyfikacje BOM
  - Akcje kompletacji
  - Akcje prefabrykacji
  - Zmiany konfiguracji

#### Eksport do CSV:
- Wybór zakresu dat
- Filtrowanie po typie akcji
- Format: `timestamp,user_id,username,action_type,details,ip_address`
- Endpoint: `/api/users/:id/activity/export`

### Tworzenie użytkownika
Proces tworzenia nowego konta użytkownika:

#### Formularz z walidacją:
```typescript
{
  username: string;      // Unikalny, 3-20 znaków
  email: string;         // Format email, unikalny
  firstName: string;     // Wymagane
  lastName: string;      // Wymagane
  phone?: string;        // Opcjonalny
  roleId: number;        // Wybór z listy ról
}
```

#### Walidacja:
- **Username** - alfanumeryczny, 3-20 znaków, unikalny
- **Email** - prawidłowy format, unikalny, aktywny
- **Hasło** - generowane automatycznie (pierwsze logowanie)
- **Rola** - musi istnieć w systemie

#### Automatyczne akcje po utworzeniu:
1. Generowanie hasła pierwszego logowania (8-12 znaków, secure)
2. Ustawienie flagi `requirePasswordChange: true`
3. Wysyłka emaila z danymi logowania na adres użytkownika
4. Zapis w dzienniku aktywności

#### Template emaila powitalnego:
```
Temat: Witaj w Grover Platform!

Witaj [Imię] [Nazwisko],

Twoje konto w systemie Grover Platform zostało utworzone.

Dane dostępowe:
- Adres systemu: [URL]
- Login: [username]
- Hasło: [wygenerowane_hasło]

WAŻNE: Przy pierwszym logowaniu zostaniesz poproszony o zmianę hasła.

Polityka haseł:
- Minimum 8 znaków
- Co najmniej 1 wielka litera
- Co najmniej 1 mała litera
- Co najmniej 1 cyfra
- Co najmniej 1 znak specjalny (!@#$%^&*()_+-=[]{};':"\\|,.<>/?)

Pozdrawiamy,
Zespół DER-MAG
```

### Resetowanie hasła
Funkcja dostępna tylko dla administratora:

#### Proces:
1. Administrator wpisuje nowe hasło (lub system generuje)
2. Hasło jest hashowane (bcrypt, 10 rounds)
3. Ustawienie flagi `requirePasswordChange: true`
4. Wysyłka emaila do użytkownika z nowym hasłem
5. Zapis akcji w dzienniku

#### Template emaila:
```
Temat: Reset hasła - Grover Platform

Witaj [Imię] [Nazwisko],

Twoje hasło w systemie Grover Platform zostało zresetowane przez administratora.

Nowe dane dostępowe:
- Adres systemu: [URL]
- Login: [username]
- Hasło: [nowe_hasło]

WAŻNE: Przy następnym logowaniu zostaniesz poproszony o zmianę hasła.

Polityka haseł:
- Minimum 8 znaków
- Co najmniej 1 wielka litera
- Co najmniej 1 mała litera
- Co najmniej 1 cyfra
- Co najmniej 1 znak specjalny

Pozdrawiamy,
Zespół DER-MAG
```

### Dezaktywacja użytkownika
Funkcja soft delete - dane pozostają w systemie:

#### Operacja:
- Ustawienie `active: false` w rekordzie użytkownika
- Wszystkie sesje użytkownika zostają unieważnione
- Użytkownik nie może się zalogować

#### Komunikat przy próbie logowania:
```
"Twoje konto zostało zablokowane. Skontaktuj się z administratorem."
```

#### Zachowanie unikalności:
- **Nieaktywne konta NIE blokują** unikalności username/email
- Możliwe utworzenie nowego konta z tym samym username/email
- Stare dane pozostają w bazie dla celów audytu

#### Reaktywacja:
- Endpoint: `/api/users/:id/activate` (POST)
- Tylko administrator
- Przywraca `active: true`
- Użytkownik może się ponownie zalogować

### Odzyskiwanie hasła
Publiczna strona dla użytkowników, którzy zapomnieli hasła:

#### Proces "Zapomniałem hasła":
1. **Użytkownik** - wchodzi na stronę `/forgot-password`
2. **Formularz** - podaje email lub username
3. **Weryfikacja** - system sprawdza czy konto istnieje i jest aktywne
4. **Generowanie hasła** - nowe hasło pierwszego logowania
5. **Email** - wysyłka na adres email użytkownika
6. **Flaga** - ustawienie `requirePasswordChange: true`

#### Zabezpieczenia:
- Rate limiting (max 3 próby na 15 minut na IP)
- Nie ujawniamy czy konto istnieje (generyczny komunikat)
- Email jest wysyłany tylko jeśli konto istnieje
- Token wygasa po użyciu

#### Komunikat (zawsze taki sam):
```
"Jeśli konto o podanym adresie email istnieje, wysłaliśmy instrukcje resetowania hasła."
```

## API Endpoints

| Metoda | Endpoint | Opis | Uprawnienia |
|--------|----------|------|-------------|
| GET | `/api/users` | Lista użytkowników (z paginacją) | admin |
| GET | `/api/users/:id` | Szczegóły użytkownika | admin |
| POST | `/api/users` | Tworzenie użytkownika | admin |
| PUT | `/api/users/:id` | Aktualizacja użytkownika | admin |
| DELETE | `/api/users/:id` | Soft delete (dezaktywacja) | admin |
| POST | `/api/users/:id/reset-password` | Reset hasła przez admina | admin |
| POST | `/api/users/:id/deactivate` | Dezaktywacja konta | admin |
| POST | `/api/users/:id/activate` | Aktywacja konta | admin |
| PUT | `/api/users/:id/role` | Zmiana roli użytkownika | admin |
| GET | `/api/users/:id/activity` | Historia aktywności | admin |
| GET | `/api/users/:id/activity/export` | Eksport aktywności (CSV) | admin |
| POST | `/api/auth/forgot-password` | Odzyskiwanie hasła (publiczne) | public |
| POST | `/api/auth/change-password` | Zmiana własnego hasła | authenticated |

## Przykłady użycia API

### Pobranie listy użytkowników

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "jkowalski",
      "email": "jan.kowalski@example.com",
      "firstName": "Jan",
      "lastName": "Kowalski",
      "role": {
        "id": 2,
        "name": "manager"
      },
      "active": true,
      "createdAt": "2026-01-01T10:00:00.000Z",
      "lastLogin": "2026-01-06T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 45
  }
}
```

### Utworzenie nowego użytkownika

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "anowak",
    "email": "anna.nowak@example.com",
    "firstName": "Anna",
    "lastName": "Nowak",
    "phone": "+48123456789",
    "roleId": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Użytkownik został utworzony. Email z danymi logowania został wysłany.",
  "data": {
    "id": 46,
    "username": "anowak",
    "email": "anna.nowak@example.com",
    "firstName": "Anna",
    "lastName": "Nowak",
    "requirePasswordChange": true,
    "active": true,
    "createdAt": "2026-01-06T10:15:00.000Z"
  }
}
```

### Resetowanie hasła

```bash
curl -X POST http://localhost:3000/api/users/46/reset-password \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "TempPass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Hasło zostało zresetowane. Email został wysłany do użytkownika."
}
```

### Dezaktywacja użytkownika

```bash
curl -X POST http://localhost:3000/api/users/46/deactivate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Użytkownik został dezaktywowany"
}
```

### Odzyskiwanie hasła (publiczne)

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "anna.nowak@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Jeśli konto o podanym adresie email istnieje, wysłaliśmy instrukcje resetowania hasła."
}
```

## Komunikaty błędów logowania

System zwraca odpowiednie komunikaty błędów w zależności od sytuacji:

| Sytuacja | Komunikat | HTTP Status |
|----------|-----------|-------------|
| Nieistniejący login | "Konto nie istnieje" | 401 |
| Błędne hasło | "Błędne hasło" | 401 |
| Zablokowane konto | "Twoje konto zostało zablokowane. Skontaktuj się z administratorem." | 403 |
| Wymagana zmiana hasła | Redirect to `/change-password` | 200 + flag |

**Uwaga:** Komunikaty są w języku polskim dla lepszego UX.

## Konfiguracja Email

System wysyła powiadomienia email w następujących sytuacjach:
- Utworzenie nowego konta
- Reset hasła przez administratora
- Odzyskiwanie hasła przez użytkownika

### Nadawca
**Email:** `smokip@der-mag.pl`  
**Nazwa:** Grover Platform / Zespół DER-MAG

### Zmienne środowiskowe

```env
# SMTP Configuration
SMTP_HOST=smtp.nazwa.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smokip@der-mag.pl
SMTP_PASS=your-smtp-password

# Email Settings
SMTP_FROM=smokip@der-mag.pl
EMAIL_FROM_NAME=Grover Platform

# Frontend URL (dla linków w emailach)
FRONTEND_URL=https://grover.der-mag.pl
APP_URL=https://grover.der-mag.pl
```

### Wymagania SMTP
- **Port:** 587 (TLS)
- **Szyfrowanie:** TLS (nie SSL)
- **Uwierzytelnianie:** Basic (username/password)
- **Serwer:** smtp.nazwa.pl (lub inny zgodny z SMTP)

## Bezpieczeństwo

### Hasła
- **Hashing:** bcrypt z 10 rounds
- **Minimalne wymagania:**
  - Minimum 8 znaków
  - Co najmniej 1 wielka litera
  - Co najmniej 1 mała litera
  - Co najmniej 1 cyfra
  - Co najmniej 1 znak specjalny
- **Hasło pierwszego logowania:** generowane losowo, spełnia wszystkie wymagania
- **Force password change:** wymuszenie zmiany przy pierwszym logowaniu

### Sesje
- **JWT Tokens:** Access token (8h), Refresh token (7d)
- **Token Rotation:** automatyczna rotacja przy odświeżeniu
- **Revocation:** wszystkie tokeny użytkownika unieważniane przy dezaktywacji

### Audyt
- **Activity Log:** wszystkie akcje użytkownika są logowane
- **Timestamps:** UTC timestamps dla wszystkich zdarzeń
- **IP Tracking:** IP address zapisywany przy logowaniu
- **User Agent:** informacja o przeglądarce/urządzeniu

### Rate Limiting
- **Logowanie:** max 5 prób na 15 minut na IP
- **Forgot Password:** max 3 próby na 15 minut na IP
- **API Calls:** 100 requestów na 15 minut na token

## Diagram Modułu

```
┌─────────────────────────────────────────────────────────────────┐
│                   MODUŁ ZARZĄDZANIA UŻYTKOWNIKAMI               │
│                        (Admin Only)                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Lista        │   │ Tworzenie    │   │ Zarządzanie  │
│ Użytkowników │   │ Użytkowników │   │ Rolami       │
│              │   │              │   │              │
│ • Paginacja  │   │ • Formularz  │   │ • 6 ról     │
│ • Filtrowanie│   │ • Walidacja  │   │ • Uprawnienia│
│ • Sortowanie │   │ • Auto email │   │ • Przypisanie│
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Profile      │   │ Historia     │   │ Reset/       │
│ Użytkowników │   │ Aktywności   │   │ Recovery     │
│              │   │              │   │              │
│ • Dane       │   │ • Dziennik   │   │ • Admin Reset│
│ • Edycja     │   │ • Export CSV │   │ • Self Reset │
│ • Historia   │   │ • Audyt      │   │ • Email      │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Roadmap

### Planowane funkcjonalności (przyszłe wersje):

- [ ] **Dwuskładnikowa autoryzacja (2FA)** - TOTP lub SMS
- [ ] **Single Sign-On (SSO)** - integracja z AD/LDAP
- [ ] **Polityki haseł** - konfigurowalne wymagania
- [ ] **Blokada konta** - automatyczna po n nieudanych logowań
- [ ] **Sesje równoległe** - limit aktywnych sesji na użytkownika
- [ ] **Raportowanie** - dashboard z metrykami użytkowników
- [ ] **Grupy użytkowników** - zarządzanie grupami zamiast indywidualnymi użytkownikami
- [ ] **Delegowanie uprawnień** - tymczasowe przyznanie uprawnień

## Wsparcie

W przypadku problemów z modułem zarządzania użytkownikami:
1. Sprawdź logi aplikacji (`/var/log/grover/`)
2. Zweryfikuj konfigurację SMTP
3. Sprawdź uprawnienia administratora
4. Skontaktuj się z zespołem development: smokip@der-mag.pl

---

**Ostatnia aktualizacja:** 2026-01-06  
**Wersja:** 1.0.0  
**Autor:** Cr@ck8502PL / DER-MAG
