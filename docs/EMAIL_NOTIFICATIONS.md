# System Powiadomień Email

## Przegląd

Grover Platform posiada zaawansowany system powiadomień email, który automatycznie informuje użytkowników o ważnych wydarzeniach w systemie. System wykorzystuje kolejkę asynchroniczną (Bull Queue + Redis) do niezawodnej wysyłki wiadomości.

## Konfiguracja

### Nadawca
**Email:** `smokip@der-mag.pl`  
**Nazwa:** Grover Platform / Zespół DER-MAG

### Zmienne środowiskowe

```bash
# SMTP Configuration
SMTP_HOST=smtp.nazwa.pl          # Adres serwera SMTP
SMTP_PORT=587                     # Port (domyślnie 587 dla TLS)
SMTP_SECURE=false                 # false dla TLS, true dla SSL
SMTP_USER=smokip@der-mag.pl      # Użytkownik SMTP
SMTP_PASS=your-smtp-password      # Hasło SMTP

# Email Settings
SMTP_FROM=smokip@der-mag.pl      # Adres nadawcy
EMAIL_FROM_NAME=Grover Platform   # Nazwa nadawcy

# Application URLs
APP_URL=https://grover.der-mag.pl           # URL aplikacji (do linków w emailach)
FRONTEND_URL=https://grover.der-mag.pl      # URL frontendu

# Redis (dla kolejki emaili)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                   # Opcjonalne

# Optional
SUPPORT_EMAIL=smokip@der-mag.pl   # Email do supportu
```

### Wymagania techniczne
- **Serwer SMTP:** smtp.nazwa.pl (lub inny zgodny)
- **Port:** 587 (TLS) lub 465 (SSL)
- **Protokół:** TLS/STARTTLS (nie SSL)
- **Uwierzytelnianie:** Basic (username + password)
- **Redis:** Wymagany dla kolejki emaili

## Typy Powiadomień

### Zarządzanie użytkownikami

| Trigger | Odbiorcy | Priorytet | Opis |
|---------|----------|-----------|------|
| Utworzenie konta | Nowy użytkownik | Normal | Dane logowania + polityka haseł |
| Reset hasła (admin) | Użytkownik | High | Nowe hasło + polityka haseł |
| Odzyskiwanie hasła | Użytkownik | High | Nowe hasło pierwszego logowania + link |
| Zmiana roli | Użytkownik | Normal | Informacja o nowej roli i uprawnieniach |
| Dezaktywacja konta | Użytkownik | High | Powiadomienie o zablokowaniu konta |
| Reaktywacja konta | Użytkownik | Normal | Informacja o przywróceniu dostępu |

### Workflow kontraktowy

| Trigger | Odbiorcy | Priorytet | Opis |
|---------|----------|-----------|------|
| Nowe zadanie kompletacji | workers, admins, managers | Normal | Powiadomienie o nowym zleceniu kompletacji |
| Zgłoszenie braków | smokip@der-mag.pl, managers | High | Lista brakujących materiałów z BOM |
| Zakończenie kompletacji | smokip@der-mag.pl, prefabricators, managers | Normal | Lista skompletowanych materiałów, gotowość do prefabrykacji |
| Nowe zadanie prefabrykacji | prefabricators | Normal | Powiadomienie o nowym zleceniu prefabrykacji |
| Zakończenie prefabrykacji | managers, coordinators | Normal | Urządzenia gotowe do instalacji, lista SN |
| Decyzja o kontynuacji mimo braków | manager (decydent), smokip@der-mag.pl | High | Potwierdzenie decyzji o kontynuacji |
| Alokacja IP | subsystem owner, managers | Normal | Przydzielone adresy IP dla podsystemu |

### Zadania i projekty

| Trigger | Odbiorcy | Priorytet | Opis |
|---------|----------|-----------|------|
| Utworzenie zadania | managers, admins | Normal | Nowe zadanie w systemie |
| Przypisanie zadania | assigned user | High | Użytkownik przypisany do zadania |
| Zmiana statusu | assigned user, manager | Normal | Status zadania zmieniony |
| Termin zbliża się | assigned user, manager | High | Zadanie zbliża się do deadline |
| Zadanie opóźnione | assigned user, manager, admin | Critical | Zadanie przekroczyło deadline |

## Szablony Email

### 1. Utworzenie konta / Reset hasła

**Temat:** `Twoje konto w Grover Platform`

**Szablon:**
```
Witaj [Imię] [Nazwisko],

Twoje konto w systemie Grover Platform zostało [utworzone/zresetowane].

Dane dostępowe:
- Adres systemu: [APP_URL]
- Login: [username]
- Hasło: [hasło]

WAŻNE: Przy pierwszym logowaniu zostaniesz poproszony o zmianę hasła.

Polityka haseł:
- Minimum 8 znaków
- Co najmniej 1 wielka litera (A-Z)
- Co najmniej 1 mała litera (a-z)
- Co najmniej 1 cyfra (0-9)
- Co najmniej 1 znak specjalny (!@#$%^&*()_+-=[]{};':"\\|,.<>/?)

Po zmianie hasła będziesz mógł korzystać ze wszystkich funkcji systemu.

Pozdrawiamy,
Zespół DER-MAG
```

**Zmienne:**
- `firstName` - Imię użytkownika
- `lastName` - Nazwisko użytkownika
- `username` - Login użytkownika
- `password` - Hasło (tylko przy utworzeniu/reset)
- `loginUrl` - Link do strony logowania

---

### 2. Odzyskiwanie hasła

**Temat:** `Odzyskiwanie hasła - Grover Platform`

**Szablon:**
```
Witaj [Imię] [Nazwisko],

Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w systemie Grover Platform.

Twoje nowe hasło tymczasowe:
[hasło]

Dane dostępowe:
- Adres systemu: [APP_URL]
- Login: [username]
- Hasło: [hasło podane powyżej]

WAŻNE: Przy następnym logowaniu zostaniesz poproszony o zmianę tego hasła.

Polityka haseł:
- Minimum 8 znaków
- Co najmniej 1 wielka litera (A-Z)
- Co najmniej 1 mała litera (a-z)
- Co najmniej 1 cyfra (0-9)
- Co najmniej 1 znak specjalny (!@#$%^&*()_+-=[]{};':"\\|,.<>/?)

Jeśli nie prosiłeś o reset hasła, skontaktuj się natychmiast z administratorem.

Pozdrawiamy,
Zespół DER-MAG
```

**Zmienne:**
- `firstName`, `lastName`, `username`
- `password` - Nowe hasło tymczasowe
- `loginUrl` - Link do logowania

---

### 3. Nowe zadanie kompletacji

**Temat:** `Nowe zadanie kompletacji - [Numer Podsystemu]`

**Szablon:**
```
Witaj [Imię],

Nowe zadanie kompletacji zostało przypisane:

Szczegóły zlecenia:
- Numer podsystemu: [subsystemNumber]
- Typ: [systemType]
- Ilość pozycji BOM: [itemCount]
- Priorytet: [priority]

Link do zadania: [taskUrl]

Prosimy o rozpoczęcie kompletacji i skanowanie materiałów zgodnie z BOM.

Pozdrawiamy,
System Grover Platform
```

**Zmienne:**
- `firstName` - Imię pracownika
- `subsystemNumber` - Numer podsystemu
- `systemType` - Typ systemu (SMW, CSDIP, etc.)
- `itemCount` - Liczba pozycji w BOM
- `priority` - Priorytet (niski/średni/wysoki)
- `taskUrl` - Link do zadania

---

### 4. Zgłoszenie braków

**Temat:** `⚠️ Zgłoszenie braków - [Numer Podsystemu]`

**Szablon:**
```
Uwaga: Zgłoszono braki w kompletacji!

Szczegóły:
- Numer podsystemu: [subsystemNumber]
- Typ systemu: [systemType]
- Data zgłoszenia: [reportDate]
- Zgłaszający: [reporterName]

Lista brakujących pozycji:
[missingItemsList]

Łączna liczba braków: [missingCount]

Wymagana decyzja managera o kontynuacji lub wstrzymaniu procesu.

Link do zlecenia: [orderUrl]

---
System Grover Platform
Automatyczna wiadomość - nie odpowiadaj
```

**Odbiorcy:** `smokip@der-mag.pl` + managers

**Zmienne:**
- `subsystemNumber`, `systemType`
- `reportDate` - Data zgłoszenia
- `reporterName` - Imię i nazwisko zgłaszającego
- `missingItemsList` - Formatowana lista braków
- `missingCount` - Liczba brakujących pozycji
- `orderUrl` - Link do zlecenia

---

### 5. Zakończenie kompletacji

**Temat:** `✅ Zakończono kompletację - [Numer Podsystemu]`

**Szablon:**
```
Witaj [Imię],

Kompletacja została zakończona pomyślnie.

Szczegóły:
- Numer podsystemu: [subsystemNumber]
- Typ systemu: [systemType]
- Skompletowane pozycje: [completedCount] / [totalCount]
- Numer palety: [palletNumber]
- Data zakończenia: [completionDate]

[bracki - jeśli występują]
Uwaga: Kompletacja z brakami - decyzja managera: kontynuować
Brakujące pozycje: [missingCount]
[/braki]

Materiały są gotowe do przekazania do prefabrykacji.

Link do zlecenia: [orderUrl]

Pozdrawiamy,
System Grover Platform
```

**Odbiorcy:** `smokip@der-mag.pl` + prefabricators + managers

**Zmienne:**
- `firstName`, `subsystemNumber`, `systemType`
- `completedCount`, `totalCount` - Liczniki pozycji
- `palletNumber` - Numer palety
- `completionDate` - Data zakończenia
- `missingCount` - Liczba braków (opcjonalnie)
- `orderUrl` - Link do zlecenia

---

### 6. Nowe zadanie prefabrykacji

**Temat:** `Nowe zadanie prefabrykacji - [Numer Podsystemu]`

**Szablon:**
```
Witaj [Imię],

Nowe zadanie prefabrykacji zostało przypisane.

Szczegóły:
- Numer podsystemu: [subsystemNumber]
- Typ systemu: [systemType]
- Ilość urządzeń: [deviceCount]
- Alokacja IP: [ipRange]
- NTP Server: [ntpServer]

Materiały dostępne na palecie: [palletNumber]

Link do zadania: [taskUrl]

Prosimy o:
1. Odbiór materiałów z magazynu
2. Konfigurację urządzeń (IP, NTP, parametry)
3. Weryfikację konfiguracji
4. Przypisanie numerów seryjnych

Pozdrawiamy,
System Grover Platform
```

**Zmienne:**
- `firstName`, `subsystemNumber`, `systemType`
- `deviceCount` - Liczba urządzeń do skonfigurowania
- `ipRange` - Przydzielony zakres IP
- `ntpServer` - Adres serwera NTP (= Gateway)
- `palletNumber` - Numer palety z materiałami
- `taskUrl` - Link do zadania

---

### 7. Zakończenie prefabrykacji

**Temat:** `✅ Zakończono prefabrykację - [Numer Podsystemu]`

**Szablon:**
```
Witaj [Imię],

Prefabrykacja została zakończona pomyślnie.

Szczegóły:
- Numer podsystemu: [subsystemNumber]
- Typ systemu: [systemType]
- Skonfigurowane urządzenia: [configuredCount]
- Data zakończenia: [completionDate]

Lista numerów seryjnych:
[serialNumbersList]

Urządzenia są gotowe do instalacji w terenie.

Link do zadania: [taskUrl]

Pozdrawiamy,
System Grover Platform
```

**Odbiorcy:** managers + coordinators

**Zmienne:**
- `firstName`, `subsystemNumber`, `systemType`
- `configuredCount` - Liczba skonfigurowanych urządzeń
- `completionDate` - Data zakończenia
- `serialNumbersList` - Formatowana lista SN
- `taskUrl` - Link do zadania

---

## Konfiguracja Kolejki Email

### Parametry kolejki

```typescript
{
  attempts: 3,              // Liczba prób wysyłki
  backoff: {
    type: 'exponential',    // Exponential backoff
    delay: 5000             // Bazowe opóźnienie 5s
  },
  removeOnComplete: 100,    // Przechowuj ostatnie 100 wysłanych
  removeOnFail: 1000        // Przechowuj ostatnie 1000 nieudanych
}
```

### Priorytety

- **Critical** (1) - Natychmiastowa wysyłka
- **High** (2) - Wysyłka w ciągu minuty
- **Normal** (5) - Standardowa kolejka (domyślne)
- **Low** (10) - Może poczekać

### Ponowne próby

W przypadku błędu wysyłki:
1. **Próba 1:** Natychmiast
2. **Próba 2:** Po 5 sekundach
3. **Próba 3:** Po 25 sekundach (5s * 5)

Po 3 nieudanych próbach email trafia do kolejki failed.

## Monitoring i Debugging

### Sprawdzenie statusu systemu

```bash
curl -X GET http://localhost:3000/api/notifications/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "connectionOk": true,
    "smtp": {
      "host": "smtp.nazwa.pl",
      "port": 587,
      "from": "smokip@der-mag.pl"
    }
  }
}
```

### Statystyki kolejki

```bash
curl -X GET http://localhost:3000/api/notifications/queue/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "waiting": 5,      // Emaile oczekujące
    "active": 2,       // Emaile w trakcie wysyłki
    "completed": 1523, // Wysłane pomyślnie
    "failed": 12,      // Nieudane wysyłki
    "delayed": 0       // Opóźnione
  }
}
```

### Nieudane wysyłki

```bash
curl -X GET http://localhost:3000/api/notifications/queue/failed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ponowienie nieudanego zadania

```bash
curl -X POST http://localhost:3000/api/notifications/queue/retry/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test wysyłki

```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com"}'
```

## Rozwiązywanie problemów

### Problem: Emaile nie są wysyłane

**Kroki diagnozy:**

1. **Sprawdź konfigurację:**
```bash
curl -X GET http://localhost:3000/api/notifications/config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Sprawdź Redis:**
```bash
redis-cli ping
# Powinno zwrócić: PONG
```

3. **Sprawdź logi aplikacji:**
```bash
tail -f /var/log/grover/application.log | grep email
```

4. **Sprawdź kolejkę:**
```bash
curl -X GET http://localhost:3000/api/notifications/queue/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Problem: SMTP Connection Timeout

**Możliwe przyczyny:**
- Firewall blokuje port 587
- Nieprawidłowy SMTP_HOST
- Błędne dane uwierzytelniające

**Rozwiązanie:**
```bash
# Test połączenia SMTP
telnet smtp.nazwa.pl 587

# Sprawdź zmienne środowiskowe
echo $SMTP_HOST
echo $SMTP_PORT
```

### Problem: Kolejka się zapełnia

**Rozwiązanie:**
```bash
# Wyczyść kolejkę (admin only)
curl -X POST http://localhost:3000/api/notifications/queue/clear \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

### 1. Nie przeciążaj kolejki
- Grupuj powiadomienia gdzie to możliwe
- Używaj odpowiednich priorytetów
- Rozważ digest emails dla masowych powiadomień

### 2. Monitoruj regularnie
- Sprawdzaj statystyki kolejki codziennie
- Analizuj nieudane wysyłki
- Ustaw alerty dla `failed > 50`

### 3. Template maintenance
- Testuj szablony przed wdrożeniem
- Używaj preview przed wysyłką
- Przechowuj historie zmian szablonów

### 4. Bezpieczeństwo
- Nigdy nie commituj SMTP credentials
- Używaj encrypted secrets (dotenv-vault)
- Rotuj hasła SMTP regularnie
- Monitoruj logi wysyłek

## API Reference

Pełna dokumentacja API znajduje się w pliku [backend/EMAIL_SYSTEM.md](../backend/EMAIL_SYSTEM.md).

## Wsparcie

W przypadku problemów:
1. Sprawdź tę dokumentację
2. Zobacz logi aplikacji
3. Skontaktuj się: smokip@der-mag.pl

---

**Ostatnia aktualizacja:** 2026-01-06  
**Wersja:** 1.0.0  
**Autor:** Cr@ck8502PL / DER-MAG
