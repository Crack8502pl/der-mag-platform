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
import EmailService from './services/EmailService';
import EmailQueueService from './services/EmailQueueService';
import NotificationSchedulerService from './services/NotificationSchedulerService';
import { startSymfoniaStockSyncJob, stopSymfoniaStockSyncJob } from './jobs/symfoniaStockSync.job';
import { scheduleWarehouseCleanup, stopWarehouseCleanupJob } from './jobs/warehouseCleanupJob';

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

    // Inicjalizacja systemu emaili
    console.log('📧 Inicjalizacja systemu emaili...');
    await EmailService.initialize();
    await EmailQueueService.initialize();

    // Inicjalizacja schedulera powiadomień
    console.log('⏰ Inicjalizacja schedulera powiadomień...');
    NotificationSchedulerService.initialize();

    // Inicjalizacja CRON synchronizacji Symfonia
    console.log('🔄 Inicjalizacja synchronizacji stanów magazynowych Symfonia...');
    startSymfoniaStockSyncJob();

    // Inicjalizacja CRON czyszczenia magazynu
    console.log('🧹 Inicjalizacja automatycznego czyszczenia magazynu...');
    scheduleWarehouseCleanup();

    // Start serwera z HTTPS lub HTTP
    if (USE_HTTPS) {
      const certPath = path.join(__dirname, '../certs/cert.pem');
      const keyPath = path.join(__dirname, '../certs/key.pem');

      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.error('❌ Certyfikaty SSL nie znalezione!');
        console.error(`   Sprawdź: ${certPath} i ${keyPath}`);
        console.error('');
        console.error('   Wygeneruj certyfikaty za pomocą:');
        console.error('   Linux/Mac: ./scripts/generate-certs.sh ' + SERVER_HOST);
        console.error('   Windows:   .\\scripts\\generate-certs.ps1 -IpAddress ' + SERVER_HOST);
        process.exit(1);
      }

      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log('╔════════════════════════════════════════╗');
        console.log('║   Grover Platform Backend API         ║');
        console.log('║   🔐 HTTPS Mode                        ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║   🚀 Serwer działa na porcie: ${PORT}    ║`);
        console.log(`║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)} ║`);
        console.log(`║   🖥️  Host: ${SERVER_HOST.padEnd(27)} ║`);
        console.log(`║   📡 API: https://${SERVER_HOST}:${PORT}/api         ║`);
        console.log(`║   💚 Health: https://${SERVER_HOST}:${PORT}/health  ║`);
        console.log('╚════════════════════════════════════════╝');
      });
    } else {
      http.createServer(app).listen(PORT, () => {
        console.log('╔════════════════════════════════════════╗');
        console.log('║   Grover Platform Backend API         ║');
        console.log('║   🔓 HTTP Mode (Not Secure)            ║');
        console.log('╠════════════════════════════════════════╣');
        console.log(`║   🚀 Serwer działa na porcie: ${PORT}    ║`);
        console.log(`║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(19)} ║`);
        console.log(`║   🖥️  Host: ${SERVER_HOST.padEnd(27)} ║`);
        console.log(`║   📡 API: http://${SERVER_HOST}:${PORT}/api          ║`);
        console.log(`║   💚 Health: http://${SERVER_HOST}:${PORT}/health   ║`);
        console.log('╚════════════════════════════════════════╝');
      });
    }
  } catch (error) {
    console.error('❌ Błąd uruchomienia serwera:', error);
    process.exit(1);
  }
};

// Obsługa niezłapanych błędów
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  NotificationSchedulerService.stopAll();
  stopSymfoniaStockSyncJob();
  stopWarehouseCleanupJob();
  await EmailQueueService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  stopSymfoniaStockSyncJob();
  stopWarehouseCleanupJob();
  await EmailQueueService.close();
  process.exit(0);
});

// Uruchom serwer
startServer();
