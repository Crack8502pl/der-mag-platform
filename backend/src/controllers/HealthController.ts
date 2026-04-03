// src/controllers/HealthController.ts
import { Request, Response } from 'express';

export class HealthController {
  /**
   * Lightweight ping endpoint - minimal latency test
   * GET /api/ping
   */
  static async ping(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      timestamp: Date.now(),
      server: 'ok'
    });
  }

  /**
   * Bandwidth test endpoint - returns dummy data for speed measurement
   * GET /api/speed-test?size=1024
   * Query param 'size' in KB (default: 1024, max: 10240)
   */
  static async speedTest(req: Request, res: Response): Promise<void> {
    const size = parseInt(req.query.size as string) || 1024; // KB
    const maxSize = 10 * 1024; // Max 10MB

    const actualSize = Math.min(size, maxSize);
    const data = Buffer.alloc(actualSize * 1024, '0'); // Fill with zeros

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Length', data.length.toString());
    res.status(200).send(data);
  }

  /**
   * Health check endpoint
   * GET /api/health
   */
  static async health(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  }
}
