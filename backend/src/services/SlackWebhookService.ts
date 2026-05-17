import * as https from 'https';
import { AppDataSource } from '../config/database';
import { WebhookConfig, WebhookEventType } from '../entities/WebhookConfig.entity';
import { serverLogger } from '../utils/logger';
import {
  SlackMessage,
  SlackSendResult,
  SlackStockCriticalPayload,
  SlackStockLowPayload,
  SlackStockDigestPayload,
  SlackContractPayload,
  SlackPrefabricationPayload,
  SlackImportPayload,
} from '../types/SlackTypes';

export class SlackWebhookService {
  private configRepository = AppDataSource.getRepository(WebhookConfig);

  private async getWebhookUrls(eventType: WebhookEventType): Promise<string[]> {
    const configs = await this.configRepository.find({
      where: [
        { provider: 'slack', eventType, active: true },
        { provider: 'slack', eventType: 'all', active: true },
      ],
    });

    return [...new Set(configs.map(config => config.webhookUrl))];
  }

  private async sendToUrl(url: string, message: SlackMessage, attempt = 1): Promise<SlackSendResult> {
    return new Promise((resolve) => {
      const body = JSON.stringify(message);
      const urlObj = new URL(url);

      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port ? parseInt(urlObj.port, 10) : 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 8000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', async () => {
          if (res.statusCode === 200) {
            resolve({ success: true, statusCode: 200 });
            return;
          }

          if (res.statusCode === 429 && attempt < 3) {
            const delay = Math.pow(2, attempt) * 1000;
            serverLogger.warn(`[Slack] Rate limited, retry ${attempt}/3 after ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            resolve(await this.sendToUrl(url, message, attempt + 1));
            return;
          }

          serverLogger.error(`[Slack] HTTP ${res.statusCode}: ${data}`);
          resolve({ success: false, error: `HTTP ${res.statusCode}`, statusCode: res.statusCode });
        });
      });

      req.on('error', (err) => {
        serverLogger.error(`[Slack] Request error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout (8s)' });
      });

      req.write(body);
      req.end();
    });
  }

  private async sendToAll(eventType: WebhookEventType, message: SlackMessage): Promise<void> {
    let urls: string[];

    try {
      urls = await this.getWebhookUrls(eventType);
    } catch (_error) {
      serverLogger.warn('[Slack] Could not fetch webhook configs (DB not ready?)');
      const envUrl = process.env.SLACK_WEBHOOK_URL;
      urls = envUrl ? [envUrl] : [];
    }

    if (urls.length === 0) {
      serverLogger.debug(`[Slack] No active webhooks for event: ${eventType}`);
      return;
    }

    await Promise.allSettled(
      urls.map(url => this.sendToUrl(url, message).then(result => {
        if (!result.success) {
          serverLogger.error(`[Slack] Failed to send to ${url}: ${result.error}`);
        } else {
          serverLogger.info(`[Slack] Sent ${eventType} notification`);
        }
      }))
    );
  }

  private buildStockCriticalMessage(payload: SlackStockCriticalPayload): SlackMessage {
    return {
      text: `🚨 KRYTYCZNY BRAK: ${payload.materialName}`,
      icon_emoji: ':rotating_light:',
      username: 'Grover Alert',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Krytyczny brak materiału', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Materiał:*\n${payload.materialName}` },
            { type: 'mrkdwn', text: `*Nr katalogowy:*\n${payload.catalogNumber}` },
            { type: 'mrkdwn', text: `*Jednostka:*\n${payload.unit}` },
            { type: 'mrkdwn', text: `*Lokalizacja:*\n${payload.warehouseLocation}` },
          ]
        },
        ...(payload.supplier ? [{
          type: 'section' as const,
          text: { type: 'mrkdwn' as const, text: `*Dostawca:* ${payload.supplier}` }
        }] : []),
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.stockUrl}|🔗 Przejdź do magazynu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildStockLowMessage(payload: SlackStockLowPayload): SlackMessage {
    return {
      text: `⚠️ Niski stan: ${payload.materialName} (${payload.currentStock} ${payload.unit})`,
      icon_emoji: ':warning:',
      username: 'Grover Alert',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚠️ Niski stan magazynowy', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Materiał:*\n${payload.materialName}` },
            { type: 'mrkdwn', text: `*Nr katalogowy:*\n${payload.catalogNumber}` },
            { type: 'mrkdwn', text: `*Stan:*\n${payload.currentStock} ${payload.unit}` },
            { type: 'mrkdwn', text: `*Min. poziom:*\n${payload.minStockLevel} ${payload.unit}` },
            { type: 'mrkdwn', text: `*Lokalizacja:*\n${payload.warehouseLocation}` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.stockUrl}|🔗 Przejdź do magazynu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildStockDigestMessage(payload: SlackStockDigestPayload): SlackMessage {
    return {
      text: `📦 Dzienny raport magazynu: ${payload.criticalCount} krytycznych, ${payload.lowCount} niskich stanów`,
      icon_emoji: ':package:',
      username: 'Grover Alert',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `📦 Dzienny raport stanów magazynowych – ${payload.date}`, emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*🚨 Krytyczne braki:*\n${payload.criticalCount}` },
            { type: 'mrkdwn', text: `*⚠️ Niskie stany:*\n${payload.lowCount}` },
            { type: 'mrkdwn', text: `*📊 Łącznie alertów:*\n${payload.totalAlerts}` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.warehouseUrl}|🔗 Przejdź do magazynu> • ${payload.date}` }
          ]
        }
      ]
    };
  }

  private buildContractCreatedMessage(payload: SlackContractPayload): SlackMessage {
    return {
      text: `📋 Nowy kontrakt: ${payload.contractNumber} – ${payload.customName}`,
      icon_emoji: ':clipboard:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📋 Nowy kontrakt', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Numer:*\n${payload.contractNumber}` },
            { type: 'mrkdwn', text: `*Nazwa:*\n${payload.customName}` },
            { type: 'mrkdwn', text: `*Project Manager:*\n${payload.projectManager}` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.contractUrl}|🔗 Przejdź do kontraktu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildContractApprovedMessage(payload: SlackContractPayload): SlackMessage {
    return {
      text: `✅ Kontrakt zatwierdzony: ${payload.contractNumber}`,
      icon_emoji: ':white_check_mark:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '✅ Kontrakt zatwierdzony', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Numer:*\n${payload.contractNumber}` },
            { type: 'mrkdwn', text: `*Nazwa:*\n${payload.customName}` },
            { type: 'mrkdwn', text: `*Project Manager:*\n${payload.projectManager}` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.contractUrl}|🔗 Przejdź do kontraktu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildContractCancelledMessage(payload: SlackContractPayload): SlackMessage {
    return {
      text: `❌ Kontrakt anulowany: ${payload.contractNumber}`,
      icon_emoji: ':x:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '❌ Kontrakt anulowany', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Numer:*\n${payload.contractNumber}` },
            { type: 'mrkdwn', text: `*Nazwa:*\n${payload.customName}` },
            { type: 'mrkdwn', text: `*Project Manager:*\n${payload.projectManager}` },
            ...(payload.reason ? [{ type: 'mrkdwn' as const, text: `*Przyczyna:*\n${payload.reason}` }] : []),
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.contractUrl}|🔗 Przejdź do kontraktu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildContractDeadlineMessage(payload: SlackContractPayload): SlackMessage {
    const urgency = payload.daysRemaining && payload.daysRemaining <= 1 ? '🚨' : payload.daysRemaining && payload.daysRemaining <= 3 ? '⚠️' : '📅';

    return {
      text: `${urgency} Zbliżający się termin: ${payload.contractNumber} (${payload.daysRemaining} dni)`,
      icon_emoji: ':calendar:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${urgency} Zbliżający się termin kontraktu`, emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Numer:*\n${payload.contractNumber}` },
            { type: 'mrkdwn', text: `*Nazwa:*\n${payload.customName}` },
            { type: 'mrkdwn', text: `*Pozostało dni:*\n*${payload.daysRemaining}*` },
            { type: 'mrkdwn', text: `*Project Manager:*\n${payload.projectManager}` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.contractUrl}|🔗 Przejdź do kontraktu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildPrefabricationCompletedMessage(payload: SlackPrefabricationPayload): SlackMessage {
    return {
      text: `🔧 Zakończono prefabrykację: ${payload.subsystemNumber} (${payload.deviceCount} urządzeń)`,
      icon_emoji: ':wrench:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🔧 Zakończono prefabrykację', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Podsystem:*\n${payload.subsystemNumber}` },
            { type: 'mrkdwn', text: `*Kontrakt:*\n${payload.contractNumber}` },
            { type: 'mrkdwn', text: `*Liczba urządzeń:*\n${payload.deviceCount}` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `${payload.completedAt || new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildImportCompletedMessage(payload: SlackImportPayload): SlackMessage {
    return {
      text: `📦 Import zakończony: ${payload.successRate}% sukcesu (${payload.imported} dodanych, ${payload.failed} błędów)`,
      icon_emoji: ':inbox_tray:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📦 Import magazynu zakończony', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Dodano:*\n${payload.imported}` },
            { type: 'mrkdwn', text: `*Zaktualizowano:*\n${payload.updated}` },
            { type: 'mrkdwn', text: `*Błędy:*\n${payload.failed}` },
            { type: 'mrkdwn', text: `*Sukces:*\n${payload.successRate}%` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `<${payload.warehouseUrl}|🔗 Przejdź do magazynu> • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  private buildTestMessage(): SlackMessage {
    return {
      text: '✅ Test webhook Grover Platform – połączenie działa poprawnie',
      icon_emoji: ':white_check_mark:',
      username: 'Grover Platform',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '✅ Test połączenia Slack', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Webhook Grover Platform działa poprawnie.\nBędziesz otrzymywać tutaj powiadomienia o alertach magazynowych, kontraktach i prefabrykacji.'
          }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Grover Platform • ${new Date().toLocaleString('pl-PL')}` }
          ]
        }
      ]
    };
  }

  async notifyStockCritical(payload: SlackStockCriticalPayload): Promise<void> {
    await this.sendToAll('stock_critical', this.buildStockCriticalMessage(payload));
  }

  async notifyStockLow(payload: SlackStockLowPayload): Promise<void> {
    await this.sendToAll('stock_low', this.buildStockLowMessage(payload));
  }

  async notifyStockDigest(payload: SlackStockDigestPayload): Promise<void> {
    await this.sendToAll('stock_digest', this.buildStockDigestMessage(payload));
  }

  async notifyContractCreated(payload: SlackContractPayload): Promise<void> {
    await this.sendToAll('contract_created', this.buildContractCreatedMessage(payload));
  }

  async notifyContractApproved(payload: SlackContractPayload): Promise<void> {
    await this.sendToAll('contract_approved', this.buildContractApprovedMessage(payload));
  }

  async notifyContractCancelled(payload: SlackContractPayload): Promise<void> {
    await this.sendToAll('contract_cancelled', this.buildContractCancelledMessage(payload));
  }

  async notifyContractDeadline(payload: SlackContractPayload): Promise<void> {
    await this.sendToAll('contract_deadline', this.buildContractDeadlineMessage(payload));
  }

  async notifyPrefabricationCompleted(payload: SlackPrefabricationPayload): Promise<void> {
    await this.sendToAll('prefabrication_completed', this.buildPrefabricationCompletedMessage(payload));
  }

  async notifyImportCompleted(payload: SlackImportPayload): Promise<void> {
    await this.sendToAll('import_completed', this.buildImportCompletedMessage(payload));
  }

  async testWebhook(webhookUrl: string): Promise<SlackSendResult> {
    return this.sendToUrl(webhookUrl, this.buildTestMessage());
  }
}

export default new SlackWebhookService();
