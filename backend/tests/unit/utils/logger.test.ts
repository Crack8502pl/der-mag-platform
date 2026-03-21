// tests/unit/utils/logger.test.ts
// Tests for the logger utilities

const mockLoggerInstance = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('winston', () => ({
  format: {
    combine: jest.fn().mockReturnValue({}),
    timestamp: jest.fn().mockReturnValue({}),
    printf: jest.fn().mockReturnValue({}),
    colorize: jest.fn().mockReturnValue({}),
  },
  createLogger: jest.fn().mockReturnValue(mockLoggerInstance),
  transports: {
    Console: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('winston-daily-rotate-file', () => jest.fn().mockReturnValue({}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

describe('logger utilities', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleDebug = console.debug;

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
    jest.clearAllMocks();
  });

  describe('overrideConsole', () => {
    it('should override console.log with serverLogger.info', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      console.log('test message');
      expect(serverLogger.info).toHaveBeenCalledWith('test message');
    });

    it('should override console.error with serverLogger.error', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      console.error('error message');
      expect(serverLogger.error).toHaveBeenCalledWith('error message');
    });

    it('should override console.warn with serverLogger.warn', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      console.warn('warning message');
      expect(serverLogger.warn).toHaveBeenCalledWith('warning message');
    });

    it('should override console.debug with serverLogger.debug', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      console.debug('debug message');
      expect(serverLogger.debug).toHaveBeenCalledWith('debug message');
    });

    it('should serialize Error objects', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      const err = new Error('Test error');
      console.error(err);
      expect(serverLogger.error).toHaveBeenCalledWith(err.stack || err.message);
    });

    it('should serialize plain objects', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      console.log({ key: 'value' });
      expect(serverLogger.info).toHaveBeenCalledWith('{"key":"value"}');
    });

    it('should handle multiple arguments', () => {
      const { overrideConsole, serverLogger } = require('../../../src/utils/logger');
      overrideConsole();

      console.log('a', 'b', 'c');
      expect(serverLogger.info).toHaveBeenCalledWith('a b c');
    });
  });

  describe('serverLogger export', () => {
    it('should export serverLogger', () => {
      const { serverLogger } = require('../../../src/utils/logger');
      expect(serverLogger).toBeDefined();
    });
  });
});
