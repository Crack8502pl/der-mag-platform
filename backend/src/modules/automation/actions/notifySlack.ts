// Klocek: powiadomienie na kanał Slack skonfigurowany w systemie.

import { AppDataSource } from '../../../config/database';
import { WebhookConfig } from '../../../entities/WebhookConfig.entity';
import SlackWebhookService from '../../../services/SlackWebhookService';
import type { AutomationAction } from '../contracts';

async function findChannel(value: unknown): Promise<WebhookConfig | null> {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return AppDataSource.getRepository(WebhookConfig).findOne({ where: { id, provider: 'slack', active: true } });
}

export const notifySlackAction: AutomationAction = {
  key: 'notify_slack',
  label: 'Powiadom na Slacku',
  description: 'Wysyła wiadomość na wybrany kanał Slack skonfigurowany w ustawieniach systemu.',
  category: 'Powiadomienia',
  params: [
    { key: 'channel', label: 'Kanał', type: 'select', required: true },
    { key: 'message', label: 'Treść', type: 'longText', required: true },
  ],
  requiredPermission: { module: 'notifications', action: 'sendManual' },
  supportsDryRun: true,
  async loadOptions() {
    const configs = await AppDataSource.getRepository(WebhookConfig).find({ where: { provider: 'slack', active: true }, order: { id: 'ASC' } });
    return { channel: configs.map(config => ({ value: String(config.id), label: config.channelName || `Kanał Slack nr ${config.id}` })) };
  },
  async run(_ctx, params, { dryRun }) {
    const channel = await findChannel(params.channel);
    if (!channel) {
      return { status: 'FAILED', message: 'Wybrany kanał Slack nie istnieje lub jest nieaktywny.', output: {} };
    }
    const output = { channel: channel.channelName || `#${channel.id}` };
    if (dryRun) {
      return { status: 'OK', message: 'Tryb testowy: wiadomość zostałaby wysłana na kanał Slack.', output };
    }
    const result = await SlackWebhookService.sendToChannel(channel.id, String(params.message));
    if (!result.success) {
      return { status: 'FAILED', message: `Nie udało się wysłać wiadomości na Slacku: ${result.error ?? 'nieznany błąd'}.`, output };
    }
    return { status: 'OK', message: 'Wiadomość wysłana na kanał Slack.', output };
  },
};
