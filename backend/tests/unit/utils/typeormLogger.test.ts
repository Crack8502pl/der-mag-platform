// tests/unit/utils/typeormLogger.test.ts
import { TypeOrmLogger } from '../../../src/utils/typeormLogger';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serverLogger = require('../../../src/utils/logger').default;

describe('TypeOrmLogger', () => {
  let logger: TypeOrmLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new TypeOrmLogger();
  });

  describe('logQuery', () => {
    it('should log query with info level', () => {
      logger.logQuery('SELECT * FROM users WHERE id = $1', [1]);
      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users')
      );
    });

    it('should log query without parameters', () => {
      logger.logQuery('SELECT * FROM users');
      expect(serverLogger.info).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM users'));
    });
  });

  describe('logQueryError', () => {
    it('should log error with error message', () => {
      logger.logQueryError(new Error('Connection timeout'), 'SELECT * FROM users', []);
      expect(serverLogger.error).toHaveBeenCalledWith(expect.stringContaining('query failed'));
    });

    it('should handle string error', () => {
      logger.logQueryError('Syntax error', 'SELECT * FROM invalid', []);
      expect(serverLogger.error).toHaveBeenCalledWith(expect.stringContaining('query failed'));
    });
  });

  describe('logQuerySlow', () => {
    it('should log slow query with time', () => {
      logger.logQuerySlow(2000, 'SELECT * FROM large_table', []);
      expect(serverLogger.warn).toHaveBeenCalledWith(expect.stringContaining('slow query'));
      expect(serverLogger.warn).toHaveBeenCalledWith(expect.stringContaining('2000ms'));
    });
  });

  describe('logSchemaBuild', () => {
    it('should log schema build message', () => {
      logger.logSchemaBuild('Creating table users');
      expect(serverLogger.info).toHaveBeenCalledWith(expect.stringContaining('schema'));
    });
  });

  describe('logMigration', () => {
    it('should log migration message', () => {
      logger.logMigration('Running migration 1234567890-AddUserTable');
      expect(serverLogger.info).toHaveBeenCalledWith(expect.stringContaining('migration'));
    });
  });

  describe('log', () => {
    it('should log warn level messages', () => {
      logger.log('warn', 'Some warning message');
      expect(serverLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Some warning message'));
    });

    it('should log info level messages', () => {
      logger.log('info', 'Some info message');
      expect(serverLogger.info).toHaveBeenCalledWith(expect.stringContaining('Some info message'));
    });

    it('should log log level messages as info', () => {
      logger.log('log', 'Log level message');
      expect(serverLogger.info).toHaveBeenCalledWith(expect.stringContaining('Log level message'));
    });

    it('should serialize object messages', () => {
      logger.log('info', { key: 'value', nested: { a: 1 } });
      expect(serverLogger.info).toHaveBeenCalled();
    });
  });
});
