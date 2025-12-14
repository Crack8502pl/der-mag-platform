// src/controllers/ImportController.ts
// Kontroler importu materiałów z CSV

import { Request, Response } from 'express';
import { CSVImportService } from '../services/CSVImportService';

export class ImportController {
  /**
   * Upload pliku CSV i generowanie preview z diff
   * POST /api/import/materials/csv
   */
  static async uploadCSV(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Nie przesłano pliku' });
        return;
      }

      const userId = (req as any).user?.id;

      const materialImport = await CSVImportService.parseAndPreview(
        req.file.buffer,
        req.file.originalname,
        userId
      );

      res.status(201).json({
        success: true,
        data: {
          uuid: materialImport.uuid,
          filename: materialImport.filename,
          status: materialImport.status,
          totalRows: materialImport.totalRows,
          newItems: materialImport.newItems,
          existingItems: materialImport.existingItems,
          errorItems: materialImport.errorItems,
          preview: materialImport.diffPreview
        }
      });
    } catch (error) {
      console.error('Błąd przetwarzania CSV:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd przetwarzania pliku CSV'
      });
    }
  }

  /**
   * Pobierz preview importu
   * GET /api/import/materials/:uuid/preview
   */
  static async getPreview(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;

      const materialImport = await CSVImportService.getImportPreview(uuid);

      if (!materialImport) {
        res.status(404).json({ success: false, message: 'Import nie znaleziony' });
        return;
      }

      res.json({
        success: true,
        data: {
          uuid: materialImport.uuid,
          filename: materialImport.filename,
          status: materialImport.status,
          totalRows: materialImport.totalRows,
          newItems: materialImport.newItems,
          existingItems: materialImport.existingItems,
          errorItems: materialImport.errorItems,
          preview: materialImport.diffPreview,
          createdAt: materialImport.createdAt,
          confirmedAt: materialImport.confirmedAt
        }
      });
    } catch (error) {
      console.error('Błąd pobierania preview:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Potwierdź import - dodaj tylko nowe materiały
   * POST /api/import/materials/:uuid/confirm
   */
  static async confirmImport(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;
      const userId = (req as any).user?.id;

      const materialImport = await CSVImportService.confirmImport(uuid, userId);

      res.json({
        success: true,
        data: {
          uuid: materialImport.uuid,
          status: materialImport.status,
          importedIds: materialImport.importedIds,
          newItemsCount: materialImport.importedIds?.length || 0,
          confirmedAt: materialImport.confirmedAt
        },
        message: `Import zakończony. Dodano ${materialImport.importedIds?.length || 0} nowych materiałów.`
      });
    } catch (error) {
      console.error('Błąd potwierdzania importu:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd potwierdzania importu'
      });
    }
  }

  /**
   * Anuluj import
   * DELETE /api/import/materials/:uuid
   */
  static async cancelImport(req: Request, res: Response): Promise<void> {
    try {
      const { uuid } = req.params;

      const cancelled = await CSVImportService.cancelImport(uuid);

      if (!cancelled) {
        res.status(404).json({ success: false, message: 'Import nie znaleziony' });
        return;
      }

      res.json({ success: true, message: 'Import anulowany' });
    } catch (error) {
      console.error('Błąd anulowania importu:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd anulowania importu'
      });
    }
  }

  /**
   * Historia importów
   * GET /api/import/history
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0
      };

      const result = await CSVImportService.getImportHistory(filters);

      res.json({
        success: true,
        data: result.imports,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (error) {
      console.error('Błąd pobierania historii:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Pobierz wzorcowy plik CSV
   * GET /api/import/materials/template
   */
  static async downloadTemplate(req: Request, res: Response): Promise<void> {
    try {
      const csvContent = CSVImportService.generateTemplateCSV();

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=materials_template.csv');
      res.send('\ufeff' + csvContent); // BOM dla UTF-8
    } catch (error) {
      console.error('Błąd generowania wzorca:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}
