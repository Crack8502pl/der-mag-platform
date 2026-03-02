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
      const structure = await SymfoniaMSSQLService.getTableStructure(tableName);
      res.json({ success: true, data: structure });
    } catch (error) {
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
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10), 10);
      const data = await SymfoniaMSSQLService.getTableSampleData(tableName, limit);
      res.json({ success: true, data });
    } catch (error) {
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
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ success: false, message: msg });
    }
  }
}
