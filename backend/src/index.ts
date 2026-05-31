// src/index.ts
// Punkt wejścia aplikacji z obsługą HTTPS
import 'reflect-metadata';
import 'dotenv/config';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import app from './app';
import { validateEnv } from './config/envValidation';
import { initializeDatabase } from './config/database';
import { DatabaseSeeder } from './services/DatabaseSeeder';
import { ShipmentBomTemplatesSeed } from './seeds/shipmentBomTemplates.seed';
import EmailService from './services/EmailService';
import EmailQueueService from './services/EmailQueueService';
import NotificationSchedulerService from './services/NotificationSchedulerService';
import { startSymfoniaStockSyncJob, stopSymfoniaStockSyncJob } from './jobs/symfoniaStockSync.job';
import { scheduleWarehouseCleanup, stopWarehouseCleanupJob } from './jobs/warehouseCleanupJob';
import { startSymfoniaContractSyncJobs, stopSymfoniaContractSyncJobs } from './jobs/symfoniaContractSync.job';
import { startSymfoniaCarSyncJob, stopSymfoniaCarSyncJob } from './jobs/symfoniaCarSync.job';
import { scheduleCleanExpiredDrafts, stopCleanExpiredDraftsJob } from './jobs/cleanExpiredDrafts';
import { serverLogger, overrideConsole } from './utils/logger';

// Override console.* to redirect all logs to winston files
overrideConsole();

// ── Walidacja ENV — musi być przed wszystkim innym ───────────────────────────
// OWASP A05: Security Misconfiguration
// Rzuca błąd i blokuje start serwera jeśli:
//   - brak JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (lub za krótkie / identyczne)
//   - DISABLE_CSP=true w produkcji
//   - ENABLE_DEBUG_ENDPOINTS=true w produkcji
//   - brak CORS_ORIGIN w produkcji
//   - brak konfiguracji bazy danych w produkcji
validateEnv();

const PORT = process.env.PORT || 3000;
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const SERVER_HOST = process.env.SERVER_HOST || '192.168.2.38';

// Funkcja startowa
const startServer = async () => {
  try {
    // Inicjalizacja bazy danych
    await initializeDatabase();

    // Automatyczne seedowanie (tylko jeśli baza pusta)
    await DatabaseSeeder.seed();

    // Seedowanie szablonów BOM dla kreatora wysyłki (idempotentne)
    await ShipmentBomTemplatesSeed.seed();

    // Inicjalizacja systemu emaili
    serverLogger.info('📧 Inicjalizacja systemu emaili...');
    await EmailService.initialize();
    await EmailQueueService.initialize();

    // Inicjalizacja schedulera powiadomień
    serverLogger.info('⏰ Inicjalizacja schedulera powiadomień...');
    NotificationSchedulerService.initialize();

    // Inicjalizacja CRON synchronizacji Symfonia
    serverLogger.info('🔄 Inicjalizacja synchronizacji stanów magazynowych Symfonia...');
    startSymfoniaStockSyncJob();

    // Inicjalizacja CRON synchronizacji kontraktów
    serverLogger.info('📋 Inicjalizacja synchronizacji kontraktów Symfonia...');
    startSymfoniaContractSyncJobs();

    // Inicjalizacja CRON czyszczenia magazynu
    serverLogger.info('🧹 Inicjalizacja automatycznego czyszczenia magazynu...');
    scheduleWarehouseCleanup();

    // Inicjalizacja CRON synchronizacji samochodów
    serverLogger.info('🚗 Inicjalizacja synchronizacji samochodów Symfonia...');
    startSymfoniaCarSyncJob();

    // Inicjalizacja CRON czyszczenia wygasłych draftów wizardów
    serverLogger.info('🧹 Inicjalizacja czyszczenia wygasłych draftów wizardów...');
    scheduleCleanExpiredDrafts();

    // Start serwera z HTTPS lub HTTP
    if (USE_HTTPS) {
      const certPath = path.join(__dirname, '../certs/cert.pem');
      const keyPath = path.join(__dirname, '../certs/key.pem');

      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        serverLogger.error('❌ Certyfikaty SSL nie znalezione!');
        serverLogger.error(`   Sprawdź: ${certPath} i ${keyPath}`);
        serverLogger.error('');
        serverLogger.error('   Wygeneruj certyfikaty za pomocą:');
        serverLogger.error('   Linux/Mac: ./scripts/generate-certs.sh ' + SERVER_HOST);
        serverLogger.error('   Windows:   .\\scripts\\generate-certs.ps1 -IpAddress ' + SERVER_HOST);
        process.exit(1);
      }

      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      https.createServer(httpsOptions, app).listen(PORT, () => {
        serverLogger.info('╔════════════════════════════════════════╗');
        serverLogger.info('║   Grover Platform Backend API         ║');
        serverLogger.info('║   🔐 HTTPS Mode                        ║');
        serverLogger.info('╠════════════════════════════════════════╣');
        serverLogger.info(`║   🚀 Serwer działa na porcie: ${PORT}    ║`);
        serverLogger.info(`║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)} ║`);
        serverLogger.info(`║   🖥️  Host: ${SERVER_HOST.padEnd(27)} ║`);
        serverLogger.info(`║   📡 API: https://${SERVER_HOST}:${PORT}/api         ║`);
        serverLogger.info(`║   💚 Health: https://${SERVER_HOST}:${PORT}/health  ║`);
        serverLogger.info('╚════════════════════════════════════════╝');
      });
    } else {
      http.createServer(app).listen(PORT, () => {
        serverLogger.info('╔════════════════════════════════════════╗');
        serverLogger.info('║   Grover Platform Backend API         ║');
        serverLogger.info('║   🔓 HTTP Mode (Not Secure)            ║');
        serverLogger.info('╠════════════════════════════════════════╣');
        serverLogger.info(`║   🚀 Serwer działa na porcie: ${PORT}    ║`);
        serverLogger.info(`║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)} ║`);
        serverLogger.info(`║   🖥️  Host: ${SERVER_HOST.padEnd(27)} ║`);
        serverLogger.info(`║   📡 API: http://${SERVER_HOST}:${PORT}/api          ║`);
        serverLogger.info(`║   💚 Health: http://${SERVER_HOST}:${PORT}/health   ║`);
        serverLogger.info('╚════════════════════════════════════════╝');
      });
    }
  } catch (error) {
    serverLogger.error('❌ Błąd uruchomienia serwera:', error);
    process.exit(1);
  }
};

// Obsługa niezłapanych błędów
process.on('unhandledRejection', (reason, promise) => {
  serverLogger.error('❌ Unhandled Rejection', { promise: String(promise), reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  serverLogger.error('❌ Uncaught Exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

// Graceful shutdown
let isShuttingDown = false;

const gracefulShutdown = async (signal: 'SIGTERM' | 'SIGINT'): Promise<void> => {
  if (isShuttingDown) {
    serverLogger.info(`👋 ${signal} received, shutdown already in progress`);
    return;
  }

  isShuttingDown = true;
  serverLogger.info(`👋 ${signal} received, shutting down gracefully`);
  NotificationSchedulerService.stopAll();
  stopSymfoniaStockSyncJob();
  stopSymfoniaContractSyncJobs();
  stopSymfoniaCarSyncJob();
  stopWarehouseCleanupJob();
  stopCleanExpiredDraftsJob();

  try {
    await EmailQueueService.close();
  } catch (error) {
    serverLogger.warn('⚠️  EmailQueueService close error (non-fatal):', error);
  }

  process.exit(0);
};

process.once('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

process.once('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

// Uruchom serwer
startServer();
