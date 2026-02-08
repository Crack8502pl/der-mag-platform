// src/controllers/BomTemplateDependencyRuleController.ts
// REST API controller for BOM template dependency rules

import { Request, Response } from 'express';
import { BomTemplateDependencyRuleService } from '../services/BomTemplateDependencyRuleService';

export class BomTemplateDependencyRuleController {
  /**
   * GET /api/bom-template-dependency-rules/template/:templateId
   * List all rules for a specific template
   */
  static async getRulesForTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.templateId);

      if (isNaN(templateId)) {
        res.status(400).json({ error: 'Invalid template ID' });
        return;
      }

      const rules = await BomTemplateDependencyRuleService.getRulesForTemplate(templateId);

      res.json({
        success: true,
        data: rules
      });
    } catch (error: any) {
      console.error('Error fetching template rules:', error);
      res.status(500).json({
        error: 'Failed to fetch template rules',
        message: error.message
      });
    }
  }

  /**
   * GET /api/bom-template-dependency-rules/:id
   * Get a single rule by ID
   */
  static async getRule(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid rule ID' });
        return;
      }

      const rule = await BomTemplateDependencyRuleService.getRule(id);

      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      res.json({
        success: true,
        data: rule
      });
    } catch (error: any) {
      console.error('Error fetching rule:', error);
      res.status(500).json({
        error: 'Failed to fetch rule',
        message: error.message
      });
    }
  }

  /**
   * POST /api/bom-template-dependency-rules
   * Create a new rule
   */
  static async createRule(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      // Basic validation
      if (!data.templateId || !data.ruleName || !data.targetItemId) {
        res.status(400).json({
          error: 'Missing required fields: templateId, ruleName, targetItemId'
        });
        return;
      }

      const rule = await BomTemplateDependencyRuleService.createRule(data);

      res.status(201).json({
        success: true,
        data: rule
      });
    } catch (error: any) {
      console.error('Error creating rule:', error);
      res.status(500).json({
        error: 'Failed to create rule',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/bom-template-dependency-rules/:id
   * Update an existing rule
   */
  static async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid rule ID' });
        return;
      }

      const data = req.body;
      const rule = await BomTemplateDependencyRuleService.updateRule(id, data);

      res.json({
        success: true,
        data: rule
      });
    } catch (error: any) {
      console.error('Error updating rule:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Rule not found',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to update rule',
          message: error.message
        });
      }
    }
  }

  /**
   * DELETE /api/bom-template-dependency-rules/:id
   * Delete a rule
   */
  static async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid rule ID' });
        return;
      }

      await BomTemplateDependencyRuleService.deleteRule(id);

      res.json({
        success: true,
        message: 'Rule deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      res.status(500).json({
        error: 'Failed to delete rule',
        message: error.message
      });
    }
  }
}
