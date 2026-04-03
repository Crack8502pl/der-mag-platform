// src/controllers/WizardDraftController.ts
// Kontroler do zarządzania draftami wizardów

import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { WizardDraft } from '../entities/WizardDraft';
import { MoreThan } from 'typeorm';

export class WizardDraftController {

  // GET /api/wizard-drafts/:wizardType
  async getDraft(req: Request, res: Response): Promise<void> {
    try {
      const { wizardType } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const repository = AppDataSource.getRepository(WizardDraft);
      const draft = await repository.findOne({
        where: {
          wizardType,
          userId,
          expiresAt: MoreThan(new Date()),
        },
      });

      res.json({ success: true, data: draft });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/wizard-drafts/:wizardType
  async saveDraft(req: Request, res: Response): Promise<void> {
    try {
      const { wizardType } = req.params;
      const { draftData, currentStep, metadata } = req.body;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      // Validate required draftData field
      if (draftData === undefined || draftData === null || typeof draftData !== 'object') {
        res.status(400).json({ success: false, message: 'Pole draftData jest wymagane i musi być obiektem' });
        return;
      }

      const repository = AppDataSource.getRepository(WizardDraft);

      // Ustaw datę wygaśnięcia na 7 dni od teraz
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Use upsert to safely handle concurrent saves from multiple tabs/sessions
      await repository.upsert(
        {
          wizardType,
          userId,
          draftData,
          currentStep: currentStep ?? null,
          metadata: metadata ?? null,
          expiresAt,
        },
        ['wizardType', 'userId']
      );

      const draft = await repository.findOne({
        where: { wizardType, userId },
      });

      res.json({ success: true, data: draft });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/wizard-drafts/:wizardType
  async deleteDraft(req: Request, res: Response): Promise<void> {
    try {
      const { wizardType } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const repository = AppDataSource.getRepository(WizardDraft);
      await repository.delete({ wizardType, userId });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/wizard-drafts
  async listDrafts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Brak autoryzacji' });
        return;
      }

      const repository = AppDataSource.getRepository(WizardDraft);
      const drafts = await repository.find({
        where: {
          userId,
          expiresAt: MoreThan(new Date()),
        },
        order: { updatedAt: 'DESC' },
      });

      res.json({ success: true, data: drafts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new WizardDraftController();
