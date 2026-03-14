import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const LOG_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

const createLogger = (filename: string): winston.Logger => {
  const transport = new DailyRotateFile({
    filename: path.join(LOG_DIR, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '14d',
    format: logFormat
  });

  const transports: winston.transport[] = [transport];

  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
          })
        )
      })
    );
  }

  return winston.createLogger({ transports });
};

export const serverLogger = createLogger('backend-server');
export const warehouseSyncLogger = createLogger('warehouse-sync');
export const contractsSyncLogger = createLogger('contracts-sync');

// ===== OVERRIDE console.log/console.error/console.warn =====
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

export const overrideConsole = (): void => {
  console.log = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    serverLogger.info(message);
    if (process.env.NODE_ENV !== 'production') {
      originalConsoleLog.apply(console, args);
    }
  };

  console.error = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    serverLogger.error(message);
    if (process.env.NODE_ENV !== 'production') {
      originalConsoleError.apply(console, args);
    }
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    serverLogger.warn(message);
    if (process.env.NODE_ENV !== 'production') {
      originalConsoleWarn.apply(console, args);
    }
  };
};

export default serverLogger;
