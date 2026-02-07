// src/controllers/BomSubsystemTemplateController.ts
// Controller for BOM subsystem templates

import { Request, Response } from 'express';
import { BomSubsystemTemplateService } from '../services/BomSubsystemTemplateService';
import { SubsystemType } from '../entities/BomSubsystemTemplate';

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
}
