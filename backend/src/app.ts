// src/app.ts
// Konfiguracja aplikacji Express

import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { noCacheHeaders } from './middleware/noCacheHeaders';
import { RATE_LIMIT } from './config/constants';
import { serverLogger } from './utils/logger';

const app: Application = express();

// 🆕 Prevent HTTPS upgrade in local network (before helmet)
app.use((req, res, next) => {
  // Remove HSTS and upgrade-insecure-requests for local network
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
  // Strict security for production
  app.use(helmet());
} else {
  // Relaxed security for development/local network
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", // 🆕 Allow Vite inline scripts in dev
          "'unsafe-eval'"    // 🆕 Allow eval for dev tools
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'" // 🆕 Critical for Vite HMR and inline scripts
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'" // 🆕 Allow inline styles
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",  // OpenStreetMap tiles
          "https://*.openstreetmap.org",        // OSM domain
          "https://*.basemaps.cartocdn.com",    // Carto Dark basemap tiles
          "https://unpkg.com"                   // Leaflet marker icons (fallback)
        ],
        connectSrc: [
          "'self'",
          "ws:", // 🆕 Allow WebSocket for Vite HMR
          "wss:" // 🆕 Allow secure WebSocket
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false, // 🆕 Disable for local network
    crossOriginResourcePolicy: { policy: "cross-origin" } // 🆕 Allow cross-origin in LAN
  }));
}

// CORS configuration - permissive for development and local network
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Pozwół na requesty bez origin (curl, Postman, same-origin)
    if (!origin) {
      return callback(null, true);
    }
    
    // Sprawdź czy origin jest na liście
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 🆕 W development pozwól na localhost URLs (more specific pattern)
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    
    // 🆕 Pozwól na local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalNetwork = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin);
    if (isLocalNetwork) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 🆕 Explicit methods
  allowedHeaders: ['Content-Type', 'Authorization'] // 🆕 Explicit headers
}));

// 🆕 Handle preflight requests
app.options('*', cors());

// Cookie parser middleware
app.use(cookieParser());

// Rate limiting dla endpointów auth (bardziej permisywny)
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  message: { 
    success: false, 
    message: 'Zbyt wiele żądań autoryzacyjnych, spróbuj ponownie za chwilę',
    code: 'RATE_LIMIT_AUTH',
    retryAfter: Math.ceil(RATE_LIMIT.AUTH_WINDOW_MS / 1000)
  },
  standardHeaders: true, // Zwraca info o rate limit w nagłówkach
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Klucz rate limit: IP + endpoint (bardziej granularny)
    return `${req.ip}-auth`;
  }
});

// Rate limiter dla operacji read-only (GET) - wyższy limit per IP
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
  keyGenerator: (req) => {
    // Per IP + endpoint dla lepszej granularności
    return `${req.ip}-read`;
  },
  // Zastosuj TYLKO dla GET requests
  skip: (req) => req.method !== 'GET'
});

// Ogólny rate limiter - pomiń GET requests (mają własny limiter)
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
  skip: (req) => {
    // Pomiń endpointy auth - mają własny limiter
    // Pomiń GET requests - mają własny limiter (readLimiter)
    return req.path.startsWith('/api/auth/') || req.method === 'GET';
  }
});

// Aplikuj limitery w odpowiedniej kolejności
app.use('/api/auth/', authLimiter);
app.use('/api/', readLimiter);   // dla GET requests
app.use('/api/', apiLimiter);    // dla POST/PUT/DELETE

// Rate limiting for debug endpoints (more permissive than API)
const debugLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
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

// Health check endpoint (przed wszystkim innym)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 🆕 Debug endpoints - only in development or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_ENDPOINTS === 'true') {
  // Debug endpoint - zwraca info o konfiguracji
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

  // Debug endpoint - lista assets (merged from two versions)
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

// Serwowanie interfejsu testowego
const enableApiTester = process.env.ENABLE_API_TESTER === 'true' || process.env.NODE_ENV !== 'production';
if (enableApiTester) {
  app.use('/test', express.static(path.join(__dirname, '../public')));
  serverLogger.info('🧪 Test interface dostępny na: /test/api-tester.html');
}

// API routes (MUSZĄ być przed serwowaniem frontendu)
app.use('/api', noCacheHeaders);
app.use('/api', routes);

// Serwowanie frontendu z tego samego portu co backend
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  serverLogger.info('🌐 Frontend będzie serwowany z: ' + frontendPath);
  
  // 🆕 CRITICAL - Explicit route for assets directory with CORS
  app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      // 🆕 Enable CORS for assets (critical for local network)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // 🆕 Set correct MIME types
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));
  
  // Serwuj statyczne pliki frontendu
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      // 🆕 Force reload for HTML files (prevent 304 cache issues on mobile)
      // 🆕 CORS for all static files
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Force reload for HTML files
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  
  // Obsługa React Router - wszystkie pozostałe ścieżki zwracają index.html
  // MUSI być PRZED error handlers
  app.get('*', (req, res) => {
    // 🆕 Force no-cache for SPA routing
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  serverLogger.warn('⚠️  Frontend dist nie znaleziony w: ' + frontendPath);
  serverLogger.warn('   Uruchom: cd frontend && npm run build');
}

// Error handlers (MUSZĄ być na samym końcu, ale tylko dla API routes)
// Catch-all dla React Router jest powyżej
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
