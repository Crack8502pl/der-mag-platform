// tests/unit/utils/typeormLogger.test.ts
import { TypeOrmLogger } from '../../../src/utils/typeormLogger';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  dbLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbLogger = require('../../../src/utils/logger').dbLogger;

describe('TypeOrmLogger', () => {
  let logger: TypeOrmLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new TypeOrmLogger();
  });

  describe('logQuery', () => {
    afterEach(() => {
      delete process.env.LOG_SQL_QUERIES;
    });

    it('should not log query when LOG_SQL_QUERIES is not set', () => {
      delete process.env.LOG_SQL_QUERIES;
      logger.logQuery('SELECT * FROM users WHERE id = $1', [1]);
      expect(dbLogger.info).not.toHaveBeenCalled();
    });

    it('should not log query when LOG_SQL_QUERIES=false', () => {
      process.env.LOG_SQL_QUERIES = 'false';
      logger.logQuery('SELECT * FROM users');
      expect(dbLogger.info).not.toHaveBeenCalled();
    });

    it('should log query with info level when LOG_SQL_QUERIES=true', () => {
      process.env.LOG_SQL_QUERIES = 'true';
      logger.logQuery('SELECT * FROM users WHERE id = $1', [1]);
      expect(dbLogger.info).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM users'));
    });

    it('should truncate long queries when LOG_SQL_QUERIES=true', () => {
      process.env.LOG_SQL_QUERIES = 'true';
      const longQuery = 'SELECT ' + 'x'.repeat(600) + ' FROM users';
      logger.logQuery(longQuery, []);
      const call = dbLogger.info.mock.calls[0][0] as string;
      expect(call).toContain('...');
    });
  });

  describe('logQueryError', () => {
    it('should log error with error message', () => {
      logger.logQueryError(new Error('Connection timeout'), 'SELECT * FROM users', []);
      expect(dbLogger.error).toHaveBeenCalledWith(expect.stringContaining('query failed'));
    });

    it('should handle string error', () => {
      logger.logQueryError('Syntax error', 'SELECT * FROM invalid', []);
      expect(dbLogger.error).toHaveBeenCalledWith(expect.stringContaining('query failed'));
    });

    it('should truncate long queries to 500 characters', () => {
      const longQuery = 'SELECT ' + 'x'.repeat(600) + ' FROM users';
      logger.logQueryError('Error', longQuery, []);
      const call = dbLogger.error.mock.calls[0][0] as string;
      expect(call).toContain('...');
    });
  });

  describe('logQuerySlow', () => {
    it('should log slow query with time', () => {
      logger.logQuerySlow(2000, 'SELECT * FROM large_table', []);
      expect(dbLogger.warn).toHaveBeenCalledWith(expect.stringContaining('slow query'));
      expect(dbLogger.warn).toHaveBeenCalledWith(expect.stringContaining('2000ms'));
    });
  });

  describe('logSchemaBuild', () => {
    it('should log schema build message', () => {
      logger.logSchemaBuild('Creating table users');
      expect(dbLogger.info).toHaveBeenCalledWith(expect.stringContaining('schema'));
    });
  });

  describe('logMigration', () => {
    it('should log migration message', () => {
      logger.logMigration('Running migration 1234567890-AddUserTable');
      expect(dbLogger.info).toHaveBeenCalledWith(expect.stringContaining('migration'));
    });
  });

  describe('log', () => {
    it('should log warn level messages', () => {
      logger.log('warn', 'Some warning message');
      expect(dbLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Some warning message'));
    });

    it('should log info level messages', () => {
      logger.log('info', 'Some info message');
      expect(dbLogger.info).toHaveBeenCalledWith(expect.stringContaining('Some info message'));
    });

    it('should log log level messages as info', () => {
      logger.log('log', 'Log level message');
      expect(dbLogger.info).toHaveBeenCalledWith(expect.stringContaining('Log level message'));
    });

    it('should serialize object messages', () => {
      logger.log('info', { key: 'value', nested: { a: 1 } });
      expect(dbLogger.info).toHaveBeenCalled();
    });
  });
});
