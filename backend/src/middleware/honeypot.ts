// src/middleware/honeypot.ts
// Middleware honeypota - wykrywanie i logowanie prób skanowania aplikacji

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { ThreatLevel } from '../entities/HoneypotLog';
import { HoneypotService } from '../services/HoneypotService';
import { serverLogger } from '../utils/logger';

// Katalog logów honeypota
const HONEYPOT_LOG_DIR = path.join(__dirname, '../../../logs/honeypot');
const HONEYPOT_LOG_FILE = path.join(HONEYPOT_LOG_DIR, 'scanner_detection.log');

// Inicjalizacja katalogu logów - nie blokuje startu aplikacji przy błędzie
let fileLoggingEnabled = true;
try {
  if (!fs.existsSync(HONEYPOT_LOG_DIR)) {
    fs.mkdirSync(HONEYPOT_LOG_DIR, { recursive: true });
  }
} catch (error) {
  fileLoggingEnabled = false;
  serverLogger.error('Nie udało się zainicjalizować katalogu logów honeypota', error);
}

// ============================================================
// Sygnatury znanych skanerów bezpieczeństwa
// ============================================================
interface ScannerSignature {
  name: string;
  patterns: RegExp[];
  threatLevel: ThreatLevel;
}

const SCANNER_SIGNATURES: ScannerSignature[] = [
  {
    name: 'Nikto',
    patterns: [/nikto/i, /libwhisker/i],
    threatLevel: ThreatLevel.CRITICAL,
  },
  {
    name: 'Nmap NSE',
    patterns: [/nmap/i, /NSE/],
    threatLevel: ThreatLevel.CRITICAL,
  },
  {
    name: 'Dirbuster',
    patterns: [/dirbuster/i, /DirBuster/i],
    threatLevel: ThreatLevel.HIGH,
  },
  {
    name: 'Gobuster',
    patterns: [/gobuster/i],
    threatLevel: ThreatLevel.HIGH,
  },
  {
    name: 'OWASP ZAP',
    patterns: [/\bzap\b/i, /OWASP/i],
    threatLevel: ThreatLevel.HIGH,
  },
  {
    name: 'SQLMap',
    patterns: [/sqlmap/i],
    threatLevel: ThreatLevel.CRITICAL,
  },
  {
    name: 'WPScan',
    patterns: [/wpscan/i],
    threatLevel: ThreatLevel.MEDIUM,
  },
  {
    name: 'Burp Suite',
    patterns: [/burp/i],
    threatLevel: ThreatLevel.HIGH,
  },
];

// ============================================================
// Lista honeypot paths (80+ ścieżek)
// ============================================================
export const HONEYPOT_PATHS: string[] = [
  // Java/JSP admin panels
  '/JAMonAdmin.jsp',
  '/jamon.jsp',
  '/status.jsp',
  '/server-status',
  '/manager/html',
  '/manager/status',
  '/host-manager/html',
  '/jmx-console',
  '/web-console',
  '/admin-console',
  '/console',
  '/jolokia',
  '/jolokia/list',

  // PHP admin tools
  '/phpmyadmin',
  '/phpmyadmin/',
  '/phpMyAdmin',
  '/phpMyAdmin/',
  '/pma',
  '/pma/',
  '/phpinfo.php',
  '/info.php',
  '/test.php',
  '/adminer.php',
  '/adminer',
  '/dbadmin',

  // WordPress
  '/wp-admin',
  '/wp-admin/',
  '/wp-login.php',
  '/wp-config.php',
  '/wp-includes/version.php',
  '/wordpress/wp-admin',
  '/blog/wp-admin',
  '/cms/wp-admin',

  // Spring Boot Actuator
  '/actuator',
  '/actuator/env',
  '/actuator/health',
  '/actuator/beans',
  '/actuator/mappings',
  '/actuator/metrics',
  '/actuator/loggers',
  '/actuator/threaddump',
  '/actuator/heapdump',
  '/actuator/shutdown',
  '/actuator/configprops',

  // Pliki konfiguracyjne
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.env.development',
  '/.git/config',
  '/.git/HEAD',
  '/.gitignore',
  '/.htaccess',
  '/.htpasswd',

  // Kopie zapasowe bazy danych
  '/backup.sql',
  '/database.sql',
  '/dump.sql',
  '/db_backup.sql',
  '/backup.zip',
  '/backup.tar.gz',
  '/db.sql',
  '/data.sql',

  // Pliki konfiguracyjne serwera
  '/config.php',
  '/configuration.php',
  '/config.yml',
  '/config.yaml',
  '/settings.php',
  '/settings.py',
  '/web.config',
  '/application.properties',
  '/application.yml',

  // Narzędzia do exploitacji
  '/shell.php',
  '/webshell.php',
  '/c99.php',
  '/r57.php',
  '/b374k.php',
  '/cmd.php',
  '/eval.php',
  '/exec.php',

  // Pliki dziennika
  '/error.log',
  '/access.log',
  '/debug.log',
  '/app.log',
  '/server.log',

  // Endpointy testowe/deweloperskie
  '/test',
  '/debug',
  '/trace',
  '/swagger',
  '/swagger-ui.html',
  '/swagger-ui/',
  '/api-docs',
  '/v2/api-docs',
  '/v3/api-docs',
  '/openapi.json',
  '/api/swagger',

  // API Tester (deweloperskie narzędzie zastąpione honeypotem)
  '/test/api-tester.html',
  '/test/api-tester.js',
  '/api-tester',
  '/api-tester.html',
  '/api-tester.js',
  '/api/test',
  '/api-test',
  '/apitest',
  '/dev',
  '/dev/api',
  '/developer',
  '/devtools',

  // Inne typowe cele
  '/robots.txt',
  '/sitemap.xml',
  '/crossdomain.xml',
  '/clientaccesspolicy.xml',
  '/elmah.axd',
  '/trace.axd',
  '/Telerik.Web.UI.WebResource.axd',
  '/.DS_Store',
  '/thumbs.db',
];

// Konwersja ścieżek do Set dla szybkiego wyszukiwania
const HONEYPOT_PATHS_SET = new Set(HONEYPOT_PATHS.map(p => p.toLowerCase()));

// ============================================================
// Wykrywanie skanera po User-Agent
// ============================================================
function detectScanner(userAgent: string | undefined): ScannerSignature | null {
  if (!userAgent) return null;
  for (const sig of SCANNER_SIGNATURES) {
    if (sig.patterns.some(pattern => pattern.test(userAgent))) {
      return sig;
    }
  }
  return null;
}

// ============================================================
// Zapis do pliku logu honeypota (asynchroniczny)
// ============================================================
function writeToHoneypotLog(entry: object): void {
  if (!fileLoggingEnabled) return;
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n';
  fs.promises.appendFile(HONEYPOT_LOG_FILE, line).catch((error) => {
    serverLogger.error('Błąd zapisu logu honeypota:', error);
  });
}

// ============================================================
// Fałszywe odpowiedzi dla skanerów
// ============================================================
const FAKE_RESPONSES: Record<string, { status: number; body: string; contentType: string }> = {
  '/phpmyadmin': {
    status: 200,
    contentType: 'text/html',
    body: '<html><body><h1>phpMyAdmin</h1><form><input name="pma_username" /><input type="password" name="pma_password" /><button>Login</button></form></body></html>',
  },
  '/wp-login.php': {
    status: 200,
    contentType: 'text/html',
    body: '<html><body><h1>WordPress Login</h1><form method="post"><input name="log" /><input type="password" name="pwd" /><button>Log In</button></form></body></html>',
  },
  '/manager/html': {
    status: 401,
    contentType: 'text/html',
    body: '<html><body><h1>401 Unauthorized</h1><p>Tomcat Manager Application</p></body></html>',
  },
  '/.env': {
    status: 200,
    contentType: 'text/plain',
    body: 'DB_HOST=localhost\nDB_USER=root\nDB_PASS=toor\nSECRET_KEY=fake_key_honeypot_do_not_use\n',
  },
  '/.git/config': {
    status: 200,
    contentType: 'text/plain',
    body: '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/example/honeypot.git\n',
  },
  '/test/api-tester.html': {
    status: 200,
    contentType: 'text/html',
    body: `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Grover Platform - API Tester v2.3.1</title>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #16213e; padding: 30px; border-radius: 8px; }
    h1 { color: #e94560; margin-bottom: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; color: #a8b2d8; }
    input, select, textarea { width: 100%; padding: 10px; background: #0f3460; border: 1px solid #e94560; color: #eee; border-radius: 4px; }
    button { background: #e94560; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; }
    .status { margin-top: 20px; padding: 10px; background: #0f3460; border-radius: 4px; }
    .warning { color: #ffd700; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 API Tester v2.3.1</h1>
    <p style="color:#a8b2d8;margin-bottom:20px;">Grover Platform Backend — Developer Tools</p>
    <div class="form-group">
      <label>Endpoint URL</label>
      <input type="text" id="endpoint" placeholder="/api/auth/login" value="/api/auth/login" />
    </div>
    <div class="form-group">
      <label>Method</label>
      <select id="method"><option>POST</option><option>GET</option><option>PUT</option><option>DELETE</option></select>
    </div>
    <div class="form-group">
      <label>Auth Token</label>
      <input type="password" id="token" placeholder="eyJhbGc..." />
    </div>
    <div class="form-group">
      <label>Request Body (JSON)</label>
      <textarea id="body" rows="5" placeholder='{"username":"admin","password":"..."}'></textarea>
    </div>
    <button onclick="sendRequest()">🚀 Send Request</button>
    <div class="status" id="response">Oczekiwanie na zapytanie...</div>
    <p class="warning">⚠️ Narzędzie deweloperskie. Użyj tylko w środowisku testowym.</p>
  </div>
  <script>
    function sendRequest() {
      const endpoint = document.getElementById('endpoint').value || '/api/auth/login';
      const method = document.getElementById('method').value || 'POST';
      const token = document.getElementById('token').value ? '[REDACTED]' : '(brak)';
      const body = document.getElementById('body').value ? '***' : '(puste)';
      document.getElementById('response').innerHTML =
        '<pre>' + JSON.stringify({
          ok: true,
          message: 'Developer sandbox response',
          endpoint,
          method,
          token,
          body,
          requestId: 'sim-' + Date.now()
        }, null, 2) + '</pre>';
    }
  </script>
</body>
</html>`,
  },
  '/test/api-tester.js': {
    status: 200,
    contentType: 'application/javascript',
    body: 'console.info("API Tester module loaded.");',
  },
  '/api-tester': {
    status: 200,
    contentType: 'text/html',
    body: '<html><body><h1>API Tester</h1><p>Moved to <a href="/test/api-tester.html">/test/api-tester.html</a></p></body></html>',
  },
  '/api-tester.html': {
    status: 200,
    contentType: 'text/html',
    body: '<html><body><h1>API Tester</h1><p>Moved to <a href="/test/api-tester.html">/test/api-tester.html</a></p></body></html>',
  },
  '/api-tester.js': {
    status: 200,
    contentType: 'application/javascript',
    body: 'console.info("API Tester script moved to /test/api-tester.js");',
  },
  '/test': {
    status: 301,
    contentType: 'text/html',
    body: '<html><body><a href="/test/api-tester.html">API Tester</a></body></html>',
  },
};

function getFakeResponse(reqPath: string): { status: number; body: string; contentType: string } {
  const lower = reqPath.toLowerCase();
  const exact = FAKE_RESPONSES[lower];
  if (exact) return exact;
  // Domyślna fałszywa odpowiedź
  return {
    status: 404,
    contentType: 'text/html',
    body: '<html><body><h1>Not Found</h1></body></html>',
  };
}

// ============================================================
// Middleware honeypota
// ============================================================

/**
 * Middleware wykrywający próby skanowania aplikacji.
 * Rejestruje podejrzane requesty i zwraca fałszywe odpowiedzi.
 */
export const honeypotMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent'];
  const reqPath = req.path;
  const reqPathLower = reqPath.toLowerCase();

  const detectedScanner = detectScanner(userAgent);
  const isHoneypotPath = HONEYPOT_PATHS_SET.has(reqPathLower);
  const isApiTesterPath = [
    '/test/api-tester.html',
    '/test/api-tester.js',
    '/api-tester',
    '/api-tester.html',
    '/api-tester.js',
    '/test',
  ].includes(reqPathLower);
  const honeypotType = isApiTesterPath ? 'api_tester_trap' : (isHoneypotPath ? 'path_trap' : 'scanner_ua');

  // Jeśli ani skaner ani honeypot path - przepuść dalej
  if (!detectedScanner && !isHoneypotPath) {
    next();
    return;
  }

  // Wyznacz poziom zagrożenia
  let threatLevel: ThreatLevel;
  if (detectedScanner && isHoneypotPath) {
    threatLevel = ThreatLevel.CRITICAL;
  } else if (detectedScanner) {
    threatLevel = detectedScanner.threatLevel;
  } else {
    threatLevel = ThreatLevel.MEDIUM;
  }

  // Pobierz IP
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  // Zbierz nagłówki (bez wrażliwych)
  const sensitiveHeaderNames = new Set<string>([
    'authorization',
    'cookie',
    'x-csrf-token',
    'x-xsrf-token',
    'x-access-token',
    'x-refresh-token',
    'x-api-key',
  ]);
  const safeHeaders: Record<string, string> = {};
  for (const [key, val] of Object.entries(req.headers)) {
    if (sensitiveHeaderNames.has(key.toLowerCase())) continue;
    if (typeof val === 'string') safeHeaders[key] = val;
  }

  const logEntry = {
    ip,
    userAgent: userAgent || null,
    method: req.method,
    path: reqPath,
    detectedScanner: detectedScanner?.name || null,
    honeypotType,
    queryParams: req.query ? JSON.stringify(req.query) : null,
    threatLevel,
  };

  // Zapis do pliku logu
  writeToHoneypotLog(logEntry);

  // Zapis asynchroniczny do bazy danych (nie blokujemy odpowiedzi)
  HoneypotService.logHit({
    ip,
    userAgent: userAgent || null,
    method: req.method,
    path: reqPath,
    headers: safeHeaders,
    detectedScanner: detectedScanner?.name || null,
    honeypotType,
    queryParams: req.query ? JSON.stringify(req.query) : null,
    requestBody:
      req.body && typeof req.body !== 'object'
        ? String(req.body)
        : (req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : null),
    threatLevel,
  });

  serverLogger.warn(
    `🍯 Honeypot hit: ${ip} | ${req.method} ${reqPath} | Scanner: ${detectedScanner?.name || 'none'} | Level: ${threatLevel}`
  );

  // Opóźnienie odpowiedzi (spowalnianie skanerów) - 200-800ms
  const delay = Math.floor(Math.random() * 600) + 200;

  setTimeout(() => {
    const fakeResponse = getFakeResponse(reqPath);
    res
      .status(fakeResponse.status)
      .set('Content-Type', fakeResponse.contentType)
      .send(fakeResponse.body);
  }, delay);
};
