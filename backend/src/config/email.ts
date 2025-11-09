// src/config/email.ts
// Konfiguracja systemu emaili dla nazwa.pl SMTP

/**
 * Konfiguracja SMTP i emaili
 */
export const emailConfig = {
  // Ustawienia serwera SMTP nazwa.pl
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.nazwa.pl',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // false dla TLS na porcie 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // nazwa.pl wymaga tego
    },
  },
  
  // Dane nadawcy
  from: {
    name: process.env.EMAIL_FROM_NAME || 'Der-Mag Platform',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@dermag.lan',
  },
  
  // Konfiguracja Redis dla kolejki emaili
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  
  // URL frontendu dla linków w emailach
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  
  // Ustawienia kolejki
  queue: {
    attempts: 3, // Liczba prób wysyłki
    backoffDelay: 5000, // Opóźnienie przed ponowną próbą (ms)
    removeOnComplete: true, // Usuń zakończone zadania
    removeOnFail: false, // Zachowaj nieudane zadania do analizy
  },
};

/**
 * Sprawdza czy konfiguracja emaili jest kompletna
 */
export function isEmailConfigured(): boolean {
  return !!(
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.EMAIL_FROM_ADDRESS
  );
}
