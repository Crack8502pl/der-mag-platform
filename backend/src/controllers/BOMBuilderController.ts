// src/controllers/BOMBuilderController.ts
// Kontroler BOM Builder - zarządzanie szablonami materiałów

import { Request, Response } from 'express';
import { BOMBuilderService } from '../services/BOMBuilderService';
import { TemplateService } from '../services/TemplateService';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTemplateDto, GenerateDocumentDto } from '../dto/DocumentDto';

export class BOMBuilderController {
  /**
   * Lista wszystkich materiałów (katalog)
   * GET /api/bom-builder/materials
   */
  static async getMaterials(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        category: req.query.category as string,
        active: req.query.active === 'true',
        search: req.query.search as string
      };

      const materials = await BOMBuilderService.getAllMaterials(filters);

      res.json({ success: true, data: materials });
    } catch (error) {
      console.error('Błąd pobierania materiałów:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Lista kategorii materiałów
   * GET /api/bom-builder/categories
   */
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await BOMBuilderService.getCategories();

      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Błąd pobierania kategorii:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Szablon BOM dla typu zadania
   * GET /api/bom-builder/task-type/:taskTypeId
   */
  static async getTaskTypeBOM(req: Request, res: Response): Promise<void> {
    try {
      const { taskTypeId } = req.params;
      const bom = await BOMBuilderService.getTaskTypeBOM(Number(taskTypeId));

      res.json({ success: true, data: bom });
    } catch (error) {
      console.error('Błąd pobierania BOM:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Utwórz szablon BOM dla typu zadania (batch)
   * POST /api/bom-builder/task-type/:taskTypeId
   */
  static async createTaskTypeBOM(req: Request, res: Response): Promise<void> {
    try {
      const { taskTypeId } = req.params;
      const { materials } = req.body;

      if (!materials || !Array.isArray(materials)) {
        res.status(400).json({ success: false, message: 'Brak listy materiałów' });
        return;
      }

      const created = await BOMBuilderService.createTaskTypeBOM(
        Number(taskTypeId),
        materials
      );

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Błąd tworzenia BOM:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Aktualizuj szablon BOM (batch update)
   * PUT /api/bom-builder/task-type/:taskTypeId
   */
  static async updateTaskTypeBOM(req: Request, res: Response): Promise<void> {
    try {
      const { taskTypeId } = req.params;
      const { toCreate, toUpdate, toDelete } = req.body;

      const result = await BOMBuilderService.updateTaskTypeBOM(
        Number(taskTypeId),
        { toCreate, toUpdate, toDelete }
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Błąd aktualizacji BOM:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Kopiuj szablon BOM do innego typu zadania
   * POST /api/bom-builder/task-type/:sourceId/copy/:targetId
   */
  static async copyBOMTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { sourceId, targetId } = req.params;

      const copied = await BOMBuilderService.copyBOMTemplate(
        Number(sourceId),
        Number(targetId)
      );

      res.status(201).json({
        success: true,
        data: copied,
        message: `Skopiowano ${copied.length} materiałów`
      });
    } catch (error) {
      console.error('Błąd kopiowania BOM:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd kopiowania szablonu'
      });
    }
  }

  /**
   * Dodaj pojedynczy materiał
   * POST /api/bom-builder/items
   */
  static async createItem(req: Request, res: Response): Promise<void> {
    try {
      const material = await BOMBuilderService.createMaterial(req.body);

      res.status(201).json({ success: true, data: material });
    } catch (error) {
      console.error('Błąd dodawania materiału:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Edytuj materiał
   * PUT /api/bom-builder/items/:id
   */
  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const material = await BOMBuilderService.updateMaterial(Number(id), req.body);

      if (!material) {
        res.status(404).json({ success: false, message: 'Materiał nie znaleziony' });
        return;
      }

      res.json({ success: true, data: material });
    } catch (error) {
      console.error('Błąd aktualizacji materiału:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Usuń materiał (soft delete)
   * DELETE /api/bom-builder/items/:id
   */
  static async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await BOMBuilderService.deleteMaterial(Number(id));

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Materiał nie znaleziony' });
        return;
      }

      res.json({ success: true, message: 'Materiał usunięty' });
    } catch (error) {
      console.error('Błąd usuwania materiału:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Lista szablonów dokumentów
   * GET /api/document-templates
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        taskTypeId: req.query.taskTypeId ? Number(req.query.taskTypeId) : undefined,
        type: req.query.type as string,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined
      };

      const templates = await TemplateService.getTemplates(filters);

      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Błąd pobierania szablonów:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Upload szablonu dokumentu
   * POST /api/document-templates
   */
  static async uploadTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Nie przesłano pliku' });
        return;
      }

      const dto = plainToInstance(CreateTemplateDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Błąd walidacji',
          errors: errors.map(e => Object.values(e.constraints || {})).flat()
        });
        return;
      }

      // Określ typ szablonu na podstawie rozszerzenia
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      let templateType = 'pdf';
      if (ext === 'docx') templateType = 'word';
      else if (ext === 'xlsx') templateType = 'excel';

      const template = await TemplateService.createTemplate({
        name: dto.name,
        description: dto.description,
        type: templateType,
        filePath: req.file.path,
        placeholders: dto.placeholders,
        taskTypeId: dto.taskTypeId
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('Błąd uploadu szablonu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Szczegóły szablonu
   * GET /api/document-templates/:id
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idOrUuid = isNaN(Number(id)) ? id : Number(id);

      const template = await TemplateService.getTemplate(idOrUuid);

      if (!template) {
        res.status(404).json({ success: false, message: 'Szablon nie znaleziony' });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error) {
      console.error('Błąd pobierania szablonu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }

  /**
   * Generuj dokument z szablonu
   * POST /api/document-templates/:id/generate
   */
  static async generateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const dto = plainToInstance(GenerateDocumentDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Błąd walidacji',
          errors: errors.map(e => Object.values(e.constraints || {})).flat()
        });
        return;
      }

      const document = await TemplateService.generateDocument(
        Number(id),
        dto.data,
        dto.documentName,
        dto.taskId,
        userId
      );

      res.status(201).json({ success: true, data: document });
    } catch (error) {
      console.error('Błąd generowania dokumentu:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd generowania dokumentu'
      });
    }
  }

  /**
   * Usuń szablon
   * DELETE /api/document-templates/:id
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const idOrUuid = isNaN(Number(id)) ? id : Number(id);

      const deleted = await TemplateService.deleteTemplate(idOrUuid);

      if (!deleted) {
        res.status(404).json({ success: false, message: 'Szablon nie znaleziony' });
        return;
      }

      res.json({ success: true, message: 'Szablon usunięty' });
    } catch (error) {
      console.error('Błąd usuwania szablonu:', error);
      res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
  }
}
