// src/index.ts
// Punkt wejścia aplikacji

import 'reflect-metadata';
import dotenv from 'dotenv';
import app from './app';
import { initializeDatabase } from './config/database';
import EmailService from './services/EmailService';
import EmailQueueService from './services/EmailQueueService';

// Załaduj zmienne środowiskowe
dotenv.config();

const PORT = process.env.PORT || 3000;

// Funkcja startowa
const startServer = async () => {
  try {
    // Inicjalizacja bazy danych
    await initializeDatabase();

    // Inicjalizacja systemu emaili
    console.log('📧 Inicjalizacja systemu emaili...');
    await EmailService.initialize();
    await EmailQueueService.initialize();

    // Start serwera
    app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════╗');
      console.log('║   Der-Mag Platform Backend API        ║');
      console.log('╠════════════════════════════════════════╣');
      console.log(`║   🚀 Serwer działa na porcie: ${PORT}    ║`);
      console.log(`║   🌍 Environment: ${process.env.NODE_ENV || 'development'}           ║`);
      console.log(`║   📡 API URL: http://localhost:${PORT}     ║`);
      console.log(`║   💚 Health: http://localhost:${PORT}/health ║`);
      console.log('╚════════════════════════════════════════╝');
    });
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
  await EmailQueueService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  await EmailQueueService.close();
  process.exit(0);
});

// Uruchom serwer
startServer();
