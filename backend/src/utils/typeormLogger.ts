// src/utils/typeormLogger.ts
// Custom TypeORM logger that routes all SQL logs to winston serverLogger
// TypeORM's default SimpleConsoleLogger writes directly to process.stdout (bypassing console.log),
// so this custom logger is required to capture SQL queries in log files.

import { Logger as TypeOrmLoggerInterface, QueryRunner } from 'typeorm';
import serverLogger from './logger';
import * as util from 'util';

export class TypeOrmLogger implements TypeOrmLoggerInterface {
  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner): void {
    const sql = this.formatQuery(query, parameters);
    serverLogger.info(`[DB] query: ${sql}`);
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner
  ): void {
    const sql = this.formatQuery(query, parameters);
    const errorMsg = error instanceof Error ? (error.stack || error.message) : String(error);
    serverLogger.error(`[DB] query failed: ${sql}`);
    serverLogger.error(`[DB] error: ${errorMsg}`);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    _queryRunner?: QueryRunner
  ): void {
    const sql = this.formatQuery(query, parameters);
    serverLogger.warn(`[DB] slow query (${time}ms): ${sql}`);
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    serverLogger.info(`[DB] schema: ${message}`);
  }

  logMigration(message: string, _queryRunner?: QueryRunner): void {
    serverLogger.info(`[DB] migration: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: any, _queryRunner?: QueryRunner): void {
    const text = typeof message === 'object' ? this.safeSerialize(message) : String(message);
    if (level === 'warn') {
      serverLogger.warn(`[DB] ${text}`);
    } else {
      serverLogger.info(`[DB] ${text}`);
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
    if (parameters && parameters.length > 0) {
      return `${query} -- PARAMETERS: ${this.safeSerialize(parameters)}`;
    }
    return query;
  }
}
