import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { WebhookConfig, WebhookEventType, WebhookProvider } from '../entities/WebhookConfig.entity';
import SlackWebhookService from '../services/SlackWebhookService';

const WEBHOOK_PROVIDERS: WebhookProvider[] = ['slack', 'teams'];
const WEBHOOK_EVENTS: WebhookEventType[] = [
  'stock_critical',
  'stock_low',
  'stock_digest',
  'contract_created',
  'contract_approved',
  'contract_cancelled',
  'contract_deadline',
  'prefabrication_completed',
  'brigade_task_assigned',
  'import_completed',
  'all',
];

export class WebhookController {
  private static configRepository = AppDataSource.getRepository(WebhookConfig);

  private static validateProvider(provider: unknown): provider is WebhookProvider {
    return typeof provider === 'string' && WEBHOOK_PROVIDERS.includes(provider as WebhookProvider);
  }

  private static validateEventType(eventType: unknown): eventType is WebhookEventType {
    return typeof eventType === 'string' && WEBHOOK_EVENTS.includes(eventType as WebhookEventType);
  }

  static async listConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await WebhookController.configRepository.find({ order: { id: 'ASC' } });
      res.json({ success: true, data: configs });
    } catch (error: any) {
      console.error('WebhookController.listConfigs error:', error);
      res.status(500).json({ success: false, message: 'Błąd pobierania konfiguracji webhooków', error: error.message });
    }
  }

  static async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const { provider, webhookUrl, eventType = 'all', channelName = null, active = true } = req.body;

      if (!WebhookController.validateProvider(provider)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowy provider' });
        return;
      }

      if (typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
        res.status(400).json({ success: false, message: 'Pole webhookUrl jest wymagane' });
        return;
      }

      if (!WebhookController.validateEventType(eventType)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowy eventType' });
        return;
      }

      const config = WebhookController.configRepository.create({
        provider,
        webhookUrl: webhookUrl.trim(),
        eventType,
        channelName: typeof channelName === 'string' ? channelName : null,
        active: Boolean(active),
      });

      const saved = await WebhookController.configRepository.save(config);
      res.status(201).json({ success: true, data: saved });
    } catch (error: any) {
      console.error('WebhookController.createConfig error:', error);
      res.status(500).json({ success: false, message: 'Błąd tworzenia konfiguracji webhooka', error: error.message });
    }
  }

  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe id' });
        return;
      }

      const config = await WebhookController.configRepository.findOne({ where: { id } });
      if (!config) {
        res.status(404).json({ success: false, message: 'Konfiguracja webhooka nie istnieje' });
        return;
      }

      const { provider, webhookUrl, eventType, channelName, active } = req.body;

      if (provider !== undefined) {
        if (!WebhookController.validateProvider(provider)) {
          res.status(400).json({ success: false, message: 'Nieprawidłowy provider' });
          return;
        }
        config.provider = provider;
      }

      if (webhookUrl !== undefined) {
        if (typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
          res.status(400).json({ success: false, message: 'Nieprawidłowe webhookUrl' });
          return;
        }
        config.webhookUrl = webhookUrl.trim();
      }

      if (eventType !== undefined) {
        if (!WebhookController.validateEventType(eventType)) {
          res.status(400).json({ success: false, message: 'Nieprawidłowy eventType' });
          return;
        }
        config.eventType = eventType;
      }

      if (channelName !== undefined) {
        config.channelName = typeof channelName === 'string' ? channelName : null;
      }

      if (active !== undefined) {
        config.active = Boolean(active);
      }

      const saved = await WebhookController.configRepository.save(config);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      console.error('WebhookController.updateConfig error:', error);
      res.status(500).json({ success: false, message: 'Błąd aktualizacji konfiguracji webhooka', error: error.message });
    }
  }

  static async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe id' });
        return;
      }

      const config = await WebhookController.configRepository.findOne({ where: { id } });
      if (!config) {
        res.status(404).json({ success: false, message: 'Konfiguracja webhooka nie istnieje' });
        return;
      }

      await WebhookController.configRepository.delete(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('WebhookController.deleteConfig error:', error);
      res.status(500).json({ success: false, message: 'Błąd usuwania konfiguracji webhooka', error: error.message });
    }
  }

  static async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { provider, webhookUrl } = req.body;

      if (provider !== 'slack') {
        res.status(400).json({ success: false, message: 'Obsługiwany provider testowy: slack' });
        return;
      }

      if (typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
        res.status(400).json({ success: false, message: 'Pole webhookUrl jest wymagane' });
        return;
      }

      const result = await SlackWebhookService.testWebhook(webhookUrl.trim());
      res.json(result);
    } catch (error: any) {
      console.error('WebhookController.testWebhook error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
