import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import EmailAutomationAdminService, { EMAIL_AUTOMATION_REASON_MAX_LENGTH } from '../services/EmailAutomationAdminService';

export class EmailAutomationAdminController {
  private static async ensureAdminAccess(req: Request, res: Response): Promise<number | null> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'Brak autoryzacji',
      });
      return null;
    }

    const userRepository = AppDataSource.getRepository(User);
    const actor = await userRepository.findOne({
      where: { id: req.userId },
      relations: ['role'],
    });

    if (!actor || actor.role?.name !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Brak uprawnień administratora',
      });
      return null;
    }

    return actor.id;
  }

  static async getGlobalSetting(req: Request, res: Response): Promise<void> {
    const actorAdminId = await this.ensureAdminAccess(req, res);
    if (!actorAdminId) {
      return;
    }

    const data = await EmailAutomationAdminService.getGlobalSetting();
    res.json({ success: true, data });
  }

  static async updateGlobalSetting(req: Request, res: Response): Promise<void> {
    const actorAdminId = await this.ensureAdminAccess(req, res);
    if (!actorAdminId) {
      return;
    }

    const { enabled } = req.body ?? {};
    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Pole enabled musi być typu boolean',
      });
      return;
    }

    try {
      const data = await EmailAutomationAdminService.setGlobalSetting(enabled, actorAdminId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Błąd aktualizacji ustawienia email automation:', error);
      res.status(500).json({
        success: false,
        message: 'Nie udało się zapisać ustawienia',
      });
    }
  }

  static async updateUserPause(req: Request, res: Response): Promise<void> {
    const actorAdminId = await this.ensureAdminAccess(req, res);
    if (!actorAdminId) {
      return;
    }

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(400).json({
        success: false,
        message: 'Nieprawidłowe ID użytkownika',
      });
      return;
    }

    const { paused, reason } = req.body ?? {};
    if (typeof paused !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Pole paused musi być typu boolean',
      });
      return;
    }

    if (reason !== undefined && typeof reason !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Pole reason musi być tekstem',
      });
      return;
    }

    if (typeof reason === 'string' && reason.trim().length > EMAIL_AUTOMATION_REASON_MAX_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Pole reason może mieć maksymalnie ${EMAIL_AUTOMATION_REASON_MAX_LENGTH} znaków`,
      });
      return;
    }

    try {
      const user = await EmailAutomationAdminService.setUserPause(userId, paused, actorAdminId, reason);
      res.json({
        success: true,
        data: {
          id: user.id,
          emailAutomationPaused: user.emailAutomationPaused,
          emailAutomationPauseReason: user.emailAutomationPauseReason,
          emailAutomationPausedAt: user.emailAutomationPausedAt,
          emailAutomationPausedBy: user.emailAutomationPausedBy,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'Użytkownik nie znaleziony',
        });
        return;
      }

      console.error('Błąd aktualizacji blokady email automation dla użytkownika:', error);
      res.status(500).json({
        success: false,
        message: 'Nie udało się zapisać ustawienia użytkownika',
      });
    }
  }
}
