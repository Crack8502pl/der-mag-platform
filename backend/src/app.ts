// src/app.ts
// Konfiguracja aplikacji Express

import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { RATE_LIMIT } from './config/constants';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration - bardziej permisywna dla development
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Pozwól na requesty bez origin (curl, Postman, same-origin)
    if (!origin) {
      return callback(null, true);
    }
    
    // Sprawdź czy origin jest na liście
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // W development pozwól na wszystkie origins z localhost
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później'
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
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

// 🆕 Debug endpoint - zwraca info o konfiguracji
// Note: Nie jest rate-limited celowo, podobnie jak /health
app.get('/debug/config', (req, res) => {
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

// 🆕 Mobile debug endpoint - check if assets are served correctly
app.get('/debug/assets', (req, res) => {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  const assetsPath = path.join(frontendPath, 'assets');
  
  let assetFiles: string[] = [];
  try {
    if (fs.existsSync(assetsPath)) {
      assetFiles = fs.readdirSync(assetsPath);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    assetFiles = ['Error reading assets: ' + errorMessage];
  }
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    frontendPath,
    frontendExists: fs.existsSync(frontendPath),
    assetsPath,
    assetsExists: fs.existsSync(assetsPath),
    assetFiles,
    indexHtmlExists: fs.existsSync(path.join(frontendPath, 'index.html')),
    requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    assetsUrl: `${req.protocol}://${req.get('host')}/assets/`
  });
});

// Serwowanie interfejsu testowego
const enableApiTester = process.env.ENABLE_API_TESTER === 'true' || process.env.NODE_ENV !== 'production';
if (enableApiTester) {
  app.use('/test', express.static(path.join(__dirname, '../public')));
  console.log('🧪 Test interface dostępny na: /test/api-tester.html');
}

// API routes (MUSZĄ być przed serwowaniem frontendu)
app.use('/api', routes);

// Serwowanie frontendu z tego samego portu co backend
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
  console.log('🌐 Frontend będzie serwowany z: ' + frontendPath);
  
  // 🆕 CRITICAL - Explicit route for assets directory
  app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      // Enable CORS for assets in development (needed for mobile browsers accessing via local IP)
      // In production, assets are served from same origin so CORS is not needed
      if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
  }));
  
  // Serwuj statyczne pliki frontendu
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, filePath) => {
      // 🆕 Force reload for HTML files (prevent 304 cache issues on mobile)
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
  console.warn('⚠️  Frontend dist nie znaleziony w: ' + frontendPath);
  console.warn('   Uruchom: cd frontend && npm run build');
}

// Error handlers (MUSZĄ być na samym końcu, ale tylko dla API routes)
// Catch-all dla React Router jest powyżej
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
