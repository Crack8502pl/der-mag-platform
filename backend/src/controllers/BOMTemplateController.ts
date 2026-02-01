// src/controllers/BOMTemplateController.ts
// Controller for BOM Templates and Dependency Rules

import { Request, Response } from 'express';
import { BOMTemplateService } from '../services/BOMTemplateService';
import { BomDependencyService } from '../services/BomDependencyService';
import fs from 'fs';
import path from 'path';

export class BOMTemplateController {
  // ========== BOM TEMPLATES ==========

  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 30, category, systemType, search } = req.query;
      
      const result = await BOMTemplateService.getTemplates({
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        systemType: systemType as string,
        search: search as string,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error getting templates:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas pobierania szablonów' 
      });
    }
  }

  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await BOMTemplateService.getTemplate(Number(id));

      if (!template) {
        res.status(404).json({ 
          success: false, 
          message: 'Szablon nie znaleziony' 
        });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error: any) {
      console.error('Error getting template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas pobierania szablonu' 
      });
    }
  }

  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await BOMTemplateService.getCategories();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error('Error getting categories:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas pobierania kategorii' 
      });
    }
  }

  static async getCsvTemplate(req: Request, res: Response): Promise<void> {
    try {
      const csvTemplate = BOMTemplateService.generateCsvTemplate();
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=bom-template.csv');
      res.send('\ufeff' + csvTemplate); // BOM for UTF-8
    } catch (error: any) {
      console.error('Error generating CSV template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas generowania szablonu CSV' 
      });
    }
  }

  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const template = await BOMTemplateService.createTemplate(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas tworzenia szablonu' 
      });
    }
  }

  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const template = await BOMTemplateService.updateTemplate(Number(id), req.body);

      if (!template) {
        res.status(404).json({ 
          success: false, 
          message: 'Szablon nie znaleziony' 
        });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas aktualizacji szablonu' 
      });
    }
  }

  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await BOMTemplateService.deleteTemplate(Number(id));
      res.json({ success: true, message: 'Szablon usunięty' });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas usuwania szablonu' 
      });
    }
  }

  static async importCsv(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ 
          success: false, 
          message: 'Nie przesłano pliku' 
        });
        return;
      }

      const filePath = req.file.path;
      const result = await BOMTemplateService.importFromCsv(filePath);

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      res.json({ 
        success: true, 
        data: result,
        message: `Zaimportowano ${result.imported} rekordów, pominięto ${result.skipped}` 
      });
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      
      // Clean up on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas importu CSV' 
      });
    }
  }

  static async copyTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id, targetCategoryId } = req.params;
      const result = await BOMTemplateService.copyTemplate(Number(id), targetCategoryId);
      
      res.json({ 
        success: true, 
        data: result,
        message: 'Szablon skopiowany' 
      });
    } catch (error: any) {
      console.error('Error copying template:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas kopiowania szablonu' 
      });
    }
  }

  // ========== DEPENDENCY RULES ==========

  static async getDependencies(req: Request, res: Response): Promise<void> {
    try {
      const { category, systemType, active } = req.query;
      
      const rules = await BomDependencyService.getRules({
        category: category as string,
        systemType: systemType as string,
        active: active === 'true',
      });

      res.json({ success: true, data: rules });
    } catch (error: any) {
      console.error('Error getting dependencies:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas pobierania reguł' 
      });
    }
  }

  static async getDependency(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rule = await BomDependencyService.getRule(Number(id));

      if (!rule) {
        res.status(404).json({ 
          success: false, 
          message: 'Reguła nie znaleziona' 
        });
        return;
      }

      res.json({ success: true, data: rule });
    } catch (error: any) {
      console.error('Error getting dependency:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas pobierania reguły' 
      });
    }
  }

  static async createDependency(req: Request, res: Response): Promise<void> {
    try {
      const rule = await BomDependencyService.createRule(req.body);
      res.status(201).json({ success: true, data: rule });
    } catch (error: any) {
      console.error('Error creating dependency:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas tworzenia reguły' 
      });
    }
  }

  static async updateDependency(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const rule = await BomDependencyService.updateRule(Number(id), req.body);

      if (!rule) {
        res.status(404).json({ 
          success: false, 
          message: 'Reguła nie znaleziona' 
        });
        return;
      }

      res.json({ success: true, data: rule });
    } catch (error: any) {
      console.error('Error updating dependency:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas aktualizacji reguły' 
      });
    }
  }

  static async deleteDependency(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await BomDependencyService.deleteRule(Number(id));
      res.json({ success: true, message: 'Reguła usunięta' });
    } catch (error: any) {
      console.error('Error deleting dependency:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas usuwania reguły' 
      });
    }
  }

  static async validateBom(req: Request, res: Response): Promise<void> {
    try {
      const { materials, category, systemType } = req.body;
      
      if (!materials || !Array.isArray(materials)) {
        res.status(400).json({ 
          success: false, 
          message: 'Nieprawidłowe dane - wymagana tablica materiałów' 
        });
        return;
      }

      const result = await BomDependencyService.validateBom(materials, category, systemType);
      
      res.json({ 
        success: true, 
        data: result,
        valid: result.errors.length === 0
      });
    } catch (error: any) {
      console.error('Error validating BOM:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Błąd podczas walidacji BOM' 
      });
    }
  }
}
