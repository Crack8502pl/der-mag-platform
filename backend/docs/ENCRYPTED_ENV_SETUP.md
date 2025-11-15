# 🔒 Encrypted Environment Variables Setup

## Spis treści

- [Wprowadzenie](#wprowadzenie)
- [Jak to działa](#jak-to-działa)
- [Wymagania](#wymagania)
- [Setup dla developera](#setup-dla-developera)
- [Setup dla produkcji](#setup-dla-produkcji)
- [Jak dodać nową zmienną](#jak-dodać-nową-zmienną)
- [Jak rotować secrets](#jak-rotować-secrets)
- [Troubleshooting](#troubleshooting)

---

## Wprowadzenie

Der-Mag Platform używa **dotenv-vault** do zarządzania wrażliwymi danymi środowiskowymi. Zamiast trzymać hasła i klucze w plaintext plikach `.env`, system szyfruje je i przechowuje w zaszyfrowanym pliku `.env.vault`.

### Dlaczego dotenv-vault?

✅ **Bezpieczeństwo**: Secrets są szyfrowane AES-256-GCM  
✅ **Łatwe wdrożenie**: Zero breaking changes w kodzie  
✅ **Współpraca zespołowa**: Bezpieczne udostępnianie secrets  
✅ **Środowiska**: Osobne klucze dla dev, staging, production  
✅ **Audit trail**: Historia zmian w vault  

---

## Jak to działa

```
┌─────────────────────────────────────────────────────────────┐
│                   LOKALNE ŚRODOWISKO                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  .env                    .env.keys             .env.vault   │
│  (plaintext)            (deszyfrujące)        (zaszyfrowany)│
│  ┌─────────┐            ┌──────────┐          ┌──────────┐ │
│  │DB_PASS= │  encrypt   │dev: key1 │          │encrypted │ │
│  │secret123│──────────>│prod:key2 │────────>│blob...   │ │
│  └─────────┘            └──────────┘          └──────────┘ │
│      ↑                       ↑                      ↓       │
│   local only            local only            can commit   │
│   .gitignore            .gitignore            to repo!     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PRODUKCYJNY SERWER                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DOTENV_VAULT_PRODUCTION_KEY           .env.vault          │
│  (environment variable)                (from repo)         │
│  ┌────────────────────┐                ┌──────────┐        │
│  │dotenv://:key_xxx...│   decrypt      │encrypted │        │
│  │                    │──────────────>│blob...   │        │
│  └────────────────────┘                └──────────┘        │
│          ↓                                    ↓             │
│    używany przez app             automatycznie deszyfrowany │
│    do deszyfracji                do process.env             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Kluczowe koncepty:

1. **`.env`** - Twój lokalny plik z plaintext secrets (nigdy nie commitowany)
2. **`.env.vault`** - Zaszyfrowana wersja secrets (bezpieczne do commita)
3. **`.env.keys`** - Klucze deszyfrujące dla każdego środowiska (nigdy nie commitowane)
4. **`.env.me`** - Twój osobisty klucz (nigdy nie commitowany)
5. **`DOTENV_VAULT_*_KEY`** - Environment variable z kluczem dla środowiska

---

## Wymagania

- Node.js >= 20.0.0
- npm >= 9.0.0
- Dostęp do internetu (dla synchronizacji z dotenv-vault)
- Konto na dotenv.org (opcjonalne, dla zespołowej synchronizacji)

---

## Setup dla developera

### 🚀 Pierwsza konfiguracja (nowy developer w projekcie)

#### Opcja A: Używając istniejącego vault (zalecane dla zespołu)

Jeśli projekt już ma skonfigurowany vault, poproś team leadera o klucz development:

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Crack8502pl/der-mag-platform.git
cd der-mag-platform/backend

# 2. Zainstaluj zależności
npm install

# 3. Team leader udostępni Ci klucz development
# Dodaj go do swojego lokalnego .env:
echo "DOTENV_VAULT_DEVELOPMENT_KEY=dotenv://:key_xxxxxxxxxx" > .env

# 4. Aplikacja automatycznie deszyfuje .env.vault przy starcie
npm run dev

# ✅ Gotowe! Nie potrzebujesz lokalnego plaintext .env
```

#### Opcja B: Inicjalizacja nowego vault (pierwszy developer w projekcie)

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Crack8502pl/der-mag-platform.git
cd der-mag-platform/backend

# 2. Zainstaluj zależności
npm install

# 3. Stwórz lokalny .env z wartościami developerskimi
cp .env.example .env
nano .env  # Wypełnij swoimi wartościami

# 4. Zainicjalizuj nowy vault
npm run env:init

# To utworzy:
# - .env.me (twój osobisty klucz)
# - .env.keys (klucze środowiskowe)

# 5. Push lokalnego .env do vault
npm run env:push

# To zaszyfruje i wyśle secrets do vault

# 6. Zbuduj zaszyfrowany plik .env.vault
npm run env:build

# To utworzy .env.vault który możesz commitować

# 7. Commituj .env.vault do repo
git add .env.vault
git commit -m "chore: initialize encrypted secrets vault"
git push

# 8. Udostępnij klucze teamowi
npm run env:keys

# Pokaże klucze dla różnych środowisk:
# dotenv://:key_xxx - development
# dotenv://:key_yyy - production
# Wyślij te klucze bezpiecznym kanałem (np. 1Password, signal)
```

### 🔄 Codzienna praca

Gdy vault jest już skonfigurowany, po prostu:

```bash
# Start aplikacji
npm run dev

# Aplikacja automatycznie:
# 1. Sprawdzi czy masz DOTENV_VAULT_DEVELOPMENT_KEY w .env
# 2. Jeśli tak, deszyfuje .env.vault
# 3. Jeśli nie, używa lokalnego .env (backward compatible!)
```

### 📥 Pull zmian od zespołu

Gdy ktoś dodał nowe secrets:

```bash
# 1. Pull zmian z repo
git pull

# .env.vault został zaktualizowany

# 2. Restart aplikacji
npm run dev

# ✅ Nowe secrets automatycznie dostępne!
```

---

## Setup dla produkcji

### 🚀 Deployment na serwer produkcyjny

**WAŻNE**: Na produkcji NIE POTRZEBUJESZ pliku `.env`! Tylko klucz deszyfrujący.

#### Krok 1: Przygotowanie klucza produkcyjnego

Lokalnie (na swoim komputerze):

```bash
# Pokaż wszystkie klucze
npm run env:keys

# Skopiuj klucz production:
# dotenv://:key_production_xxxxxxxxxxxxx
```

#### Krok 2: Konfiguracja serwera

##### Dla systemd (Ubuntu/Debian):

```bash
# 1. SSH do serwera
ssh user@production-server

# 2. Sklonuj repo
git clone https://github.com/Crack8502pl/der-mag-platform.git
cd der-mag-platform/backend

# 3. Zainstaluj zależności
npm install

# 4. Build aplikacji
npm run build

# 5. Ustaw environment variable z kluczem
export DOTENV_VAULT_PRODUCTION_KEY="dotenv://:key_production_xxxxxxxxxxxxx"

# 6. Stwórz systemd service
sudo nano /etc/systemd/system/der-mag-backend.service
```

Treść service file:

```ini
[Unit]
Description=Der-Mag Platform Backend
After=network.target postgresql.service

[Service]
Type=simple
User=dermag
WorkingDirectory=/home/dermag/der-mag-platform/backend
Environment="NODE_ENV=production"
Environment="DOTENV_VAULT_PRODUCTION_KEY=dotenv://:key_production_xxxxxxxxxxxxx"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 7. Uruchom service
sudo systemctl daemon-reload
sudo systemctl enable der-mag-backend
sudo systemctl start der-mag-backend

# 8. Sprawdź status
sudo systemctl status der-mag-backend
```

##### Dla Docker:

```dockerfile
# Dockerfile już istnieje w projekcie
# Build image:
docker build -t der-mag-backend:latest .

# Run z kluczem jako env var:
docker run -d \
  --name der-mag-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DOTENV_VAULT_PRODUCTION_KEY="dotenv://:key_production_xxxxxxxxxxxxx" \
  der-mag-backend:latest
```

##### Dla Docker Compose:

```yaml
version: '3.8'
services:
  api:
    image: der-mag-backend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DOTENV_VAULT_PRODUCTION_KEY=dotenv://:key_production_xxxxxxxxxxxxx
    depends_on:
      - postgres
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dermag_platform
      POSTGRES_USER: dermag_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data

secrets:
  db_password:
    external: true

volumes:
  pgdata:
```

##### Dla AWS ECS/Fargate:

Dodaj do Task Definition jako environment variable:

```json
{
  "environment": [
    {
      "name": "NODE_ENV",
      "value": "production"
    },
    {
      "name": "DOTENV_VAULT_PRODUCTION_KEY",
      "value": "dotenv://:key_production_xxxxxxxxxxxxx"
    }
  ]
}
```

Lub lepiej - użyj AWS Secrets Manager:

```json
{
  "secrets": [
    {
      "name": "DOTENV_VAULT_PRODUCTION_KEY",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:dermag/vault-key"
    }
  ]
}
```

##### Dla Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: der-mag-vault-key
type: Opaque
stringData:
  key: "dotenv://:key_production_xxxxxxxxxxxxx"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: der-mag-backend
spec:
  template:
    spec:
      containers:
      - name: api
        image: der-mag-backend:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DOTENV_VAULT_PRODUCTION_KEY
          valueFrom:
            secretKeyRef:
              name: der-mag-vault-key
              key: key
```

#### Krok 3: Weryfikacja

```bash
# Sprawdź logi
sudo journalctl -u der-mag-backend -f

# Lub dla Docker:
docker logs -f der-mag-api

# Powinieneś zobaczyć:
# ✅ Serwer działa na porcie: 3000
# ✅ Environment: production
```

### 🔐 Bezpieczne przechowywanie klucza produkcyjnego

**NIGDY nie commituj klucza produkcyjnego do repo!**

Zalecane metody przechowywania:

1. **AWS Secrets Manager** (najlepsze dla AWS)
2. **Azure Key Vault** (najlepsze dla Azure)
3. **Google Secret Manager** (najlepsze dla GCP)
4. **HashiCorp Vault** (dla on-premise)
5. **1Password / LastPass** (dla małych zespołów)
6. **Environment variables** na serwerze (minimum)

---

## Jak dodać nową zmienną

### Proces krok po kroku:

```bash
# 1. Dodaj zmienną do lokalnego .env
echo "NEW_API_KEY=super-secret-key-123" >> .env

# 2. Push do vault
npm run env:push

# To zaktualizuje vault o nową zmienną

# 3. Zbuduj nowy zaszyfrowany plik
npm run env:build

# To zaktualizuje .env.vault

# 4. Commituj zaktualizowany .env.vault
git add .env.vault
git commit -m "feat: add NEW_API_KEY to vault"
git push

# 5. Poinformuj zespół
# Wyślij wiadomość na Slack/Teams:
# "Added NEW_API_KEY to vault. Pull latest changes and restart your dev server."

# 6. Zaktualizuj kod do używania nowej zmiennej
# src/config/newFeature.ts
export const newApiKey = process.env.NEW_API_KEY;

# 7. Zaktualizuj .env.example
echo "# New API Key for feature X" >> .env.example
echo "NEW_API_KEY=your-key-here" >> .env.example
```

### Dla środowiska produkcyjnego:

```bash
# 1. Dodaj wartość produkcyjną do .env.production lokalnie
echo "NEW_API_KEY=production-key-456" > .env.production

# 2. Push do vault z flagą production
DOTENV_VAULT=production npm run env:push

# 3. Rebuild vault
npm run env:build

# 4. Commit i push
git add .env.vault
git commit -m "feat: add production value for NEW_API_KEY"
git push

# 5. Deploy na produkcję
# Restart aplikacji - automatycznie pobierze nową wartość
sudo systemctl restart der-mag-backend
```

---

## Jak rotować secrets

### Rotacja hasła do bazy danych:

```bash
# 1. Zmień hasło w bazie danych
psql -U postgres
ALTER USER dermag_user WITH PASSWORD 'new-secure-password';
\q

# 2. Zaktualizuj lokalny .env
nano .env
# Zmień DB_PASSWORD=new-secure-password

# 3. Push do vault
npm run env:push

# 4. Rebuild vault
npm run env:build

# 5. Commit
git add .env.vault
git commit -m "security: rotate database password"
git push

# 6. Zaktualizuj produkcję
# Najpierw zmień hasło w produkcyjnej bazie
ssh production-server
psql -U postgres -d production_db
ALTER USER dermag_user WITH PASSWORD 'new-prod-password';

# 7. Zaktualizuj .env.production lokalnie
echo "DB_PASSWORD=new-prod-password" >> .env.production

# 8. Push production secrets
DOTENV_VAULT=production npm run env:push
npm run env:build

# 9. Commit i deploy
git add .env.vault
git commit -m "security: rotate production database password"
git push

# 10. Restart produkcyjnej aplikacji
sudo systemctl restart der-mag-backend
```

### Rotacja JWT secret:

⚠️ **UWAGA**: Zmiana JWT_SECRET wyloguje wszystkich użytkowników!

```bash
# 1. Wygeneruj nowy secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Zaktualizuj .env
nano .env
# JWT_SECRET=nowy-wygenerowany-secret

# 3. Push, build, commit
npm run env:push
npm run env:build
git add .env.vault
git commit -m "security: rotate JWT secret"
git push

# 4. Zaplanuj maintenance window dla produkcji
# Poinformuj użytkowników o konieczności ponownego logowania

# 5. Rotacja na produkcji (podczas maintenance)
echo "JWT_SECRET=new-prod-jwt-secret" >> .env.production
DOTENV_VAULT=production npm run env:push
npm run env:build
git push

# 6. Deploy
sudo systemctl restart der-mag-backend

# ✅ Wszyscy użytkownicy będą musieli zalogować się ponownie
```

### Best practices rotacji:

1. **Harmonogram**: Rotuj secrets co 90 dni (minimum)
2. **Dokumentuj**: Zapisuj daty rotacji w 1Password/LastPass
3. **Testuj**: Zawsze najpierw testuj na developmencie
4. **Komunikuj**: Poinformuj zespół przed rotacją produkcyjną
5. **Backup**: Zachowaj stary secret przez 24h dla rollback

---

## Troubleshooting

### Problem: "Missing .env.vault file"

```bash
# Rozwiązanie: Build vault file
npm run env:build

# Jeśli nadal błąd, sprawdź czy .env istnieje:
ls -la .env

# Jeśli nie, utwórz z example:
cp .env.example .env
```

### Problem: "Invalid decryption key"

```bash
# Przyczyna: Masz nieaktualny klucz deszyfrujący

# Rozwiązanie 1: Pull latest .env.vault
git pull

# Rozwiązanie 2: Poproś o aktualny klucz
# Zapytaj team leadera o aktualny DOTENV_VAULT_DEVELOPMENT_KEY

# Rozwiązanie 3: Użyj lokalnego .env (fallback)
# Usuń DOTENV_VAULT_DEVELOPMENT_KEY z .env
# Aplikacja automatycznie użyje lokalnego plaintext .env
```

### Problem: "Cannot connect to dotenv-vault server"

```bash
# Przyczyna: Brak internetu lub firewall blokuje vault.dotenv.org

# Rozwiązanie: Aplikacja automatycznie fallback do lokalnego .env
# Sprawdź połączenie:
curl -I https://vault.dotenv.org

# Jeśli firewall blokuje, dodaj do whitelist:
# - vault.dotenv.org
# - api.dotenv.org
```

### Problem: "Environment variable not loaded"

```bash
# Debug: Sprawdź co jest załadowane
node -e "require('dotenv-vault/config'); console.log(process.env)"

# Sprawdź czy zmienna jest w .env.vault:
npm run env:pull
cat .env
# Jeśli nie ma, dodaj i push

# Sprawdź czy build jest aktualny:
npm run env:build
```

### Problem: "Old secrets still active after rotation"

```bash
# Przyczyna: Cache w aplikacji lub nierestartowany proces

# Rozwiązanie: Hard restart
pm2 stop all && pm2 start all
# lub
sudo systemctl restart der-mag-backend
# lub
docker restart der-mag-api

# Sprawdź czy nowy secret jest aktywny:
curl -H "Authorization: Bearer old-token" http://localhost:3000/api/auth/me
# Powinien zwrócić 401
```

### Problem: Production deployment failed with "Missing secrets"

```bash
# Sprawdź czy DOTENV_VAULT_PRODUCTION_KEY jest ustawiony:
echo $DOTENV_VAULT_PRODUCTION_KEY

# Jeśli pusty, dodaj do environment:
export DOTENV_VAULT_PRODUCTION_KEY="dotenv://:key_xxx"

# Dla systemd, dodaj do service file:
sudo nano /etc/systemd/system/der-mag-backend.service
# Environment="DOTENV_VAULT_PRODUCTION_KEY=dotenv://:key_xxx"

sudo systemctl daemon-reload
sudo systemctl restart der-mag-backend
```

### Problem: "Team member can't access secrets"

```bash
# Rozwiązanie: Udostępnij klucz development

# 1. Pokaż klucze
npm run env:keys

# 2. Skopiuj klucz development
# dotenv://:key_development_xxxxxxxxxxxxx

# 3. Wyślij bezpiecznym kanałem (1Password, Signal)

# 4. Team member dodaje do swojego .env:
echo "DOTENV_VAULT_DEVELOPMENT_KEY=dotenv://:key_xxx" > .env

# 5. Restart dev servera
npm run dev
```

### Logi diagnostyczne:

```bash
# Enable verbose logging
DEBUG=dotenv* npm run dev

# Sprawdź co jest ładowane:
node -e "
  console.log('NODE_ENV:', process.env.NODE_ENV);
  require('dotenv-vault/config');
  console.log('DB_HOST:', process.env.DB_HOST ? 'loaded ✓' : 'missing ✗');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'loaded ✓' : 'missing ✗');
"
```

---

## Dodatkowe zasoby

- 📖 [dotenv-vault Documentation](https://github.com/dotenv-org/dotenv-vault)
- 🔐 [Security Best Practices](./SECURITY_SECRETS_GUIDE.md)
- 🌐 [Dotenv.org Platform](https://www.dotenv.org)
- 💬 [Support: support@dermag.lan](mailto:support@dermag.lan)

---

## Szybki cheat sheet

```bash
# Setup (pierwszy raz)
npm run env:init        # Inicjalizuj vault
npm run env:push        # Push secrets
npm run env:build       # Build .env.vault

# Codzienna praca
npm run dev             # Start (auto-decrypt)
git pull                # Pull zmian (w tym .env.vault)

# Dodawanie secrets
echo "NEW_VAR=value" >> .env
npm run env:push
npm run env:build
git add .env.vault && git commit -m "feat: add NEW_VAR"

# Debugging
npm run env:keys        # Pokaż klucze
npm run env:pull        # Pull z vault do lokalnego .env
DEBUG=dotenv* npm run dev  # Verbose logging
```

---

**Der-Mag Platform** - Bezpieczne zarządzanie secrets 🔒
