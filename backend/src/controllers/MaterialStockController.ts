// src/controllers/MaterialStockController.ts
// Kontroler zarządzania stanami magazynowymi materiałów

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { MaterialStock } from '../entities/MaterialStock';
import { MaterialImportService } from '../services/MaterialImportService';
import { SymfoniaApiClient } from '../integrations/symfonia/SymfoniaApiClient';
import { Like } from 'typeorm';

export class MaterialStockController {
  /**
   * GET /api/materials/stocks - Lista materiałów z stanami
   */
  static async getStocks(req: Request, res: Response): Promise<void> {
    try {
      const { search, page = 1, limit = 50, warehouse, supplier, lowStock } = req.query;
      const stockRepo = AppDataSource.getRepository(MaterialStock);

      const queryBuilder = stockRepo.createQueryBuilder('stock')
        .where('stock.isActive = :isActive', { isActive: true });

      // Filtr wyszukiwania
      if (search) {
        queryBuilder.andWhere(
          '(stock.partNumber ILIKE :search OR stock.name ILIKE :search OR stock.barcode = :searchExact)',
          { search: `%${search}%`, searchExact: search }
        );
      }

      // Filtr magazynu
      if (warehouse) {
        queryBuilder.andWhere('stock.warehouseLocation = :warehouse', { warehouse });
      }

      // Filtr dostawcy
      if (supplier) {
        queryBuilder.andWhere('stock.supplier = :supplier', { supplier });
      }

      // Filtr niskich stanów
      if (lowStock === 'true') {
        queryBuilder.andWhere('stock.quantityAvailable <= stock.minStockLevel');
      }

      // Paginacja
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      // Sortowanie
      queryBuilder.orderBy('stock.partNumber', 'ASC');

      const [stocks, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: stocks,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/materials/stocks/:id - Szczegóły materiału
   */
  static async getStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stockRepo = AppDataSource.getRepository(MaterialStock);

      const stock = await stockRepo.findOne({
        where: { id: Number(id) }
      });

      if (!stock) {
        res.status(404).json({ success: false, message: 'Materiał nie znaleziony' });
        return;
      }

      res.json({ success: true, data: stock });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/materials/stocks - Ręczne dodanie materiału
   */
  static async createStock(req: Request, res: Response): Promise<void> {
    try {
      const stockRepo = AppDataSource.getRepository(MaterialStock);

      // Sprawdź czy materiał o tym numerze już istnieje
      const existing = await stockRepo.findOne({
        where: { partNumber: req.body.partNumber }
      });

      if (existing) {
        res.status(400).json({ 
          success: false, 
          message: 'Materiał o tym numerze katalogowym już istnieje' 
        });
        return;
      }

      const stock = stockRepo.create(req.body);
      await stockRepo.save(stock);

      res.status(201).json({ success: true, data: stock });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/materials/stocks/:id - Aktualizacja materiału
   */
  static async updateStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stockRepo = AppDataSource.getRepository(MaterialStock);

      const stock = await stockRepo.findOne({
        where: { id: Number(id) }
      });

      if (!stock) {
        res.status(404).json({ success: false, message: 'Materiał nie znaleziony' });
        return;
      }

      // Zaktualizuj pola
      Object.assign(stock, req.body);
      await stockRepo.save(stock);

      res.json({ success: true, data: stock });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/materials/stocks/:id - Usunięcie (soft delete)
   */
  static async deleteStock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stockRepo = AppDataSource.getRepository(MaterialStock);

      const stock = await stockRepo.findOne({
        where: { id: Number(id) }
      });

      if (!stock) {
        res.status(404).json({ success: false, message: 'Materiał nie znaleziony' });
        return;
      }

      // Soft delete
      stock.isActive = false;
      await stockRepo.save(stock);

      res.json({ success: true, message: 'Materiał został usunięty' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/materials/stocks/import - Import z pliku CSV/Excel
   */
  static async importStocks(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Brak pliku do importu' });
        return;
      }

      const { delimiter = ';', mappingType = 'symfonia' } = req.body;
      const userId = (req as any).user?.id;

      const fileType = req.file.mimetype;
      let result;

      if (fileType === 'text/csv' || req.file.originalname.endsWith('.csv')) {
        result = await MaterialImportService.importFromCSV(
          req.file.path,
          req.file.originalname,
          req.file.size,
          userId,
          delimiter,
          mappingType
        );
      } else if (fileType.includes('spreadsheet') || req.file.originalname.match(/\.(xlsx|xls)$/)) {
        result = await MaterialImportService.importFromExcel(
          req.file.path,
          req.file.originalname,
          req.file.size,
          userId,
          mappingType
        );
      } else {
        res.status(400).json({ 
          success: false, 
          message: 'Nieobsługiwany format pliku. Użyj CSV lub Excel.' 
        });
        return;
      }

      res.json({
        success: true,
        data: {
          importLog: result.importLog,
          imported: result.importedCount,
          updated: result.updatedCount,
          errors: result.errorCount
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/materials/stocks/import-history - Historia importów
   */
  static async getImportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50 } = req.query;
      const history = await MaterialImportService.getImportHistory(Number(limit));

      res.json({ success: true, data: history });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/materials/stocks/import/:id - Szczegóły importu
   */
  static async getImportDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const details = await MaterialImportService.getImportDetails(Number(id));

      if (!details) {
        res.status(404).json({ success: false, message: 'Import nie znaleziony' });
        return;
      }

      res.json({ success: true, data: details });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/materials/stocks/template - Pobierz szablon CSV
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const template = MaterialImportService.generateCSVTemplate();

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="szablon_materialy.csv"');
      res.send('\uFEFF' + template); // BOM dla UTF-8
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/materials/stocks/column-mappings - Dostępne mapowania kolumn
   */
  static async getColumnMappings(req: Request, res: Response): Promise<void> {
    try {
      const mappings = MaterialImportService.getColumnMappings();
      res.json({ success: true, data: mappings });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/materials/stocks/check-availability - Sprawdź dostępność dla BOM
   */
  static async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { materials } = req.body;

      if (!Array.isArray(materials)) {
        res.status(400).json({ 
          success: false, 
          message: 'Wymagana tablica materiałów' 
        });
        return;
      }

      const availability = await MaterialImportService.checkAvailability(materials);

      res.json({ success: true, data: availability });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/materials/stocks/reserve - Rezerwuj materiały
   */
  static async reserveMaterials(req: Request, res: Response): Promise<void> {
    try {
      const { materials, orderId } = req.body;

      if (!Array.isArray(materials)) {
        res.status(400).json({ 
          success: false, 
          message: 'Wymagana tablica materiałów' 
        });
        return;
      }

      await MaterialImportService.reserveMaterials(materials, orderId);

      res.json({ 
        success: true, 
        message: 'Materiały zostały zarezerwowane' 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/materials/stocks/release - Zwolnij rezerwację
   */
  static async releaseMaterials(req: Request, res: Response): Promise<void> {
    try {
      const { materials } = req.body;

      if (!Array.isArray(materials)) {
        res.status(400).json({ 
          success: false, 
          message: 'Wymagana tablica materiałów' 
        });
        return;
      }

      await MaterialImportService.releaseMaterials(materials);

      res.json({ 
        success: true, 
        message: 'Rezerwacja została zwolniona' 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/integrations/symfonia/status - Status integracji Symfonia
   */
  static async getSymfoniaStatus(req: Request, res: Response): Promise<void> {
    try {
      const client = new SymfoniaApiClient();
      const status = client.getStatus();
      
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
