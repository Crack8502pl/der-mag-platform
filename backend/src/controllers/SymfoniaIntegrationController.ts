// src/controllers/SymfoniaIntegrationController.ts
// Controller for Symfonia MSSQL integration endpoints

import { Request, Response } from 'express';
import { SymfoniaMSSQLService } from '../services/SymfoniaMSSQLService';

export class SymfoniaIntegrationController {
  /**
   * GET /api/admin/symfonia-integration/status
   * Test connection and return status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const result = await SymfoniaMSSQLService.testConnection();
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/tables
   * Get list of all tables with record counts
   */
  static async getTables(req: Request, res: Response): Promise<void> {
    try {
      const tables = await SymfoniaMSSQLService.getTables();
      res.json({ success: true, data: tables });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/tables/:tableName
   * Get structure of a specific table
   */
  static async getTableStructure(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const { schema = 'dbo' } = req.query;
      const structure = await SymfoniaMSSQLService.getTableStructure(String(schema), tableName);
      res.json({ success: true, data: structure });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/tables/:tableName/data
   * Get sample data from a table
   */
  static async getTableData(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const { schema = 'dbo' } = req.query;
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 10);
      const data = await SymfoniaMSSQLService.getTableSampleData(String(schema), tableName, limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/foreign-keys
   * Get all foreign key relationships
   */
  static async getForeignKeys(req: Request, res: Response): Promise<void> {
    try {
      const foreignKeys = await SymfoniaMSSQLService.getForeignKeys();
      res.json({ success: true, data: foreignKeys });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/views
   * Get list of views
   */
  static async getViews(req: Request, res: Response): Promise<void> {
    try {
      const views = await SymfoniaMSSQLService.getViews();
      res.json({ success: true, data: views });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/tables/:tableName/search
   * Search in table by column value (LIKE)
   * Query params: schema, column, value, limit
   */
  static async searchInTable(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const { schema = 'dbo', column, value, limit } = req.query;
      if (!column || !value) {
        res.status(400).json({ success: false, message: 'Wymagane parametry: column, value' });
        return;
      }
      const parsedLimit = parseInt(String(limit || '100'), 10);
      const safeLimit = Number.isFinite(parsedLimit) ? Math.min(Math.max(1, parsedLimit), 500) : 100;
      const data = await SymfoniaMSSQLService.searchInTable(
        String(schema),
        tableName,
        String(column),
        String(value),
        safeLimit
      );
      res.json({ success: true, data });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * POST /api/admin/symfonia-integration/tables/:tableName/batch-search
   * Batch search - find multiple values at once (for CSV)
   * Body: { schema, columnName, values: string[] }
   */
  static async batchSearch(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const { schema = 'dbo', columnName, values } = req.body;
      if (!columnName || !Array.isArray(values) || values.length === 0) {
        res.status(400).json({ success: false, message: 'Wymagane pola: columnName, values (tablica)' });
        return;
      }
      if (values.length > 1000) {
        res.status(400).json({ success: false, message: 'Maksymalnie 1000 wartości naraz' });
        return;
      }
      const result = await SymfoniaMSSQLService.batchSearchByValues(
        String(schema),
        tableName,
        String(columnName),
        values.map(String)
      );
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/tables/:tableName/data-paginated
   * Get paginated table data
   * Query params: schema, page, pageSize
   */
  static async getTableDataPaginated(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const { schema = 'dbo' } = req.query;
      const parsedPage = parseInt(String(req.query.page || '1'), 10);
      const parsedPageSize = parseInt(String(req.query.pageSize || '50'), 10);
      const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
      const pageSize = Number.isFinite(parsedPageSize) ? Math.min(Math.max(1, parsedPageSize), 500) : 50;
      const result = await SymfoniaMSSQLService.getTableDataPaginated(
        String(schema),
        tableName,
        page,
        pageSize
      );
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/global-search
   * Query params: value (required), exact (optional, default false)
   *
   * Automatycznie przeszukuje wszystkie tabele i kolumny tekstowe.
   * Zwraca gdzie wartość została znaleziona.
   */
  static async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const { value, exact } = req.query;
      if (!value || String(value).trim().length === 0) {
        res.status(400).json({ success: false, message: 'Wymagany parametr: value' });
        return;
      }
      const exactMatch = exact === 'true' || exact === '1';
      const { results, stats } = await SymfoniaMSSQLService.globalSearch(String(value), exactMatch);
      res.json({ success: true, data: { results, stats } });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController.globalSearch ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * POST /api/admin/symfonia-integration/batch-global-search
   * Body: { values: string[], exact?: boolean }
   *
   * Batch wyszukiwanie wielu wartości we wszystkich tabelach (max 500 wartości).
   */
  static async batchGlobalSearch(req: Request, res: Response): Promise<void> {
    try {
      const { values, exact } = req.body;
      if (!Array.isArray(values) || values.length === 0) {
        res.status(400).json({ success: false, message: 'Wymagane pole: values (tablica)' });
        return;
      }
      if (values.length > 500) {
        res.status(400).json({ success: false, message: 'Maksymalnie 500 wartości naraz' });
        return;
      }
      const exactMatch = exact === true || exact === 'true';
      const result = await SymfoniaMSSQLService.batchGlobalSearch(values.map(String), exactMatch);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController.batchGlobalSearch ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }

  /**
   * GET /api/admin/symfonia-integration/export
   * Export full schema as JSON file
   */
  static async exportSchema(req: Request, res: Response): Promise<void> {
    try {
      const schema = await SymfoniaMSSQLService.exportFullSchema();
      const json = JSON.stringify(schema, null, 2);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="symfonia-schema-export.json"');
      res.send(json);
    } catch (error) {
      console.error('❌ SymfoniaIntegrationController ERROR:', error);
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }
}
