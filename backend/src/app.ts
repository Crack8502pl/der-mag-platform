// src/app.ts
// Konfiguracja aplikacji Express

import 'reflect-metadata';
import express, { Application, NextFunction, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import webhookRoutes from './routes/webhook.routes';
import { honeypotMiddleware } from './middleware/honeypot';
import { validateCsrfToken } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { noCacheHeaders } from './middleware/noCacheHeaders';
import { RATE_LIMIT } from './config/constants';
import { serverLogger } from './utils/logger';

const app: Application = express();

// Trust proxy - required when behind nginx/reverse proxy
// Allows express-rate-limit to correctly identify client IPs from X-Forwarded-For
// Value '1' means trust first proxy hop; adjust if there are multiple proxies
app.set('trust proxy', 1);

// Prevent HTTPS upgrade in local network (before helmet)
app.use((req, res, next) => {
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(req.hostname);
  if (isLocalNetwork) {
    res.removeHeader('Strict-Transport-Security');
  }
  next();
});

// Security middleware - conditional based on environment
const isProduction = process.env.NODE_ENV === 'production';
const disableCSP = process.env.DISABLE_CSP === 'true';

if (isProduction && !disableCSP) {
  app.use(helmet());
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Allow Vite inline scripts in dev
          "'unsafe-eval'"    // Allow eval for dev tools
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'" // Critical for Vite HMR and inline scripts
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'" // Allow inline styles
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://*.openstreetmap.org",
          "https://*.basemaps.cartocdn.com",
          "https://unpkg.com",
          "https://*.tiles.openrailwaymap.org"
        ],
        connectSrc: [
          "'self'",
          "ws:",  // Allow WebSocket for Vite HMR
          "wss:"  // Allow secure WebSocket
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
}

// ── CORS ─────────────────────────────────────────────────────────────────────
// OWASP A05: Wyekstrahowana funkcja weryfikacji originu używana zarówno
// przez middleware cors() jak i przez preflight handler app.options('*').
// Zapobiega sytuacji gdzie preflight akceptuje szerszy zestaw origins niż
// faktyczne requesty.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'];

const corsOriginValidator = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  // Pozwól na requesty bez origin (curl, Postman, same-origin)
  if (!origin) {
    return callback(null, true);
  }

  // Sprawdź czy origin jest na liście
  if (corsOrigins.includes(origin)) {
    return callback(null, true);
  }

  // W development pozwól na localhost URLs
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }

  // Pozwól na local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const isLocalNetwork = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin);
  if (isLocalNetwork) {
    return callback(null, true);
  }

  // Pozwól na wewnętrzne domeny (.lan, .local, .internal, .home, .corp, .intranet, .private)
  const isInternalDomain = /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.(lan|local|internal|home|corp|intranet|private)(:[1-9]\d{0,4})?$/.test(origin);
  if (isInternalDomain) {
    return callback(null, true);
  }

  callback(new Error('Not allowed by CORS'));
};

const corsOptions: CorsOptions = {
  origin: corsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
};

app.use(cors(corsOptions));

// OWASP A05: Preflight używa tej samej konfiguracji CORS co reszta —
// nie akceptuje szerszego zestawu origins na OPTIONS niż na właściwych requestach.
app.options('*', cors(corsOptions));

// Cookie parser middleware
app.use(cookieParser());

// CSRF protection for all state-mutating /api requests
app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (req.path === '/auth/login' || req.path === '/auth/login/') {
    return next();
  }
  if (req.path === '/auth/forgot-password' || req.path === '/auth/forgot-password/') {
    return next();
  }
  if (req.path.startsWith('/integrations/webhooks')) {
    return next();
  }
  return validateCsrfToken(req, res, next);
});

// Rate limiting dla endpointów auth
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Zbyt wiele żądań autoryzacyjnych, spróbuj ponownie za chwilę',
    code: 'RATE_LIMIT_AUTH',
    retryAfter: Math.ceil(RATE_LIMIT.AUTH_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-auth`
});

// Rate limiter dla operacji read-only (GET)
const readLimiter = rateLimit({
  windowMs: RATE_LIMIT.READ_WINDOW_MS,
  max: RATE_LIMIT.READ_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Zbyt wiele żądań odczytu, spróbuj ponownie za chwilę',
    code: 'RATE_LIMIT_READ',
    retryAfter: Math.ceil(RATE_LIMIT.READ_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}-read`,
  skip: (req) => req.method !== 'GET'
});

// Ogólny rate limiter
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później',
    code: 'RATE_LIMIT_GENERAL',
    retryAfter: Math.ceil(RATE_LIMIT.WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/auth/') || req.method === 'GET'
});

app.use('/api/auth/', authLimiter);
app.use('/api/', readLimiter);
app.use('/api/', apiLimiter);

// Rate limiting for debug endpoints
const debugLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Zbyt wiele żądań do endpointów diagnostycznych'
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
const morganStream = {
  write: (message: string) => {
    serverLogger.info(message.trim());
  }
};

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev', { stream: morganStream }));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoints - only in development or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_ENDPOINTS === 'true') {
  app.get('/debug/config', debugLimiter, (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      frontendServed: fs.existsSync(path.join(__dirname, '../../frontend/dist')),
      apiUrl: `${req.protocol}://${req.get('host')}/api`,
      requestHeaders: {
        host: req.get('host'),
        userAgent: req.get('user-agent'),
        referer: req.get('referer')
      }
    });
  });

  app.get('/debug/assets', debugLimiter, async (req, res) => {
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    const assetsPath = path.join(frontendPath, 'assets');
    let assetFiles: string[] = [];
    try {
      if (!fs.existsSync(assetsPath)) {
        return res.json({
          status: 'ERROR',
          message: 'Assets directory not found',
          path: assetsPath,
          frontendPath,
          frontendExists: fs.existsSync(frontendPath),
          indexHtmlExists: fs.existsSync(path.join(frontendPath, 'index.html'))
        });
      }
      assetFiles = await fs.promises.readdir(assetsPath);
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        frontendPath,
        frontendExists: fs.existsSync(frontendPath),
        assetsPath,
        assetsExists: fs.existsSync(assetsPath),
        assetFiles,
        count: assetFiles.length,
        indexHtmlExists: fs.existsSync(path.join(frontendPath, 'index.html')),
        requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        assetsUrl: `${req.protocol}://${req.get('host')}/assets/`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        status: 'ERROR',
        message: 'Failed to read assets directory',
        error: errorMessage,
        assetFiles: ['Error reading assets: ' + errorMessage]
      });
    }
  });
}

// Honeypot middleware
app.use(honeypotMiddleware);

if (process.env.ENABLE_API_TESTER === 'true') {
  serverLogger.warn('⚠️  ENABLE_API_TESTER=true jest przestarzałe. Ścieżka /test jest teraz obsługiwana przez honeypot middleware.');
}

// API routes
app.use('/api/integrations/webhooks', noCacheHeaders, webhookRoutes);
app.use('/api', noCacheHeaders);
app.use('/api', routes);

// Serwowanie frontendu
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  serverLogger.info('🌐 Frontend będzie serwowany z: ' + frontendPath);

  // OWASP A05: X-Content-Type-Options dla assetów statycznych — blokuje MIME sniffing.
  // CORS dla assetów ograniczony do CORS_ORIGIN w produkcji (brak wildcard '*').
  app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      // Blokuj MIME sniffing (OWASP A05)
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // CORS: wildcard tylko w dev/LAN, w produkcji ograniczony do CORS_ORIGIN
      if (isProduction) {
        const allowedOrigin = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || "'self'";
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Correct MIME types
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));

  app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');

      if (isProduction) {
        const allowedOrigin = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || "'self'";
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  // React Router catch-all
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  serverLogger.warn('⚠️  Frontend dist nie znaleziony w: ' + frontendPath);
  serverLogger.warn('   Uruchom: cd frontend && npm run build');
}

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
