// src/utils/typeormLogger.ts
// Custom TypeORM logger that routes all SQL logs to winston dbLogger.
// TypeORM's default SimpleConsoleLogger writes directly to process.stdout (bypassing console.log),
// so this custom logger is required to capture SQL queries in log files.

import { Logger as TypeOrmLoggerInterface, QueryRunner } from 'typeorm';
import { dbLogger } from './logger';
import * as util from 'util';

const LOG_SQL_QUERIES = process.env.LOG_SQL_QUERIES === 'true';
const MAX_QUERY_LENGTH = 500;

export class TypeOrmLogger implements TypeOrmLoggerInterface {
  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner): void {
    if (!LOG_SQL_QUERIES) return;
    const sql = this.formatQuery(query, parameters);
    dbLogger.debug(`[DB] query: ${sql}`);
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner
  ): void {
    const sql = this.formatQuery(query, parameters);
    const errorMsg = error instanceof Error ? (error.stack || error.message) : String(error);
    dbLogger.error(`[DB] query failed: ${sql}`);
    dbLogger.error(`[DB] error: ${errorMsg}`);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner
  ): void {
    const sql = this.formatQuery(query, parameters);
    dbLogger.warn(`[DB] slow query (${time}ms): ${sql}`);
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    dbLogger.info(`[DB] schema: ${message}`);
  }

  logMigration(message: string, _queryRunner?: QueryRunner): void {
    dbLogger.info(`[DB] migration: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any, _queryRunner?: QueryRunner): void {
    const text = typeof message === 'object' ? this.safeSerialize(message) : String(message);
    if (level === 'warn') {
      dbLogger.warn(`[DB] ${text}`);
    } else {
      dbLogger.info(`[DB] ${text}`);
    }
  }

  private safeSerialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (err) {
      try {
        return util.inspect(value, { depth: 5 });
      } catch {
        return '[Unserializable value]';
      }
    }
  }

  private formatQuery(query: string, parameters?: any[]): string {
    const truncated =
      query.length > MAX_QUERY_LENGTH ? `${query.slice(0, MAX_QUERY_LENGTH)}...` : query;
    if (parameters && parameters.length > 0) {
      return `${truncated} -- PARAMETERS: ${this.safeSerialize(parameters)}`;
    }
    return truncated;
  }
}
