import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const LOG_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '5m';
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '7d';
const LOG_COMPRESS = process.env.LOG_COMPRESS !== 'false'; // default: true
const MAX_SERIALIZED_LENGTH = 1000;

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

// Shared transport for all loggers — all categories log to a single daily file
const sharedAppTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_MAX_SIZE,
  maxFiles: LOG_MAX_FILES,
  zippedArchive: LOG_COMPRESS,
  format: logFormat,
});

// Error-only transport with longer retention
const errorTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: LOG_MAX_SIZE,
  maxFiles: '14d',
  zippedArchive: LOG_COMPRESS,
  level: 'error',
  format: logFormat,
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
});

const createLogger = (category: string): winston.Logger => {
  const transports: winston.transport[] = [sharedAppTransport, errorTransport];

  if (process.env.NODE_ENV !== 'production') {
    transports.push(consoleTransport);
  }

  return winston.createLogger({
    level: LOG_LEVEL,
    defaultMeta: { category },
    transports,
  });
};

export const serverLogger = createLogger('server');
export const warehouseSyncLogger = createLogger('warehouse-sync');
export const contractsSyncLogger = createLogger('contracts-sync');
export const dbLogger = createLogger('db');

// ===== OVERRIDE console.log/console.error/console.warn =====
// NOTE: Winston's Console transport uses process.stdout.write directly (no recursion risk).
// Override is active only when OVERRIDE_CONSOLE=true or in production.

const serializeArg = (arg: unknown): string => {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      const str = JSON.stringify(arg);
      return str.length > MAX_SERIALIZED_LENGTH ? `${str.slice(0, MAX_SERIALIZED_LENGTH)}...` : str;
    } catch {
      return String(arg);
    }
  }
  const str = String(arg);
  return str.length > MAX_SERIALIZED_LENGTH ? `${str.slice(0, MAX_SERIALIZED_LENGTH)}...` : str;
};

export const overrideConsole = (): void => {
  const shouldOverride =
    process.env.OVERRIDE_CONSOLE === 'true' || process.env.NODE_ENV === 'production';
  if (!shouldOverride) return;

  console.log = (...args: unknown[]) => {
    serverLogger.info(args.map(serializeArg).join(' '));
  };

  console.error = (...args: unknown[]) => {
    serverLogger.error(args.map(serializeArg).join(' '));
  };

  console.warn = (...args: unknown[]) => {
    serverLogger.warn(args.map(serializeArg).join(' '));
  };

  console.debug = (...args: unknown[]) => {
    serverLogger.debug(args.map(serializeArg).join(' '));
  };
};

export default serverLogger;
