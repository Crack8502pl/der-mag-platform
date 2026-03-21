import { Request, Response } from 'express';
import https from 'https';
import { IncomingMessage } from 'http';
import fs from 'fs';
import path from 'path';

const TILE_CACHE_DIR = process.env.TILE_CACHE_DIR || './tile-cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni
const USER_AGENT = 'DerMagPlatform/1.0 (https://github.com/Crack8502pl/der-mag-platform)';

export class TileProxyController {
  /**
   * GET /api/tiles/:z/:x/:y
   * Proxy kafelków OSM z lokalnym cache'em
   */
  static async getTile(req: Request, res: Response): Promise<void> {
    const { z, x, y } = req.params;

    // Walidacja parametrów
    const zoom = parseInt(z);
    const tileX = parseInt(x);
    const tileY = parseInt(y.replace('.png', ''));

    if (
      isNaN(zoom) || isNaN(tileX) || isNaN(tileY) ||
      zoom < 0 || zoom > 19 || tileX < 0 || tileY < 0
    ) {
      res.status(400).json({ error: 'Invalid tile coordinates' });
      return;
    }

    const cacheFile = path.join(TILE_CACHE_DIR, z, x, `${tileY}.png`);

    try {
      // Sprawdź cache
      if (fs.existsSync(cacheFile)) {
        const stats = fs.statSync(cacheFile);
        const age = Date.now() - stats.mtimeMs;

        if (age < CACHE_TTL_MS) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());
          res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 dni
          fs.createReadStream(cacheFile).pipe(res);
          return;
        }
      }

      // Pobierz z OSM
      const subdomains = ['a', 'b', 'c'];
      const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
      const tileUrl = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${tileY}.png`;

      const tileRes = await new Promise<IncomingMessage>((resolve, reject) => {
        https.get(tileUrl, {
          headers: { 'User-Agent': USER_AGENT }
        }, resolve).on('error', reject);
      });

      if (tileRes.statusCode === 200) {
        // Zapisz do cache
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        const writeStream = fs.createWriteStream(cacheFile);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=604800');

        tileRes.pipe(writeStream);
        tileRes.pipe(res);
      } else {
        res.status(tileRes.statusCode || 500).json({
          error: 'Failed to fetch tile from OSM',
          status: tileRes.statusCode
        });
      }
    } catch (error) {
      console.error('Tile proxy error:', error);
      res.status(500).json({ error: 'Tile proxy error' });
    }
  }

  /**
   * GET /api/tiles/cache/stats
   * Statystyki cache (tylko admin)
   */
  static async getCacheStats(_req: Request, res: Response): Promise<void> {
    try {
      let totalFiles = 0;
      let totalSize = 0;

      const countFiles = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stats = fs.statSync(itemPath);
          if (stats.isDirectory()) {
            countFiles(itemPath);
          } else if (item.endsWith('.png')) {
            totalFiles++;
            totalSize += stats.size;
          }
        }
      };

      countFiles(TILE_CACHE_DIR);

      res.json({
        success: true,
        data: {
          totalFiles,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          cacheDir: TILE_CACHE_DIR,
          ttlDays: 7
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cache stats' });
    }
  }

  /**
   * DELETE /api/tiles/cache
   * Wyczyść cache (tylko admin)
   */
  static async clearCache(_req: Request, res: Response): Promise<void> {
    try {
      if (fs.existsSync(TILE_CACHE_DIR)) {
        fs.rmSync(TILE_CACHE_DIR, { recursive: true, force: true });
        fs.mkdirSync(TILE_CACHE_DIR, { recursive: true });
      }
      res.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }
}
