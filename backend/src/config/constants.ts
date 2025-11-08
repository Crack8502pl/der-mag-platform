// src/config/constants.ts
// Stałe konfiguracyjne dla platformy Der-Mag

export const TASK_TYPES = {
  SMW: 'SMW',
  CSDIP: 'CSDIP',
  LAN_PKP_PLK: 'LAN PKP PLK',
  SMOK_IP_A: 'SMOK-IP/CMOK-IP (Wariant A/SKP)',
  SMOK_IP_B: 'SMOK-IP/CMOK-IP (Wariant B)',
  SSWIN: 'SSWiN',
  SSP: 'SSP',
  SUG: 'SUG',
  OBIEKTY_KUBATUROWE: 'Obiekty Kubaturowe',
  KONTRAKTY_LINIOWE: 'Kontrakty Liniowe',
  LAN_STRUKTURALNY: 'LAN Strukturalny Miedziana',
  ZASILANIA: 'Zasilania',
  STRUKTURY_SWIATŁOWODOWE: 'Struktury Światłowodowe'
} as const;

export const TASK_STATUSES = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  STARTED: 'started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer'
} as const;

export const PHOTO_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export const DEVICE_STATUS = {
  PREFABRICATED: 'prefabricated',
  VERIFIED: 'verified',
  INSTALLED: 'installed'
} as const;

// Limity walidacji
export const VALIDATION_LIMITS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_USERNAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  MAX_IMAGE_WIDTH: 1920,
  MAX_IMAGE_HEIGHT: 1080,
  IMAGE_QUALITY: 80,
  THUMBNAIL_SIZE: 200
} as const;

// Formaty numerów zadań
export const TASK_NUMBER_FORMAT = {
  MIN: 100000000,
  MAX: 999999999,
  LENGTH: 9
} as const;

// Konfiguracja paginacji
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

// Konfiguracja rate limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minut
  MAX_REQUESTS: 100
} as const;
