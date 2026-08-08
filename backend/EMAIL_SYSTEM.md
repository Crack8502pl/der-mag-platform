# System Emaili - Grover Platform

Kompletny system wysyłania powiadomień email z integracją serwera SMTP nazwa.pl.

## 📋 Spis treści

- [Konfiguracja](#konfiguracja)
- [Architektura](#architektura)
- [Szablony Emaili](#szablony-emaili)
- [API Endpoints](#api-endpoints)
- [Integracja](#integracja)
- [Testowanie](#testowanie)
- [Troubleshooting](#troubleshooting)

## ⚙️ Konfiguracja

### Wymagania

- **Serwer SMTP**: nazwa.pl
- **Redis**: Do obsługi kolejki emaili (Bull Queue)
- **Node.js**: >= 14.0.0

### Zmienne środowiskowe

Dodaj następujące zmienne do pliku `.env`:

```bash
# Konfiguracja SMTP nazwa.pl
SMTP_HOST=smtp.nazwa.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@your-domain.pl
SMTP_PASSWORD=your-password

# Dane nadawcy
EMAIL_FROM_NAME=Grover Platform
EMAIL_FROM_ADDRESS=noreply@your-domain.pl

# Redis dla kolejki emaili
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=optional-password

# URL frontendu (dla linków w emailach)
FRONTEND_URL=http://localhost:3001

# Opcjonalne
SUPPORT_EMAIL=support@your-domain.pl
```

### Konfiguracja SMTP nazwa.pl

1. **Port**: 587 (TLS)
2. **Bezpieczeństwo**: TLS (nie SSL)
3. **Uwierzytelnianie**: Basic (login/hasło)
4. **Serwer**: smtp.nazwa.pl

⚠️ **Uwaga**: Upewnij się, że konto email w nazwa.pl ma włączoną obsługę SMTP i nie ma aktywowanej autoryzacji dwuskładnikowej (2FA).

## 🏗️ Architektura

System składa się z trzech głównych komponentów:

### 1. EmailService

Główny serwis do wysyłania emaili z użyciem Nodemailer i szablonów Handlebars.

**Lokalizacja**: `src/services/EmailService.ts`

**Funkcjonalności**:
- Wysyłka emaili przez SMTP
- Renderowanie szablonów Handlebars
- Cache szablonów dla wydajności
- Weryfikacja połączenia SMTP
- Obsługa załączników

**Metody pomocnicze**:
- `sendTaskCreatedEmail()` - Email o nowym zadaniu
- `sendTaskAssignedEmail()` - Email o przypisaniu zadania
- `sendTaskCompletedEmail()` - Email o zakończeniu zadania
- `sendTaskOverdueEmail()` - Email o opóźnionym zadaniu
- `sendWelcomeEmail()` - Powitalny email dla nowego użytkownika
- `sendPasswordResetEmail()` - Email z linkiem do resetu hasła

### 2. EmailQueueService

Asynchroniczna kolejka emaili oparta na Bull Queue i Redis.

**Lokalizacja**: `src/services/EmailQueueService.ts`

**Funkcjonalności**:
- Kolejkowanie emaili
- Automatyczne ponowne próby (3 razy z exponential backoff)
- Priorytety wysyłki (high, normal, low)
- Statystyki kolejki
- Obsługa nieudanych wysyłek

**Konfiguracja ponownych prób**:
- Liczba prób: 3
- Opóźnienie bazowe: 5000ms
- Typ: exponential backoff

### 3. NotificationController

Kontroler API do zarządzania systemem emaili.

**Lokalizacja**: `src/controllers/NotificationController.ts`

## 📧 Szablony Emaili

Wszystkie szablony znajdują się w `src/templates/emails/` i wykorzystują Handlebars.

### 1. task-created.hbs
Powiadomienie o utworzeniu nowego zadania.

**Kontekst**:
```typescript
{
  taskNumber: string;
  taskName: string;
  taskType: string;
  createdBy: string;
  location?: string;
  url: string;
}
```

**Wysyłane do**: Managerowie i administratorzy

### 2. task-assigned.hbs
Powiadomienie o przypisaniu zadania.

**Kontekst**:
```typescript
{
  taskNumber: string;
  taskName: string;
  taskType: string;
  assignedBy: string;
  location?: string;
  priority?: number;
  url: string;
}
```

**Wysyłane do**: Przypisani użytkownicy

### 3. task-completed.hbs
Powiadomienie o zakończeniu zadania.

**Kontekst**:
```typescript
{
  taskNumber: string;
  taskName: string;
  taskType: string;
  location?: string;
  status: string;
  url: string;
}
```

**Wysyłane do**: Przypisani użytkownicy, managerowie i administratorzy

### 4. task-overdue.hbs
Alert o opóźnionym zadaniu.

**Kontekst**:
```typescript
{
  taskNumber: string;
  taskName: string;
  taskType: string;
  assignedTo?: string;
  location?: string;
  dueDate?: string;
  url: string;
}
```

**Priorytet**: HIGH

### 5. user-welcome.hbs
Powitalny email dla nowego użytkownika.

**Kontekst**:
```typescript
{
  username: string;
  firstName: string;
  loginUrl: string;
  supportEmail?: string;
}
```

### 6. password-reset.hbs
Email z linkiem do resetu hasła.

**Kontekst**:
```typescript
{
  username: string;
  firstName: string;
  resetUrl: string;
  expiresIn?: string;
}
```

**Priorytet**: HIGH

### Zmienne globalne w szablonach

Każdy szablon ma dostęp do następujących zmiennych:
- `currentYear` - Bieżący rok
- `platformName` - Nazwa platformy (z konfiguracji)
- `frontendUrl` - URL frontendu

### Tworzenie nowego szablonu

1. Utwórz plik `.hbs` w `src/templates/emails/`
2. Użyj istniejących szablonów jako wzór
3. Dodaj nowy typ szablonu do `EmailTemplate` enum w `src/types/EmailTypes.ts`
4. Utwórz metodę pomocniczą w `EmailService.ts` (opcjonalnie)

## 🔌 API Endpoints

Wszystkie endpointy wymagają uwierzytelnienia (JWT token).

### POST /api/notifications/test

Wysyła testowy email.

**Body**:
```json
{
  "to": "test@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email testowy wysłany do: test@example.com"
}
```

### GET /api/notifications/queue/stats

Zwraca statystyki kolejki emaili.

**Response**:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 0
  }
}
```

### GET /api/notifications/queue/failed

Zwraca listę nieudanych wysyłek.

**Query params**:
- `start` (default: 0)
- `end` (default: 10)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "data": { /* email data */ },
      "failedReason": "SMTP connection failed",
      "attemptsMade": 3,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### POST /api/notifications/queue/retry/:jobId

Ponawia nieudane zadanie wysyłki.

**Response**:
```json
{
  "success": true,
  "message": "Zadanie 123 zostało ponowione"
}
```

### POST /api/notifications/queue/clear

Czyści kolejkę emaili. **Wymaga uprawnień administratora**.

**Response**:
```json
{
  "success": true,
  "message": "Kolejka emaili została wyczyszczona"
}
```

### GET /api/notifications/config

Sprawdza konfigurację systemu emaili.

**Response**:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "connectionOk": true,
    "message": "System emaili jest poprawnie skonfigurowany"
  }
}
```

## 🔗 Integracja

### Automatyczne wysyłanie emaili

System automatycznie wysyła emaile w następujących przypadkach:

#### 1. Utworzenie zadania
**Lokalizacja**: `TaskController.create()`

Gdy nowe zadanie zostanie utworzone, email jest wysyłany do wszystkich managerów i administratorów.

#### 2. Przypisanie zadania
**Lokalizacja**: `TaskController.assign()`

Gdy użytkownik zostanie przypisany do zadania, otrzymuje email z powiadomieniem.

#### 3. Zakończenie zadania
**Lokalizacja**: `TaskController.updateStatus()`

Gdy status zadania zmieni się na "completed", email jest wysyłany do przypisanych użytkowników oraz managerów.

#### 4. Utworzenie użytkownika
**Lokalizacja**: `UserController.create()`

Nowy użytkownik otrzymuje powitalny email z danymi do logowania.

### Ręczne wysyłanie emaili

```typescript
import EmailQueueService from '../services/EmailQueueService';
import { EmailTemplate } from '../types/EmailTypes';

// Dodaj email do kolejki
await EmailQueueService.addToQueue({
  to: 'user@example.com',
  subject: 'Temat emaila',
  template: EmailTemplate.TASK_CREATED,
  context: {
    taskNumber: 'TSK-000001',
    taskName: 'Test',
    // ... inne dane
  },
  priority: 'high', // opcjonalnie
});

// Dodaj z opóźnieniem (5 sekund)
await EmailQueueService.addToQueue(emailOptions, 5000);
```

### Bezpośrednie wysyłanie (bez kolejki)

```typescript
import EmailService from '../services/EmailService';

// Bezpośrednia wysyłka (synchroniczna)
await EmailService.sendEmail({
  to: 'user@example.com',
  subject: 'Pilna wiadomość',
  template: EmailTemplate.TASK_OVERDUE,
  context: { /* ... */ },
});
```

## 🧪 Testowanie

### 1. Test połączenia SMTP

```bash
curl -X GET http://localhost:3000/api/notifications/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Wysłanie testowego emaila

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@example.com"}'
```

### 3. Sprawdzenie statystyk kolejki

```bash
curl -X GET http://localhost:3000/api/notifications/queue/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test w środowisku development

W trybie development możesz użyć narzędzia [Mailtrap](https://mailtrap.io/) lub [MailHog](https://github.com/mailhog/MailHog) do przechwytywania emaili bez wysyłania ich na prawdziwe adresy.

## 🔧 Troubleshooting

### Problem: Emaile nie są wysyłane

**Możliwe przyczyny**:

1. **Brak konfiguracji SMTP**
   - Sprawdź czy wszystkie zmienne środowiskowe są ustawione
   - Użyj endpointu `/api/notifications/config` do weryfikacji

2. **Redis nie działa**
   - Upewnij się że Redis jest uruchomiony: `redis-cli ping`
   - Sprawdź logi serwera podczas startu

3. **Błędne dane SMTP**
   - Zweryfikuj login i hasło w nazwa.pl
   - Sprawdź czy konto ma włączone SMTP
   - Upewnij się że 2FA jest wyłączone

### Problem: Połączenie SMTP timeout

**Rozwiązanie**:
- Sprawdź firewall - port 587 musi być otwarty
- Zweryfikuj czy `SMTP_HOST` jest poprawny
- Niektóre sieci blokują port 587 - spróbuj z innej sieci

### Problem: Kolejka się zapełnia

**Rozwiązanie**:
```bash
# Sprawdź statystyki
curl -X GET http://localhost:3000/api/notifications/queue/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Wyczyść kolejkę (admin only)
curl -X POST http://localhost:3000/api/notifications/queue/clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Problem: Nieudane wysyłki

**Rozwiązanie**:
```bash
# Zobacz nieudane zadania
curl -X GET http://localhost:3000/api/notifications/queue/failed \
  -H "Authorization: Bearer YOUR_TOKEN"

# Ponów konkretne zadanie
curl -X POST http://localhost:3000/api/notifications/queue/retry/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Debugging

Włącz szczegółowe logi:
```bash
NODE_ENV=development npm run dev
```

Sprawdź logi w konsoli:
- ✅ - Operacja zakończona sukcesem
- ❌ - Błąd
- ⚠️ - Ostrzeżenie
- 📧 - Operacja związana z emailem

## 📊 Monitoring

### Metryki do monitorowania

1. **Statystyki kolejki** (`/api/notifications/queue/stats`)
   - `waiting` - emaile oczekujące
   - `active` - emaile wysyłane
   - `completed` - wysłane pomyślnie
   - `failed` - nieudane wysyłki

2. **Nieudane wysyłki** (`/api/notifications/queue/failed`)
   - Sprawdzaj regularnie
   - Analizuj przyczyny błędów

3. **Logi serwera**
   - Monitoruj logi aplikacji
   - Zwróć uwagę na powtarzające się błędy

## 🔒 Bezpieczeństwo

### Dobre praktyki

1. **Nigdy nie commituj credentials**
   - Zawsze używaj `.env`
   - Dodaj `.env` do `.gitignore`

2. **Używaj TLS**
   - Port 587 z TLS (nie SSL)
   - `SMTP_SECURE=false` dla TLS

3. **Rate limiting**
   - System automatycznie ogranicza liczbę prób
   - Rozważ dodanie rate limitingu na endpointy testowe

4. **Autoryzacja**
   - Wszystkie endpointy wymagają JWT
   - Endpoint `/clear` wymaga uprawnień admin

5. **Validacja danych wejściowych**
   - Adresy email są walidowane
   - Zabezpieczenie przed injection

## 📝 Changelog

### v1.0.0 (2024-01-15)
- ✨ Inicjalna implementacja systemu emaili
- ✨ 6 szablonów emaili
- ✨ Integracja z nazwa.pl SMTP
- ✨ Bull Queue dla asynchronicznej wysyłki
- ✨ API do zarządzania powiadomieniami
- ✨ Automatyczne powiadomienia o zadaniach i użytkownikach

## 📚 Dodatkowe zasoby

- [Nodemailer Documentation](https://nodemailer.com/)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [Bull Queue Documentation](https://optimalbits.github.io/bull/)
- [nazwa.pl SMTP Settings](https://www.nazwa.pl/pomoc)

## 🤝 Support

W przypadku problemów:
1. Sprawdź sekcję [Troubleshooting](#troubleshooting)
2. Przejrzyj logi aplikacji
3. Skontaktuj się z zespołem development

---

**Ostatnia aktualizacja**: 2024-01-15
**Wersja**: 1.0.0

---

## 🔀 Master Switch — Globalny przełącznik automatyzacji emaili

### Co robi

Master switch to globalny przełącznik, który blokuje **wszystkie** automatyczne emaile w systemie.  
Gdy jest wyłączony (`enabled: false`), żaden automatyczny email nie zostanie wysłany niezależnie od ustawień per-user.

### Kolejność decyzji

```
1. Globalny master switch → OFF  =>  BLOKADA wszystkich automatycznych emaili
2. Blokada per-user (emailAutomationPaused) → true  =>  BLOKADA emaili dla danego użytkownika
```

### API — Endpointy

#### GET `/api/admin/settings/email-automation`

Odczyt aktualnego stanu przełącznika globalnego.

**Odpowiedź:**
```json
{ "success": true, "data": { "enabled": true } }
```

#### PATCH `/api/admin/settings/email-automation`

Ustawienie przełącznika globalnego.

**Payload:**
```json
{ "enabled": false }
```

- `enabled` musi być wartością `boolean` (`true` lub `false`).
- Wysłanie stringa (`"false"`, `"true"`, `"0"`, `"1"`) zwraca HTTP **400**.

**Odpowiedź (sukces):**
```json
{ "success": true, "data": { "enabled": false } }
```

**Odpowiedź (zły typ):**
```json
{ "success": false, "message": "Pole enabled musi być typu boolean" }
```

### Implementacja

- `EmailAutomationGuardService.isGlobalEnabled()` — odczyt stanu z DB (z cache 5 s).
- `EmailAutomationAdminService.setGlobalSetting(enabled, adminId)` — zapis do DB + audit log + invalidacja cache.
- Każda zmiana jest logowana w tabeli `email_automation_audit_log`.

### Znane regresje i naprawione bugi

**Bug (naprawiony):** Statyczne metody kontrolera używały `this.ensureAdminAccess()`.  
Gdy Express wywoływał metodę jako callback (oderwany od klasy), `this` był `undefined` w trybie strict,  
co powodowało `Unhandled Rejection` i zawieszony request (`- - ms - -` w logach).  
**Fix:** Zmiana na jawne `EmailAutomationAdminController.ensureAdminAccess()`.
