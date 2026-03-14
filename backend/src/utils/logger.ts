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
// NOTE: Winston's Console transport uses process.stdout.write directly (no recursion risk).
// The originalConsole* forwarding is intentionally omitted to avoid double console output —
// Winston's Console transport (registered above for non-production) handles stdout display.

const serializeArg = (arg: unknown): string => {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
};

export const overrideConsole = (): void => {
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
