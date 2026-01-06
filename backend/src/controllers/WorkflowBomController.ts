// src/controllers/WorkflowBomController.ts
// Kontroler zarządzania BOM workflow

import { Request, Response } from 'express';
import WorkflowBomService from '../services/WorkflowBomService';
import { SystemType } from '../entities/Subsystem';

export class WorkflowBomController {
  /**
   * POST /api/workflow-bom/import-csv
   * Import szablonu BOM z CSV
   */
  static async importCsv(req: Request, res: Response): Promise<void> {
    try {
      const { csvContent, systemType, templateCode, name, description } = req.body;

      if (!csvContent || !systemType || !templateCode || !name) {
        res.status(400).json({
          success: false,
          message: 'Brak wymaganych parametrów: csvContent, systemType, templateCode, name'
        });
        return;
      }

      // Walidacja systemType
      if (!Object.values(SystemType).includes(systemType)) {
        res.status(400).json({
          success: false,
          message: `Nieprawidłowy typ systemu. Dozwolone: ${Object.values(SystemType).join(', ')}`
        });
        return;
      }

      const template = await WorkflowBomService.importBomTemplateFromCsv(
        csvContent,
        systemType,
        templateCode,
        name,
        description
      );

      const stats = await WorkflowBomService.getTemplateStats(template.id);

      res.status(201).json({
        success: true,
        message: 'Szablon BOM zaimportowany pomyślnie',
        data: {
          template,
          stats
        }
      });
    } catch (error) {
      console.error('Błąd importu CSV:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd importu szablonu BOM'
      });
    }
  }

  /**
   * POST /api/workflow-bom/generate/:subsystemId
   * Generowanie BOM dla podsystemu
   */
  static async generateBom(req: Request, res: Response): Promise<void> {
    try {
      const { subsystemId } = req.params;
      const { templateCode, multiplier } = req.body;

      if (!subsystemId) {
        res.status(400).json({
          success: false,
          message: 'Brak ID podsystemu'
        });
        return;
      }

      const generatedBom = await WorkflowBomService.generateBomForSubsystem(
        parseInt(subsystemId, 10),
        templateCode,
        multiplier || 1
      );

      const networkDevicesCount = await WorkflowBomService.countNetworkDevicesInBom(generatedBom.id);

      res.status(201).json({
        success: true,
        message: 'BOM wygenerowany pomyślnie',
        data: {
          generatedBom,
          networkDevicesCount
        }
      });
    } catch (error) {
      console.error('Błąd generowania BOM:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd generowania BOM'
      });
    }
  }

  /**
   * GET /api/workflow-bom/network-devices/:bomId
   * Zliczanie urządzeń sieciowych w BOM
   */
  static async getNetworkDevices(req: Request, res: Response): Promise<void> {
    try {
      const { bomId } = req.params;

      if (!bomId) {
        res.status(400).json({
          success: false,
          message: 'Brak ID BOM'
        });
        return;
      }

      const networkDevicesData = await WorkflowBomService.getNetworkDevicesFromBom(
        parseInt(bomId, 10)
      );

      res.json({
        success: true,
        data: networkDevicesData
      });
    } catch (error) {
      console.error('Błąd pobierania urządzeń sieciowych:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Błąd pobierania urządzeń sieciowych'
      });
    }
  }

  /**
   * GET /api/workflow-bom/templates
   * Lista wszystkich szablonów BOM
   */
  static async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await WorkflowBomService.getAllTemplates();

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Błąd pobierania szablonów:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd pobierania listy szablonów'
      });
    }
  }

  /**
   * GET /api/workflow-bom/templates/:templateCode
   * Szczegóły szablonu BOM
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateCode } = req.params;

      if (!templateCode) {
        res.status(400).json({
          success: false,
          message: 'Brak kodu szablonu'
        });
        return;
      }

      const template = await WorkflowBomService.getTemplateByCode(templateCode);
      const stats = await WorkflowBomService.getTemplateStats(template.id);

      res.json({
        success: true,
        data: {
          template,
          stats
        }
      });
    } catch (error) {
      console.error('Błąd pobierania szablonu:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Szablon nie znaleziony'
      });
    }
  }
}
