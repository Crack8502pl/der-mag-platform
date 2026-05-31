import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { serverLogger } from '../utils/logger';

/**
 * Weryfikuje HMAC-SHA256 signature webhooka.
 *
 * Nagłówek:
 *   X-Webhook-Signature: sha256=<hex_digest>
 */
export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      serverLogger.error('[WEBHOOK] WEBHOOK_SECRET nie jest ustawiony — odrzucam request');
      res.status(500).json({ success: false, message: 'Webhook not configured' });
      return;
    }

    serverLogger.warn('[WEBHOOK] WEBHOOK_SECRET nie ustawiony — pomijam weryfikację (tylko development)');
    next();
    return;
  }

  const signature = req.headers['x-webhook-signature'] as string | undefined;
  if (!signature) {
    serverLogger.warn('[WEBHOOK] Brak nagłówka X-Webhook-Signature', { path: req.path, ip: req.ip });
    res.status(401).json({ success: false, message: 'Missing webhook signature' });
    return;
  }

  const [algo, digest] = signature.split('=');
  if (algo !== 'sha256' || !digest) {
    res.status(401).json({ success: false, message: 'Invalid signature format. Expected: sha256=<hex>' });
    return;
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    serverLogger.error('[WEBHOOK] rawBody niedostępny — sprawdź konfigurację express.json()');
    res.status(500).json({ success: false, message: 'Internal configuration error' });
    return;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(digest, 'hex');

    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      serverLogger.warn('[WEBHOOK] Nieprawidłowa signature', { path: req.path, ip: req.ip });
      res.status(401).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }
  } catch {
    res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    return;
  }

  serverLogger.info('[WEBHOOK] Signature zweryfikowana pomyślnie', { path: req.path });
  next();
};
