# 🔐 Przewodnik wdrożenia HTTPS - Der-Mag Platform

Ten dokument opisuje krok po kroku proces wdrożenia HTTPS w środowisku deweloperskim i produkcyjnym.

## 📋 Spis treści

- <a>Przygotowanie</a>
- <a>Środowisko deweloperskie</a>
- <a>Środowisko produkcyjne</a>
- <a>Przenoszenie między maszynami</a>
- <a>Rozwiązywanie problemów</a>
- <a>FAQ</a>

---

## 🚀 Przygotowanie

### Wymagania wstępne

- Node.js 18+ i npm
- OpenSSL zainstalowany (Linux/Mac: wbudowany, Windows: <a href="https://slproweb.com/products/Win32OpenSSL.html">Win32OpenSSL</a>)
- PostgreSQL 14+
- Git

### Krok 1: Merge i Pull PR

Po zamknięciu PR z obsługą HTTPS:

```bash
cd ~/der-mag-platform
git checkout main
git pull origin main

# Sprawdź czy masz najnowsze zmiany:
ls backend/scripts/generate-certs.sh
ls backend/certs/README.md
ls frontend/vite.config.ts
```

---

## 🖥️ Środowisko deweloperskie (DEV)

### Krok 1: Wygeneruj certyfikaty SSL

```bash
cd ~/der-mag-platform/backend

# Linux/Mac:
chmod +x scripts/generate-certs.sh
./scripts/generate-certs.sh 192.168.2.38

# Windows PowerShell:
powershell -ExecutionPolicy Bypass -File .\scripts\generate-certs.ps1 -IpAddress 192.168.2.38
```

**Oczekiwany output:**
```
🔐 Generating SSL certificates for IP: 192.168.2.38
Generating RSA private key, 4096 bit long modulus
...
✅ Certificates generated successfully!
   📄 Certificate: backend/certs/cert.pem
   🔑 Private key: backend/certs/key.pem
```

**Weryfikacja:**
```bash
ls -la backend/certs/
# Powinno pokazać:
# cert.pem
# key.pem
# README.md
```

**WAŻNE:** Certyfikaty pozostają w `backend/certs/`, **NIE kopiuj** ich do `dist/`. Kod automatycznie znajduje je używając `__dirname + '/../certs/'`.

---

### Krok 2: Zaktualizuj konfigurację backend

```bash
cd ~/der-mag-platform/backend
nano .env  # lub vim, code, etc.
```

Dodaj/zaktualizuj następujące zmienne:

```env
# HTTPS Configuration
USE_HTTPS=true
SERVER_HOST=192.168.2.38

# CORS Origins (zaktualizuj na HTTPS)
CORS_ORIGIN=https://192.168.2.38:5173,https://localhost:5173

# Pozostałe ustawienia bez zmian
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dermag_platform
DB_USER=dermag_user
DB_PASSWORD=your-password
# ... pozostałe zmienne
```

**Zapisz i zamknij** (Ctrl+X, Y, Enter w nano).

---

### Krok 3: Zbuduj i uruchom backend

```bash
cd ~/der-mag-platform/backend

# Zainstaluj zależności (jeśli nowe):
npm install

# Zbuduj projekt:
npm run build

# Sprawdź czy build się udał:
ls dist/index.js

# Uruchom serwer z HTTPS:
USE_HTTPS=true npm start

# LUB w trybie development (bez buildu):
USE_HTTPS=true npm run dev
```

**Oczekiwany output:**
```
╔════════════════════════════════════════╗
║   Grover Platform Backend API         ║
║   🔐 HTTPS Mode                        ║
╠════════════════════════════════════════╣
║   🚀 Serwer działa na porcie: 3000     ║
║   🌍 Environment: development          ║
║   🖥️  Host: 192.168.2.38               ║
║   📡 API: https://192.168.2.38:3000/api
║   💚 Health: https://192.168.2.38:3000/health
╚════════════════════════════════════════╝
```

---

### Krok 4: Zbuduj i uruchom frontend

**W NOWYM terminalu:**

```bash
cd ~/der-mag-platform/frontend

# Zainstaluj zależności:
npm install

# Zbuduj projekt:
npm run build

# Uruchom w trybie preview:
npm run preview

# LUB w trybie development:
npm run dev
```

**Oczekiwany output:**
```
  ➜  Local:   https://192.168.2.38:5173/
  ➜  Network: https://192.168.2.38:5173/
  ➜  press h to show help
```

**Struktura certyfikatów dla frontend:**

Frontend automatycznie używa certyfikatów z `backend/certs/` dzięki konfiguracji w `vite.config.ts`:

```typescript
https: certsExist ? {
  key: fs.readFileSync(path.resolve(__dirname, '../backend/certs/key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '../backend/certs/cert.pem'))
} : undefined
```

---

### Krok 5: Zaakceptuj certyfikaty w przeglądarce

#### **Na komputerze deweloperskim:**

1. Otwórz Chrome/Firefox
2. Wejdź na: **https://192.168.2.38:3000/health**
3. Zobaczysz ostrzeżenie: "Your connection is not private" / "Połączenie nie jest prywatne"
4. Kliknij **"Advanced"** / **"Zaawansowane"**
5. Kliknij **"Proceed to 192.168.2.38 (unsafe)"** / **"Przejdź do 192.168.2.38"**
6. Teraz wejdź na: **https://192.168.2.38:5173**
7. Ponownie zaakceptuj certyfikat (tak samo jak powyżej)
8. **Gotowe!** Aplikacja działa przez HTTPS 🎉

#### **Na telefonie w sieci lokalnej:**

1. Otwórz przeglądarkę mobilną (Chrome/Safari)
2. Wejdź na: **https://192.168.2.38:5173**
3. Kliknij "Advanced" / "Zaawansowane"
4. Kliknij "Continue to site" / "Przejdź do strony"
5. **Na iOS**: może wymagać dodatkowego potwierdzenia w Ustawieniach → Ogólne → VPN i zarządzanie urządzeniem
6. **Działa!** 📱

---

### Krok 6: Weryfikacja

#### **Test 1: Health Check**

```bash
curl -k https://192.168.2.38:3000/health
```

**Oczekiwany wynik:**
```json
{
  "status": "OK",
  "timestamp": "2026-01-07T...",
  "uptime": 123.45,
  "environment": "development"
}
```

#### **Test 2: Frontend API Call**

Otwórz DevTools (F12) w przeglądarce na `https://192.168.2.38:5173`:

**W konsoli przeglądarki:**
```javascript
// Sprawdź protokół:
console.log(window.location.protocol);  // Powinno być "https:"

// Sprawdź URL API:
console.log('API URL:', import.meta.env.VITE_API_BASE_URL || 'auto-detected');
```

**W zakładce Network:**
- Odśwież stronę (F5)
- Wszystkie requesty do `/api` powinny być przez `https://192.168.2.38:3000`
- Status: `200 OK`
- Brak błędów Mixed Content

#### **Test 3: WebSocket (HMR)**

W trybie `npm run dev`:
- Zmień dowolny plik `.tsx`
- Sprawdź w DevTools → Network → WS
- WebSocket powinien używać `wss://` (secure)
- Hot Module Replacement powinien działać natychmiast

---

## 🚀 Środowisko produkcyjne (PROD)

### Opcja A: Self-signed Certificate (sieć lokalna)

Jeśli produkcja to też sieć lokalna (np. 192.168.x.x):

```bash
# Na serwerze produkcyjnym:
cd ~/der-mag-platform/backend
./scripts/generate-certs.sh <PRODUCTION_IP>

# Zaktualizuj .env:
nano .env
```

```env
USE_HTTPS=true
SERVER_HOST=<PRODUCTION_IP>
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://<PRODUCTION_IP>:5173
```

```bash
# Build i start:
npm run build
npm start
```

---

### Opcja B: Let's Encrypt (domena publiczna) ⭐ **ZALECANE**

Jeśli serwer ma **publiczny adres IP** i **domenę**:

#### **1. Zainstaluj Certbot:**

```bash
# Ubuntu/Debian:
sudo apt update
sudo apt install certbot

# Fedora/RHEL:
sudo dnf install certbot

# Sprawdź instalację:
certbot --version
```

#### **2. Wygeneruj certyfikat:**

```bash
sudo certbot certonly --standalone -d twoja-domena.pl -d www.twoja-domena.pl

# Alternatywnie, jeśli port 80 jest zajęty:
sudo certbot certonly --webroot -w /var/www/html -d twoja-domena.pl
```

**Certyfikaty trafią do:**
```
/etc/letsencrypt/live/twoja-domena.pl/fullchain.pem
/etc/letsencrypt/live/twoja-domena.pl/privkey.pem
```

#### **3. Skopiuj certyfikaty do projektu:**

```bash
sudo cp /etc/letsencrypt/live/twoja-domena.pl/fullchain.pem \
  ~/der-mag-platform/backend/certs/cert.pem

sudo cp /etc/letsencrypt/live/twoja-domena.pl/privkey.pem \
  ~/der-mag-platform/backend/certs/key.pem

# Zmień właściciela:
sudo chown $USER:$USER ~/der-mag-platform/backend/certs/*.pem
```

#### **4. Automatyczne odnawianie:**

```bash
# Edytuj crontab:
sudo crontab -e

# Dodaj linię (sprawdza codziennie o 3:00):
0 3 * * * certbot renew --quiet --deploy-hook "systemctl restart der-mag-platform"
```

#### **5. Konfiguracja .env:**

```env
USE_HTTPS=true
SERVER_HOST=twoja-domena.pl
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://twoja-domena.pl
```

---

### Opcja C: Nginx jako Reverse Proxy 🏆 **NAJLEPSZA DLA PRODUKCJI**

#### **Zalety Nginx:**
- ✅ Obsługuje SSL/TLS (backend może działać na HTTP)
- ✅ Load balancing
- ✅ Caching statycznych plików
- ✅ Rate limiting
- ✅ Automatyczne przekierowanie HTTP → HTTPS
- ✅ Obsługa WebSocket

#### **1. Zainstaluj Nginx:**

```bash
sudo apt update
sudo apt install nginx

# Sprawdź status:
sudo systemctl status nginx
```

#### **2. Wygeneruj certyfikat Let's Encrypt:**

```bash
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl
```

Certbot automatycznie skonfiguruje Nginx!

#### **3. Konfiguracja Nginx (alternatywnie ręcznie):**

Stwórz `/etc/nginx/sites-available/der-mag-platform`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name twoja-domena.pl www.twoja-domena.pl;

    # SSL Configuration (certbot auto-fills this)
    ssl_certificate /etc/letsencrypt/live/twoja-domena.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/twoja-domena.pl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (static files)
    location / {
        root /home/user/der-mag-platform/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Caching dla assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # WebSocket support (jeśli potrzebne)
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Upload size limit
    client_max_body_size 50M;
}
```

#### **4. Aktywuj konfigurację:**

```bash
# Symlink do sites-enabled:
sudo ln -s /etc/nginx/sites-available/der-mag-platform /etc/nginx/sites-enabled/

# Usuń domyślną konfigurację:
sudo rm /etc/nginx/sites-enabled/default

# Sprawdź składnię:
sudo nginx -t

# Restart Nginx:
sudo systemctl restart nginx

# Włącz autostart:
sudo systemctl enable nginx
```

#### **5. Backend (HTTP na localhost):**

Gdy używasz Nginx, backend **NIE potrzebuje** HTTPS (Nginx obsługuje SSL):

```env
# backend/.env dla produkcji z Nginx:
USE_HTTPS=false
NODE_ENV=production
PORT=3000
SERVER_HOST=localhost

# CORS - pozwól na domenę
CORS_ORIGIN=https://twoja-domena.pl
```

```bash
# Build i start backend:
cd ~/der-mag-platform/backend
npm run build
npm start
```

#### **6. Skonfiguruj jako systemd service:**

Stwórz `/etc/systemd/system/der-mag-platform.service`:

```ini
[Unit]
Description=Der-Mag Platform Backend
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/der-mag-platform/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Aktywuj service:
sudo systemctl daemon-reload
sudo systemctl enable der-mag-platform
sudo systemctl start der-mag-platform

# Sprawdź status:
sudo systemctl status der-mag-platform

# Logi:
sudo journalctl -u der-mag-platform -f
```

---

## 🔄 Przenoszenie między maszynami

### Zmiana adresu IP (np. nowa maszyna wirtualna)

Gdy przenosisz aplikację na inną maszynę z nowym IP:

#### **Krok 1: Wygeneruj nowe certyfikaty**

```bash
cd ~/der-mag-platform/backend
./scripts/generate-certs.sh 192.168.X.Y
```

#### **Krok 2: Zaktualizuj .env**

```bash
nano .env
```

Zmień:
```env
SERVER_HOST=192.168.X.Y
CORS_ORIGIN=https://192.168.X.Y:5173
```

#### **Krok 3: Restart**

```bash
# Backend:
npm run build
npm start

# Frontend (w nowym terminalu):
cd ../frontend
npm run build
npm run preview
```

**Gotowe w 2 minuty!** ⚡

---

## 🔍 Rozwiązywanie problemów

### Problem 1: "Certyfikaty SSL nie znalezione"

**Objawy:**
```
❌ Certyfikaty SSL nie znalezione!
   Sprawdź: /path/to/backend/dist/../certs/cert.pem
```

**Rozwiązanie:**
```bash
# Sprawdź czy certyfikaty istnieją:
ls -la backend/certs/

# Jeśli nie ma cert.pem i key.pem:
cd backend
./scripts/generate-certs.sh 192.168.2.38

# Upewnij się że są w backend/certs/, NIE w dist/certs/
```

---

### Problem 2: "EACCES: permission denied"

**Objawy:**
```
Error: EACCES: permission denied, open '/home/user/der-mag-platform/backend/certs/key.pem'
```

**Rozwiązanie:**
```bash
# Zmień uprawnienia:
chmod 600 backend/certs/*.pem
chown $USER:$USER backend/certs/*.pem
```

---

### Problem 3: "Port 443 already in use"

**Objawy:**
```
Error: listen EADDRINUSE: address already in use :::443
```

**Rozwiązanie:**
```bash
# Sprawdź co używa portu:
sudo netstat -tlnp | grep :443

# Jeśli Nginx:
sudo systemctl stop nginx

# Lub zmień port w .env:
PORT=3443
```

---

### Problem 4: Przeglądarka nie akceptuje certyfikatu

**Objawy:**
- "NET::ERR_CERT_AUTHORITY_INVALID"
- Brak możliwości przejścia do strony

**Rozwiązanie dla Chrome/Edge:**
1. Wpisz w przeglądarce: `chrome://flags/#allow-insecure-localhost`
2. Ustaw na "Enabled"
3. Restart przeglądarki

**Rozwiązanie dla Firefox:**
1. Wejdź na stronę
2. Kliknij "Advanced" → "Accept the Risk and Continue"

**Rozwiązanie dla produkcji:**
- Użyj Let's Encrypt zamiast self-signed
- Lub dodaj self-signed cert do zaufanych w systemie:

```bash
# Linux:
sudo cp backend/certs/cert.pem /usr/local/share/ca-certificates/der-mag.crt
sudo update-ca-certificates

# Mac:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain backend/certs/cert.pem
```

---

### Problem 5: Mixed Content (HTTP/HTTPS mix)

**Objawy:**
- Console error: "Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'"

**Rozwiązanie:**
```bash
# Sprawdź .env backend:
grep CORS_ORIGIN backend/.env
# Musi być: CORS_ORIGIN=https://192.168.2.38:5173

# Sprawdź czy frontend wykrywa HTTPS:
# W przeglądarce console:
console.log(window.location.protocol); // powinno być "https:"
```

---

### Problem 6: WebSocket nie działa przez HTTPS

**Objawy:**
- HMR (Hot Module Replacement) nie działa w Vite
- Błąd: "WebSocket connection failed"

**Rozwiązanie:**

Sprawdź `frontend/vite.config.ts`:
```typescript
hmr: {
  protocol: certsExist ? 'wss' : 'ws',  // Musi być 'wss' dla HTTPS
  host: 'localhost'
}
```

---

## ❓ FAQ

### Q: Czy mogę używać HTTP w dev i HTTPS w prod?

**A:** Tak! Po prostu ustaw `USE_HTTPS=false` w dev i `USE_HTTPS=true` w prod (w odpowiednich plikach `.env`).

---

### Q: Co jeśli certyfikat wygaśnie?

**A:** 
- **Self-signed:** Wygasa po 365 dniach. Wygeneruj nowy: `./scripts/generate-certs.sh <IP>`
- **Let's Encrypt:** Auto-renewal przez certbot cron job (odnawia 30 dni przed wygaśnięciem)

---

### Q: Czy frontend musi być na tym samym porcie co backend?

**A:** Nie! Frontend może być na `:5173`, backend na `:3000`. API calls działają przez CORS.

---

### Q: Jak sprawdzić czy używam HTTPS?

**A:** 
```bash
# Backend:
curl -k https://192.168.2.38:3000/health

# Frontend w przeglądarce console:
console.log(window.location.protocol); // "https:"
```

---

### Q: Co z WebSocket (HMR w Vite)?

**A:** Automatycznie przełączy się na `wss://` gdy używasz HTTPS (dzięki `vite.config.ts`).

---

### Q: Czy mogę używać domeny zamiast IP?

**A:** Tak! 
- Dodaj do `/etc/hosts`: `192.168.2.38 der-mag.local`
- Wygeneruj cert: `./scripts/generate-certs.sh der-mag.local`
- Użyj `SERVER_HOST=der-mag.local` w `.env`

---

### Q: Jak wyłączyć HTTPS tymczasowo?

**A:** 
```bash
# W .env:
USE_HTTPS=false

# Lub przy starcie:
USE_HTTPS=false npm start
```

---

### Q: Czy certyfikaty są bezpieczne do commitowania?

**A:** 
- **Self-signed:** Można commitować dla testów, ale **NIE w produkcji**
- **Let's Encrypt:** **NIE commituj** - są w `.gitignore`
- Backend ma w `.gitignore`: `certs/*.pem`

---

## 📝 Checklista wdrożenia

### ✅ DEV (192.168.2.38)

```
□ Zmerguj PR i zrób git pull
□ Wygeneruj certyfikaty: ./scripts/generate-certs.sh 192.168.2.38
□ Zaktualizuj backend/.env: USE_HTTPS=true, SERVER_HOST=192.168.2.38
□ Sprawdź że certyfikaty są w backend/certs/ (NIE dist/certs/)
□ Zbuduj backend: npm run build
□ Uruchom backend: USE_HTTPS=true npm start
□ Zbuduj frontend: npm run build && npm run preview
□ Zaakceptuj certyfikaty w przeglądarce (2x: backend + frontend)
□ Test: https://192.168.2.38:3000/health
□ Test: https://192.168.2.38:5173
□ Sprawdź na telefonie w sieci lokalnej
□ Sprawdź HMR (WebSocket wss://)
```

---

### ✅ PROD (z Let's Encrypt + Nginx)

```
□ Zainstaluj Nginx i Certbot
□ Wygeneruj certyfikat: sudo certbot --nginx -d domena.pl
□ Skonfiguruj Nginx reverse proxy (template w docs)
□ Zaktualizuj backend/.env: USE_HTTPS=false, NODE_ENV=production
□ Zbuduj backend: npm run build
□ Zbuduj frontend: npm run build
□ Skopiuj frontend/dist do /var/www/der-mag-platform (lub skonfiguruj ścieżkę w Nginx)
□ Utwórz systemd service dla backendu
□ Start: sudo systemctl start der-mag-platform nginx
□ Enable autostart: sudo systemctl enable der-mag-platform nginx
□ Skonfiguruj auto-renewal Certbot (cron)
□ Skonfiguruj firewall: sudo ufw allow 80,443/tcp
□ Test: https://domena.pl/health
□ Test: https://domena.pl (frontend)
□ Monitoring: sudo journalctl -u der-mag-platform -f
```

---

## 📚 Dodatkowe zasoby

- <a>Certyfikaty SSL - README</a>
- <a href="https://www.nginx.com/blog/nginx-ssl-performance/">Nginx Best Practices</a>
- <a href="https://letsencrypt.org/docs/">Let's Encrypt Documentation</a>
- <a href="https://vitejs.dev/config/server-options.html#server-https">Vite HTTPS Guide</a>

---

## 📧 Wsparcie

W razie problemów:
1. Sprawdź <a>Rozwiązywanie problemów</a>
2. Sprawdź logi: `sudo journalctl -u der-mag-platform -f`
3. Otwórz issue na GitHub
4. Kontakt: r.krakowski@der-mag.pl

---

**Dokument stworzony:** 2026-01-07  
**Ostatnia aktualizacja:** 2026-01-07  
**Wersja:** 1.0  
**Status:** ✅ Gotowy do użycia
