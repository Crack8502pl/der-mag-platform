// src/services/SymfoniaMSSQLService.ts
// Service for connecting to Symfonia MSSQL database

import * as sql from 'mssql';

const getConfig = (): sql.config => ({
  server: process.env.SYMFONIA_MSSQL_SERVER || '',
  database: process.env.SYMFONIA_MSSQL_DATABASE || '',
  user: process.env.SYMFONIA_MSSQL_USER || '',
  password: process.env.SYMFONIA_MSSQL_PASSWORD || '',
  port: parseInt(process.env.SYMFONIA_MSSQL_PORT || '1433', 10),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 30000,
});

export class SymfoniaMSSQLService {
  /**
   * Test connection to MSSQL database
   */
  static async testConnection(): Promise<{ connected: boolean; server: string; database: string; message: string }> {
    const config = getConfig();
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(config);
      await pool.request().query('SELECT 1 AS test');
      return {
        connected: true,
        server: config.server,
        database: config.database || '',
        message: `Połączono z ${config.server}`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        connected: false,
        server: config.server,
        database: config.database || '',
        message: `Błąd połączenia: ${msg}`,
      };
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Get all tables with record counts
   */
  static async getTables(): Promise<Array<{ schema: string; name: string; rowCount: number }>> {
    const pool = await sql.connect(getConfig());
    try {
      const result = await pool.request().query(`
        SELECT
          s.name AS [schema],
          t.name AS [name],
          p.rows AS rowCount
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
        ORDER BY s.name, t.name
      `);
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  /**
   * Get column structure of a table
   */
  static async getTableStructure(tableName: string): Promise<Array<{
    columnName: string;
    dataType: string;
    maxLength: number | null;
    isNullable: boolean;
    isPrimaryKey: boolean;
  }>> {
    const pool = await sql.connect(getConfig());
    try {
      const request = pool.request();
      request.input('tableName', sql.NVarChar, tableName);
      const result = await request.query(`
        SELECT
          c.COLUMN_NAME AS columnName,
          c.DATA_TYPE AS dataType,
          c.CHARACTER_MAXIMUM_LENGTH AS maxLength,
          CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS isNullable,
          CASE WHEN kcu.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          ON tc.TABLE_NAME = c.TABLE_NAME AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND kcu.COLUMN_NAME = c.COLUMN_NAME
        WHERE c.TABLE_NAME = @tableName
        ORDER BY c.ORDINAL_POSITION
      `);
      return result.recordset.map((row: any) => ({
        columnName: row.columnName,
        dataType: row.dataType,
        maxLength: row.maxLength,
        isNullable: row.isNullable === 1,
        isPrimaryKey: row.isPrimaryKey === 1,
      }));
    } finally {
      await pool.close();
    }
  }

  /**
   * Get sample data from a table (max 10 rows)
   */
  static async getTableSampleData(tableName: string, limit: number = 10): Promise<any[]> {
    const safeLimit = Math.min(Math.max(1, limit), 10);
    // Validate tableName: only allow alphanumeric characters, underscores, and dots (no brackets or special chars)
    if (!/^[A-Za-z0-9_.]+$/.test(tableName)) {
      throw new Error('Nieprawidłowa nazwa tabeli');
    }
    // Safely quote each part of a potentially schema-qualified name
    const safeName = tableName
      .split('.')
      .map((part) => `[${part}]`)
      .join('.');
    const pool = await sql.connect(getConfig());
    try {
      const result = await pool.request().query(
        `SELECT TOP ${safeLimit} * FROM ${safeName}`
      );
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  /**
   * Get foreign key relationships between tables
   */
  static async getForeignKeys(): Promise<Array<{
    fkName: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }>> {
    const pool = await sql.connect(getConfig());
    try {
      const result = await pool.request().query(`
        SELECT
          fk.name AS fkName,
          OBJECT_NAME(fkc.parent_object_id) AS fromTable,
          COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS fromColumn,
          OBJECT_NAME(fkc.referenced_object_id) AS toTable,
          COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS toColumn
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        ORDER BY fromTable, fromColumn
      `);
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  /**
   * Get list of views
   */
  static async getViews(): Promise<Array<{ schema: string; name: string }>> {
    const pool = await sql.connect(getConfig());
    try {
      const result = await pool.request().query(`
        SELECT s.name AS [schema], v.name AS [name]
        FROM sys.views v
        INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
        ORDER BY s.name, v.name
      `);
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  /**
   * Export full schema (tables + structures + foreign keys + views)
   */
  static async exportFullSchema(): Promise<object> {
    const [tables, foreignKeys, views] = await Promise.all([
      SymfoniaMSSQLService.getTables(),
      SymfoniaMSSQLService.getForeignKeys(),
      SymfoniaMSSQLService.getViews(),
    ]);

    const tablesWithStructure = await Promise.all(
      tables.map(async (table) => {
        const structure = await SymfoniaMSSQLService.getTableStructure(table.name);
        return { ...table, columns: structure };
      })
    );

    return {
      exportedAt: new Date().toISOString(),
      server: process.env.SYMFONIA_MSSQL_SERVER,
      database: process.env.SYMFONIA_MSSQL_DATABASE,
      tables: tablesWithStructure,
      foreignKeys,
      views,
    };
  }
}
