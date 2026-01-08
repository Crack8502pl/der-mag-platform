// src/controllers/WarehouseStockController.ts
// Kontroler dla endpointów warehouse stock

import { Request, Response } from 'express';
import { WarehouseStockService } from '../services/WarehouseStockService';
import { StockStatus, MaterialType } from '../entities/WarehouseStock';

export class WarehouseStockController {
  private warehouseStockService: WarehouseStockService;

  constructor() {
    this.warehouseStockService = new WarehouseStockService();
  }

  /**
   * GET /api/warehouse-stock
   * Lista materiałów z filtrami
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        search,
        category,
        supplier,
        status,
        materialType,
        lowStock,
        warehouseLocation,
        page = 1,
        limit = 30,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const filters: any = {};
      if (search) filters.search = search as string;
      if (category) filters.category = category as string;
      if (supplier) filters.supplier = supplier as string;
      if (status) filters.status = status as StockStatus;
      if (materialType) filters.materialType = materialType as MaterialType;
      if (lowStock === 'true') filters.lowStock = true;
      if (warehouseLocation) filters.warehouseLocation = warehouseLocation as string;

      const result = await this.warehouseStockService.getAll(filters, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      });

      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania materiałów',
        error: error.message
      });
    }
  };

  /**
   * GET /api/warehouse-stock/categories
   * Lista kategorii
   */
  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.warehouseStockService.getCategories();
      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania kategorii',
        error: error.message
      });
    }
  };

  /**
   * GET /api/warehouse-stock/suppliers
   * Lista dostawców
   */
  getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
      const suppliers = await this.warehouseStockService.getSuppliers();
      res.json({
        success: true,
        data: suppliers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania dostawców',
        error: error.message
      });
    }
  };

  /**
   * GET /api/warehouse-stock/template
   * Pobierz szablon CSV
   */
  getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const template = this.warehouseStockService.generateCSVTemplate();
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=warehouse_stock_template.csv');
      res.send(template);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas generowania szablonu',
        error: error.message
      });
    }
  };

  /**
   * GET /api/warehouse-stock/:id
   * Szczegóły materiału
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stock = await this.warehouseStockService.getById(parseInt(id));

      if (!stock) {
        res.status(404).json({
          success: false,
          message: 'Materiał nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: stock
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania materiału',
        error: error.message
      });
    }
  };

  /**
   * POST /api/warehouse-stock
   * Utwórz materiał
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const stock = await this.warehouseStockService.create(req.body, userId);

      res.status(201).json({
        success: true,
        data: stock,
        message: 'Materiał utworzony pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas tworzenia materiału'
      });
    }
  };

  /**
   * PUT /api/warehouse-stock/:id
   * Aktualizuj materiał
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const stock = await this.warehouseStockService.update(parseInt(id), req.body, userId);

      res.json({
        success: true,
        data: stock,
        message: 'Materiał zaktualizowany pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas aktualizacji materiału'
      });
    }
  };

  /**
   * DELETE /api/warehouse-stock/:id
   * Usuń materiał
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.warehouseStockService.delete(parseInt(id));

      res.json({
        success: true,
        message: 'Materiał usunięty pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas usuwania materiału'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/:id/reserve
   * Rezerwuj materiał
   */
  reserve = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity, referenceType, referenceId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const stock = await this.warehouseStockService.reserveStock(
        parseInt(id),
        quantity,
        userId,
        referenceType,
        referenceId
      );

      res.json({
        success: true,
        data: stock,
        message: 'Materiał zarezerwowany pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas rezerwacji materiału'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/:id/release
   * Zwolnij rezerwację
   */
  release = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { quantity, referenceType, referenceId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const stock = await this.warehouseStockService.releaseReservation(
        parseInt(id),
        quantity,
        userId,
        referenceType,
        referenceId
      );

      res.json({
        success: true,
        data: stock,
        message: 'Rezerwacja zwolniona pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas zwalniania rezerwacji'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/import/analyze
   * Analyze CSV before import
   */
  analyzeImport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const { csvContent } = req.body;
      if (!csvContent) {
        res.status(400).json({
          success: false,
          message: 'Brak zawartości CSV'
        });
        return;
      }

      const result = await this.warehouseStockService.analyzeCSVForDuplicates(csvContent);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas analizy CSV'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/import
   * Import z CSV
   */
  import = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      // Support both file upload and direct CSV content
      let csvContent: string;
      
      if ((req as any).file) {
        // File upload
        csvContent = (req as any).file.buffer.toString('utf-8');
      } else if (req.body.csvContent) {
        // Direct CSV content
        csvContent = req.body.csvContent;
      } else {
        res.status(400).json({
          success: false,
          message: 'Brak pliku CSV lub zawartości CSV'
        });
        return;
      }

      // Check if we have update options
      const updateOptions = req.body.updateOptions || {
        updateQuantity: false,
        updatePrice: false,
        updateDescription: false,
        updateLocation: false,
        updateSupplier: false,
        skipDuplicates: true
      };

      const result = await this.warehouseStockService.importWithOptions(
        csvContent,
        updateOptions,
        userId
      );

      res.json({
        success: true,
        data: result,
        message: `Import zakończony. Zaimportowano: ${result.imported}, Zaktualizowano: ${result.updated}, Pominięto: ${result.skipped}, Błędy: ${result.failed}`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas importu'
      });
    }
  };

  /**
   * GET /api/warehouse-stock/export
   * Export do Excel
   */
  export = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        search,
        category,
        supplier,
        status,
        materialType,
        lowStock
      } = req.query;

      const filters: any = {};
      if (search) filters.search = search as string;
      if (category) filters.category = category as string;
      if (supplier) filters.supplier = supplier as string;
      if (status) filters.status = status as StockStatus;
      if (materialType) filters.materialType = materialType as MaterialType;
      if (lowStock === 'true') filters.lowStock = true;

      const items = await this.warehouseStockService.exportToExcel(filters);

      res.json({
        success: true,
        data: items
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas eksportu',
        error: error.message
      });
    }
  };

  /**
   * POST /api/warehouse-stock/subsystem/:subsystemId/auto-assign
   * Auto-przypisanie do subsystemu
   */
  autoAssignToSubsystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subsystemId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const count = await this.warehouseStockService.autoAssignToSubsystem(
        parseInt(subsystemId),
        userId
      );

      res.json({
        success: true,
        data: { count },
        message: `Przypisano ${count} materiałów do subsystemu`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas auto-przypisywania'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/task/:taskId/auto-assign
   * Auto-przypisanie do taska
   */
  autoAssignToTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const { taskTypeId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Brak autoryzacji'
        });
        return;
      }

      const count = await this.warehouseStockService.autoAssignToTask(
        parseInt(taskId),
        taskTypeId,
        userId
      );

      res.json({
        success: true,
        data: { count },
        message: `Przypisano ${count} materiałów do zadania`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas auto-przypisywania'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/:id/map-bom
   * Mapuj do BOM template
   */
  mapToBom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { bomTemplateId, ...data } = req.body;

      const mapping = await this.warehouseStockService.mapToBomTemplate(
        parseInt(id),
        bomTemplateId,
        data
      );

      res.json({
        success: true,
        data: mapping,
        message: 'Mapowanie utworzone pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas tworzenia mapowania'
      });
    }
  };

  /**
   * POST /api/warehouse-stock/:id/map-workflow-bom
   * Mapuj do workflow BOM item
   */
  mapToWorkflowBom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { workflowBomTemplateItemId, ...data } = req.body;

      const mapping = await this.warehouseStockService.mapToWorkflowBomItem(
        parseInt(id),
        workflowBomTemplateItemId,
        data
      );

      res.json({
        success: true,
        data: mapping,
        message: 'Mapowanie utworzone pomyślnie'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Błąd podczas tworzenia mapowania'
      });
    }
  };

  /**
   * GET /api/warehouse-stock/:id/history
   * Historia operacji
   */
  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const history = await this.warehouseStockService.getHistory(
        parseInt(id),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Błąd podczas pobierania historii',
        error: error.message
      });
    }
  };
}
