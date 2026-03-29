// src/index.ts
// Punkt wejścia aplikacji z obsługą HTTPS
import 'dotenv/config';
import 'reflect-metadata';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import app from './app';
import { initializeDatabase } from './config/database';
import { DatabaseSeeder } from './services/DatabaseSeeder';
import { ShipmentBomTemplatesSeed } from './seeds/shipmentBomTemplates.seed';
import EmailService from './services/EmailService';
import EmailQueueService from './services/EmailQueueService';
import NotificationSchedulerService from './services/NotificationSchedulerService';
import { startSymfoniaStockSyncJob, stopSymfoniaStockSyncJob } from './jobs/symfoniaStockSync.job';
import { scheduleWarehouseCleanup, stopWarehouseCleanupJob } from './jobs/warehouseCleanupJob';
import { startSymfoniaContractSyncJobs, stopSymfoniaContractSyncJobs } from './jobs/symfoniaContractSync.job';
import { serverLogger, overrideConsole } from './utils/logger';

// Override console.* to redirect all logs to winston files
overrideConsole();

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
process.on('SIGTERM', async () => {
  serverLogger.info('👋 SIGTERM received, shutting down gracefully');
  NotificationSchedulerService.stopAll();
  stopSymfoniaStockSyncJob();
  stopSymfoniaContractSyncJobs();
  stopWarehouseCleanupJob();
  await EmailQueueService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  serverLogger.info('👋 SIGINT received, shutting down gracefully');
  stopSymfoniaStockSyncJob();
  stopSymfoniaContractSyncJobs();
  stopWarehouseCleanupJob();
  await EmailQueueService.close();
  process.exit(0);
});

// Uruchom serwer
startServer();
