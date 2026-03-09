// src/services/SymfoniaMSSQLService.ts
// Service for connecting to Symfonia MSSQL database

import * as sql from 'mssql';

export interface GlobalSearchResult {
  tableName: string;
  schemaName: string;
  columnName: string;
  matchedValue: string;
  fullRecord: Record<string, any>;
}

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

/** Timeout in milliseconds for per-table search queries during global search */
const TABLE_SEARCH_TIMEOUT_MS = 5000;

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
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getConfig());
      const result = await pool.request().query(`
        SELECT
          s.name AS [schema],
          t.name AS [name],
          SUM(p.rows) AS [rowCount]
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN sys.partitions p ON t.object_id = p.object_id
        WHERE p.index_id IN (0, 1)
        GROUP BY s.name, t.name
        ORDER BY s.name, t.name
      `);
      return result.recordset;
    } catch (error) {
      console.error('❌ SymfoniaMSSQLService.getTables() ERROR:', error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Get column structure of a table
   */
  static async getTableStructure(schema: string, tableName: string): Promise<Array<{
    columnName: string;
    dataType: string;
    maxLength: number | null;
    isNullable: boolean;
    isPrimaryKey: boolean;
  }>> {
    const pool = await sql.connect(getConfig());
    try {
      const request = pool.request();
      request.input('schema', sql.NVarChar, schema);
      request.input('tableName', sql.NVarChar, tableName);
      const result = await request.query(`
        SELECT
          c.COLUMN_NAME AS [columnName],
          c.DATA_TYPE AS [dataType],
          c.CHARACTER_MAXIMUM_LENGTH AS [maxLength],
          CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS [isNullable],
          CASE WHEN kcu.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS [isPrimaryKey]
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          ON tc.TABLE_SCHEMA = c.TABLE_SCHEMA
          AND tc.TABLE_NAME = c.TABLE_NAME
          AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
          ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
          AND kcu.COLUMN_NAME = c.COLUMN_NAME
        WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @tableName
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
  static async getTableSampleData(schema: string, tableName: string, limit: number = 10): Promise<any[]> {
    const safeLimit = Math.min(Math.max(1, limit), 10);
    // Validate schema and tableName: only allow alphanumeric characters and underscores
    if (!/^[A-Za-z0-9_]+$/.test(schema)) {
      throw new Error('Nieprawidłowa nazwa schematu');
    }
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      throw new Error('Nieprawidłowa nazwa tabeli');
    }
    const safeName = `[${schema}].[${tableName}]`;
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
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getConfig());
      const result = await pool.request().query(`
        SELECT
          rc.CONSTRAINT_NAME AS [fkName],
          kcu1.TABLE_NAME AS [fromTable],
          kcu1.COLUMN_NAME AS [fromColumn],
          kcu2.TABLE_NAME AS [toTable],
          kcu2.COLUMN_NAME AS [toColumn]
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu1
          ON rc.CONSTRAINT_NAME = kcu1.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu2
          ON rc.UNIQUE_CONSTRAINT_NAME = kcu2.CONSTRAINT_NAME
          AND kcu1.ORDINAL_POSITION = kcu2.ORDINAL_POSITION
        ORDER BY [fromTable], [fromColumn]
      `);
      return result.recordset;
    } catch (error) {
      console.error('❌ SymfoniaMSSQLService.getForeignKeys() ERROR:', error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Get list of views
   */
  static async getViews(): Promise<Array<{ schema: string; name: string }>> {
    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(getConfig());
      const result = await pool.request().query(`
        SELECT
          TABLE_SCHEMA AS [schema],
          TABLE_NAME AS [name]
        FROM INFORMATION_SCHEMA.VIEWS
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);
      return result.recordset;
    } catch (error) {
      console.error('❌ SymfoniaMSSQLService.getViews() ERROR:', error);
      throw error;
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }

  /**
   * Wyszukaj rekordy po wartości w konkretnej kolumnie (LIKE search)
   */
  static async searchInTable(
    schema: string,
    tableName: string,
    columnName: string,
    searchValue: string,
    limit: number = 100
  ): Promise<any[]> {
    if (!/^[A-Za-z0-9_]+$/.test(schema)) {
      throw new Error('Nieprawidłowa nazwa schematu');
    }
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      throw new Error('Nieprawidłowa nazwa tabeli');
    }
    if (!/^[A-Za-z0-9_]+$/.test(columnName)) {
      throw new Error('Nieprawidłowa nazwa kolumny');
    }
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(1, limit), 500) : 100;
    const safeName = `[${schema}].[${tableName}]`;
    const safeColumn = `[${columnName}]`;
    const pool = await sql.connect(getConfig());
    try {
      const request = pool.request();
      request.input('searchValue', sql.NVarChar, `%${searchValue}%`);
      const result = await request.query(
        `SELECT TOP ${safeLimit} * FROM ${safeName} WHERE CAST(${safeColumn} AS NVARCHAR(MAX)) LIKE @searchValue`
      );
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  /**
   * Batch search - wyszukaj wiele wartości naraz (dla CSV)
   * Używa IN clause dla dokładnego dopasowania
   */
  static async batchSearchByValues(
    schema: string,
    tableName: string,
    columnName: string,
    values: string[]
  ): Promise<{ found: any[]; notFound: string[] }> {
    if (!/^[A-Za-z0-9_]+$/.test(schema)) {
      throw new Error('Nieprawidłowa nazwa schematu');
    }
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      throw new Error('Nieprawidłowa nazwa tabeli');
    }
    if (!/^[A-Za-z0-9_]+$/.test(columnName)) {
      throw new Error('Nieprawidłowa nazwa kolumny');
    }
    const safeValues = values.slice(0, 1000);
    const safeName = `[${schema}].[${tableName}]`;
    const safeColumn = `[${columnName}]`;
    const pool = await sql.connect(getConfig());
    try {
      const request = pool.request();
      const placeholders = safeValues.map((v, i) => {
        request.input(`val${i}`, sql.NVarChar, v);
        return `@val${i}`;
      });
      const result = await request.query(
        `SELECT *, CAST(${safeColumn} AS NVARCHAR(MAX)) AS __searchValue FROM ${safeName} WHERE CAST(${safeColumn} AS NVARCHAR(MAX)) IN (${placeholders.join(', ')})`
      );
      const found: any[] = result.recordset;
      const foundValues = new Set(
        found
          .map((row) => row.__searchValue as string)
          .filter((v) => v !== null && v !== undefined)
      );
      const notFound = safeValues.filter((v) => !foundValues.has(v));
      return { found, notFound };
    } finally {
      await pool.close();
    }
  }

  /**
   * Pobierz dane z paginacją (zamiast tylko TOP 10)
   */
  static async getTableDataPaginated(
    schema: string,
    tableName: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    if (!/^[A-Za-z0-9_]+$/.test(schema)) {
      throw new Error('Nieprawidłowa nazwa schematu');
    }
    if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
      throw new Error('Nieprawidłowa nazwa tabeli');
    }
    const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(1, pageSize), 500) : 50;
    const offset = (safePage - 1) * safePageSize;
    const safeName = `[${schema}].[${tableName}]`;
    const pool = await sql.connect(getConfig());
    try {
      const countResult = await pool.request().query(
        `SELECT COUNT(*) AS [total] FROM ${safeName}`
      );
      const total: number = countResult.recordset[0].total;
      const dataResult = await pool.request().query(
        `SELECT * FROM ${safeName} ORDER BY 1 OFFSET ${offset} ROWS FETCH NEXT ${safePageSize} ROWS ONLY`
      );
      return { data: dataResult.recordset, total, page: safePage, pageSize: safePageSize };
    } finally {
      await pool.close();
    }
  }

  /**
   * Przeszukaj jedną tabelę w podanych kolumnach tekstowych w poszukiwaniu wartości.
   * Zwraca wyniki z informacją, w której kolumnie nastąpiło trafienie.
   */
  private static async searchTableForValue(
    pool: sql.ConnectionPool,
    schema: string,
    tableName: string,
    columns: string[],
    searchValue: string,
    exactMatch: boolean,
  ): Promise<GlobalSearchResult[]> {
    const results: GlobalSearchResult[] = [];
    if (columns.length === 0) return results;

    if (!/^[A-Za-z0-9_]+$/.test(schema) || !/^[A-Za-z0-9_]+$/.test(tableName)) {
      return results;
    }

    const validColumns = columns.filter((c) => /^[A-Za-z0-9_]+$/.test(c));
    if (validColumns.length === 0) return results;

    const safeName = `[${schema}].[${tableName}]`;

    try {
      const request = pool.request();
      request.timeout = TABLE_SEARCH_TIMEOUT_MS;
      request.input('searchValue', sql.NVarChar, exactMatch ? searchValue : `%${searchValue}%`);
      const operator = exactMatch ? '=' : 'LIKE';

      const unionParts = validColumns.map((col) => {
        const safeCol = `[${col}]`;
        // The column name is already validated to contain only [A-Za-z0-9_],
        // so it is safe to embed directly in the SQL literal.
        const escapedCol = col.replace(/'/g, "''");
        return `SELECT TOP 5 *, N'${escapedCol}' AS __matchedColumn FROM ${safeName} WHERE CAST(${safeCol} AS NVARCHAR(MAX)) ${operator} @searchValue`;
      });

      const query = unionParts.join('\nUNION ALL\n');
      const result = await request.query(query);

      for (const row of result.recordset) {
        const matchedColumn: string = row.__matchedColumn;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __matchedColumn, ...fullRecord } = row;
        results.push({
          tableName,
          schemaName: schema,
          columnName: matchedColumn,
          matchedValue: String(row[matchedColumn] ?? ''),
          fullRecord,
        });
      }
    } catch {
      // Pomiń tabelę jeśli zapytanie nie powiodło się (np. timeout, brak uprawnień)
    }

    return results;
  }

  /**
   * Globalne wyszukiwanie wartości we wszystkich tabelach i kolumnach tekstowych.
   * Automatycznie przeszukuje całą bazę danych (max 50 tabel, kolumny: varchar/nvarchar/char/nchar/text/ntext).
   * Opcjonalnie przyjmuje zewnętrzny pool (do ponownego użycia przy batch search).
   */
  static async globalSearch(searchValue: string, exactMatch: boolean = false): Promise<GlobalSearchResult[]> {
    if (!searchValue || searchValue.trim().length === 0) {
      throw new Error('Wartość do wyszukania nie może być pusta');
    }
    const pool = await sql.connect(getConfig());
    try {
      return await SymfoniaMSSQLService._globalSearchWithPool(pool, searchValue, exactMatch);
    } finally {
      await pool.close();
    }
  }

  /**
   * Internal: run global search on an already-open pool.
   * Used by both globalSearch (single-value) and batchGlobalSearch (multi-value, same pool).
   */
  private static async _globalSearchWithPool(
    pool: sql.ConnectionPool,
    searchValue: string,
    exactMatch: boolean,
  ): Promise<GlobalSearchResult[]> {
    const MAX_TABLES = 50;
    const BATCH_SIZE = 5;
    const results: GlobalSearchResult[] = [];

    // Pobierz wszystkie kolumny tekstowe z tabel użytkownika (nie systemowych)
    const columnsResult = await pool.request().query(`
      SELECT
        c.TABLE_SCHEMA AS [schema],
        c.TABLE_NAME AS [tableName],
        c.COLUMN_NAME AS [columnName]
      FROM INFORMATION_SCHEMA.COLUMNS c
      INNER JOIN INFORMATION_SCHEMA.TABLES t
        ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
        AND c.TABLE_NAME = t.TABLE_NAME
      WHERE t.TABLE_TYPE = 'BASE TABLE'
        AND c.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        AND c.DATA_TYPE IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext')
      ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME
    `);

    // Zgrupuj kolumny według tabeli
    const tableMap = new Map<string, { schema: string; tableName: string; columns: string[] }>();
    for (const row of columnsResult.recordset) {
      const key = `${row.schema}.${row.tableName}`;
      if (!tableMap.has(key)) {
        tableMap.set(key, { schema: row.schema, tableName: row.tableName, columns: [] });
      }
      tableMap.get(key)!.columns.push(row.columnName);
    }

    const tables = [...tableMap.values()].slice(0, MAX_TABLES);

    // Przeszukuj tabele równolegle w grupach po BATCH_SIZE
    for (let i = 0; i < tables.length; i += BATCH_SIZE) {
      const batch = tables.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((t) =>
          SymfoniaMSSQLService.searchTableForValue(pool, t.schema, t.tableName, t.columns, searchValue, exactMatch),
        ),
      );
      for (const tableResults of batchResults) {
        results.push(...tableResults);
      }
    }

    return results;
  }

  /**
   * Batch globalne wyszukiwanie - wyszukaj wiele wartości automatycznie w całej bazie.
   * Limit: 500 wartości naraz. Używa jednego poolingu dla wszystkich wartości.
   */
  static async batchGlobalSearch(
    values: string[],
    exactMatch: boolean = false,
  ): Promise<{
    found: Array<{ searchedValue: string; results: GlobalSearchResult[] }>;
    notFound: string[];
    stats: { totalSearched: number; totalFound: number; totalNotFound: number };
  }> {
    const safeValues = [...new Set(values.map((v) => String(v).trim()).filter((v) => v.length > 0))].slice(0, 500);

    if (safeValues.length === 0) {
      throw new Error('Brak wartości do wyszukania');
    }

    const found: Array<{ searchedValue: string; results: GlobalSearchResult[] }> = [];
    const notFound: string[] = [];

    // Użyj jednego połączenia dla całego batch
    const pool = await sql.connect(getConfig());
    try {
      for (const value of safeValues) {
        const results = await SymfoniaMSSQLService._globalSearchWithPool(pool, value, exactMatch);
        if (results.length > 0) {
          found.push({ searchedValue: value, results });
        } else {
          notFound.push(value);
        }
      }
    } finally {
      await pool.close();
    }

    return {
      found,
      notFound,
      stats: {
        totalSearched: safeValues.length,
        totalFound: found.length,
        totalNotFound: notFound.length,
      },
    };
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

    const tablesWithStructure = [];
    for (const table of tables) {
      const structure = await SymfoniaMSSQLService.getTableStructure(table.schema, table.name);
      tablesWithStructure.push({ ...table, columns: structure });
    }

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
