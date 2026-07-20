// src/controllers/BomSubsystemTemplateController.ts
// Controller for BOM subsystem templates

import { Request, Response } from 'express';
import { In } from 'typeorm';
import { BomSubsystemTemplateService } from '../services/BomSubsystemTemplateService';
import { SubsystemType } from '../entities/BomSubsystemTemplate';
import { AppDataSource } from '../config/database';
import { SubsystemTask } from '../entities/SubsystemTask';
import { TaskRelationshipService } from '../services/TaskRelationshipService';
import { TaskRelationshipTraversalService } from '../modules/variable-engine/providers/hierarchy/TaskRelationshipTraversalService';
import { WizardHierarchyResolver } from '../modules/variable-engine/providers/hierarchy/WizardHierarchyResolver';
import type { WizardRelationshipEntry } from '../modules/variable-engine/providers/hierarchy/WizardHierarchyResolver';

export class BomSubsystemTemplateController {
  /**
   * Get all templates with optional filters
   * GET /api/bom-subsystem-templates
   */
  static async getAllTemplates(req: Request, res: Response): Promise<void> {
    try {
      const filters: any = {};

      if (req.query.subsystemType) {
        filters.subsystemType = req.query.subsystemType as SubsystemType;
      }

      if (req.query.taskVariant !== undefined) {
        filters.taskVariant = req.query.taskVariant === 'null' ? null : req.query.taskVariant;
      }

      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }

      const templates = await BomSubsystemTemplateService.getAllTemplates(filters);

      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania szablonów',
        error: error.message
      });
    }
  }

  /**
   * Get a specific template by ID
   * GET /api/bom-subsystem-templates/:id
   */
  static async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await BomSubsystemTemplateService.getTemplateById(Number(id));

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Szablon nie znaleziony'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania szablonu',
        error: error.message
      });
    }
  }

  /**
   * Get active template for subsystem type and variant
   * GET /api/bom-subsystem-templates/for/:subsystemType/:taskVariant?
   */
  static async getTemplateFor(req: Request, res: Response): Promise<void> {
    try {
      const { subsystemType, taskVariant } = req.params;
      const template = await BomSubsystemTemplateService.getTemplate(
        subsystemType as SubsystemType,
        taskVariant === 'null' || !taskVariant ? null : taskVariant
      );

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Szablon nie znaleziony dla tego typu podsystemu'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania szablonu',
        error: error.message
      });
    }
  }

  /**
   * Create a new template
   * POST /api/bom-subsystem-templates
   */
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const data = {
        ...req.body,
        createdById: userId
      };

      const template = await BomSubsystemTemplateService.createTemplate(data);

      res.status(201).json({
        success: true,
        message: 'Szablon utworzony pomyślnie',
        data: template
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd tworzenia szablonu',
        error: error.message
      });
    }
  }

  /**
   * Update an existing template
   * PUT /api/bom-subsystem-templates/:id
   */
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const data = {
        ...req.body,
        updatedById: userId
      };

      const template = await BomSubsystemTemplateService.updateTemplate(
        Number(id),
        data
      );

      res.json({
        success: true,
        message: 'Szablon zaktualizowany pomyślnie',
        data: template
      });
    } catch (error: any) {
      console.error('Error updating template:', error);
      
      if (error.message === 'Template not found') {
        res.status(404).json({
          success: false,
          message: 'Szablon nie znaleziony'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd aktualizacji szablonu',
        error: error.message
      });
    }
  }

  /**
   * Delete a template (soft delete)
   * DELETE /api/bom-subsystem-templates/:id
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await BomSubsystemTemplateService.deleteTemplate(Number(id));

      res.json({
        success: true,
        message: 'Szablon usunięty pomyślnie'
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      
      if (error.message === 'Template not found') {
        res.status(404).json({
          success: false,
          message: 'Szablon nie znaleziony'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd usuwania szablonu',
        error: error.message
      });
    }
  }

  /**
   * Export template to CSV
   * GET /api/bom-subsystem-templates/:id/export
   */
  static async exportTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const csvContent = await BomSubsystemTemplateService.exportTemplateToCsv(Number(id));

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bom-template-${id}.csv"`);
      res.send(csvContent);
    } catch (error: any) {
      console.error('Error exporting template:', error);

      if (error.message === 'Template not found') {
        res.status(404).json({
          success: false,
          message: 'Szablon nie znaleziony'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd eksportu szablonu',
        error: error.message
      });
    }
  }

  /**
   * Import template from CSV
   * POST /api/bom-subsystem-templates/import
   */
  static async importTemplate(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Brak pliku CSV'
        });
        return;
      }

      const { templateName, subsystemType, taskVariant, description } = req.body;

      if (!templateName || !subsystemType) {
        res.status(400).json({
          success: false,
          message: 'Brakuje wymaganych pól: templateName, subsystemType'
        });
        return;
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const userId = req.userId;

      const template = await BomSubsystemTemplateService.importTemplateFromCsv(csvContent, {
        templateName,
        subsystemType: subsystemType as SubsystemType,
        taskVariant: taskVariant || null,
        description,
        createdById: userId
      });

      res.status(201).json({
        success: true,
        message: 'Szablon zaimportowany pomyślnie',
        data: template
      });
    } catch (error: any) {
      console.error('Error importing template:', error);
      res.status(400).json({
        success: false,
        message: 'Błąd importu szablonu',
        error: error.message
      });
    }
  }

  /**
   * Get empty CSV template
   * GET /api/bom-subsystem-templates/csv-template
   */
  static getCsvTemplate(req: Request, res: Response): void {
    const csvContent = BomSubsystemTemplateService.generateCsvTemplate();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bom-template-empty.csv"');
    res.send(csvContent);
  }

  static async exportAllJson(req: Request, res: Response): Promise<void> {
    try {
      const data = await BomSubsystemTemplateService.exportAllToJson();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bom-config-export-${new Date().toISOString().split('T')[0]}.json"`
      );
      res.send(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error('Error exporting full BOM JSON:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd eksportu pełnej konfiguracji BOM',
        error: error.message
      });
    }
  }

  static async importAllJson(req: Request, res: Response): Promise<void> {
    try {
      const requestedMode = (req.body.mode || req.query.mode || 'SKIP') as string;
      const mode = ['SKIP', 'OVERWRITE', 'MERGE'].includes(requestedMode)
        ? (requestedMode as 'SKIP' | 'OVERWRITE' | 'MERGE')
        : 'SKIP';
      const jsonContentFromBody = typeof req.body.jsonContent === 'string' ? req.body.jsonContent : null;
      const jsonContentFromFile = req.file ? req.file.buffer.toString('utf-8') : null;
      const rawJsonContent = jsonContentFromBody || jsonContentFromFile;

      if (!rawJsonContent) {
        res.status(400).json({
          success: false,
          message: 'Brak danych JSON do importu'
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJsonContent);
      } catch {
        res.status(400).json({
          success: false,
          message: 'Nieprawidłowy format JSON'
        });
        return;
      }

      const stats = await BomSubsystemTemplateService.importAllFromJson(parsed as any, { mode });

      res.json({
        success: true,
        message: 'Import konfiguracji BOM zakończony',
        data: stats
      });
    } catch (error: any) {
      console.error('Error importing full BOM JSON:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd importu pełnej konfiguracji BOM',
        error: error.message
      });
    }
  }

  /**
   * Apply template to a task
   * POST /api/bom-subsystem-templates/:id/apply/:taskId
   */
  static async applyTemplateToTask(req: Request, res: Response): Promise<void> {
    try {
      const { id, taskId } = req.params;
      const { configParams } = req.body;

      const taskMaterials = await BomSubsystemTemplateService.applyTemplateToTask(
        Number(taskId),
        Number(id),
        configParams || {}
      );

      res.json({
        success: true,
        message: 'Szablon zastosowany do zadania pomyślnie',
        data: {
          count: taskMaterials.length,
          materials: taskMaterials
        }
      });
    } catch (error: any) {
      console.error('Error applying template:', error);
      
      if (error.message === 'Task not found' || error.message === 'Template not found') {
        res.status(404).json({
          success: false,
          message: error.message === 'Task not found' ? 'Zadanie nie znalezione' : 'Szablon nie znaleziony'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Błąd stosowania szablonu',
        error: error.message
      });
    }
  }

  /**
   * Resolve wizard hierarchy context for a task.
   * POST /api/bom-subsystem-templates/resolve-wizard-hierarchy
   *
   * - When `taskNumber` is provided (non-empty) → DB mode (extend contract):
   *   looks up the task in DB and uses TaskRelationshipTraversalService.
   * - When `taskNumber` is absent or empty → in-memory mode (new contract):
   *   builds hierarchy from the supplied `wizardRelationships` array.
   */
  static async resolveWizardHierarchy(req: Request, res: Response): Promise<void> {
    const { taskKey, taskNumber, wizardRelationships } = req.body as {
      taskKey?: string;
      taskNumber?: string;
      wizardRelationships?: WizardRelationshipEntry[];
    };

    if (!taskKey) {
      res.status(400).json({ success: false, message: 'taskKey jest wymagany' });
      return;
    }

    try {
      let depth = 0;
      let parentKey: string | null = null;
      let childrenCount = 0;
      let path = taskKey;
      let isChildOfLcs = false;

      const useDb = typeof taskNumber === 'string' && taskNumber.trim() !== '';

      if (useDb) {
        // ── DB mode (extend contract) ────────────────────────────────────────
        const taskRepo = AppDataSource.getRepository(SubsystemTask);
        const task = await taskRepo.findOne({ where: { taskNumber } });

        if (task) {
          const relService = new TaskRelationshipService();
          const traversal = new TaskRelationshipTraversalService(relService);

          const pathIds = await traversal.getAncestorPath(task.id, 'task');
          depth = Math.max(0, pathIds.length - 1);

          const childrenIds = await traversal.getChildrenIds(task.id, 'task');
          childrenCount = childrenIds.length;

          const parentId = await traversal.getParentId(task.id, 'task');
          if (parentId !== undefined) {
            // Map parent numeric ID back to task number
            const parentTask = await taskRepo.findOne({
              where: { id: parentId },
              select: ['id', 'taskNumber'],
            });
            parentKey = parentTask?.taskNumber ?? String(parentId);

            // Determine parentType from the relationship record
            const parentRels = await relService.getParents(task.id);
            isChildOfLcs = parentRels.length > 0 && parentRels[0].parentType === 'LCS';
          }

          // Build path string: map each numeric ID to task number
          if (pathIds.length > 0) {
            const pathTaskEntities = await taskRepo.find({
              where: { id: In(pathIds) },
              select: ['id', 'taskNumber'],
            });
            const pathMap = new Map(pathTaskEntities.map((t) => [t.id, t.taskNumber]));
            path = pathIds.map((id) => pathMap.get(id) ?? String(id)).join('/');
          }
        }
        // If task not found in DB, return depth=0 defaults (already set above).
      } else {
        // ── In-memory mode (new contract) ────────────────────────────────────
        const relationships: WizardRelationshipEntry[] = wizardRelationships ?? [];
        const resolver = new WizardHierarchyResolver(relationships);
        const entityId = resolver.getIdForKey(taskKey);

        if (entityId !== undefined) {
          const pathIds = await resolver.getAncestorPath(entityId, 'task');
          depth = Math.max(0, pathIds.length - 1);

          const childrenIds = await resolver.getChildrenIds(entityId, 'task');
          childrenCount = childrenIds.length;

          const parentId = await resolver.getParentId(entityId, 'task');
          if (parentId !== undefined) {
            parentKey = resolver.getKeyForId(parentId) ?? null;
            isChildOfLcs = resolver.getParentType(entityId) === 'LCS';
          }

          path = pathIds
            .map((id) => resolver.getKeyForId(id) ?? String(id))
            .join('/');
        }
        // If taskKey not in any relationship → standalone root (depth=0 defaults).
      }

      res.json({
        success: true,
        data: { depth, parentKey, childrenCount, path, isChildOfLcs },
      });
    } catch (error: any) {
      console.error('Error resolving wizard hierarchy:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd rozwiązywania hierarchii zadania',
        error: error.message,
      });
    }
  }
}
