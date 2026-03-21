// src/services/GoogleMapsService.ts
// Serwis do obsługi linków Google Maps i współrzędnych GPS

import * as https from 'https';
import * as http from 'http';
import { IncomingMessage } from 'http';
import { serverLogger } from '../utils/logger';

export interface GPSCoordinates {
  lat: number;
  lon: number;
}

export interface ParsedGoogleMapsUrl {
  coordinates: GPSCoordinates | null;
  originalUrl: string;
  resolvedUrl?: string;
  isShortened: boolean;
  parseMethod: 'query' | 'at-sign' | 'place' | 'redirect' | 'none';
}

export class GoogleMapsService {
  /**
   * Sprawdza czy URL jest skróconym linkiem Google Maps
   */
  isShortUrl(url: string): boolean {
    return /^https?:\/\/(goo\.gl\/maps|maps\.app\.goo\.gl)\//i.test(url);
  }

  /**
   * Parsuje URL Google Maps i wyciąga współrzędne GPS.
   * Obsługuje formaty:
   *  - https://www.google.com/maps?q=52.2297,21.0122
   *  - https://www.google.com/maps/place/.../@52.2297,21.0122,17z
   *  - https://www.google.com/maps/@52.2297,21.0122,17z
   */
  parseUrl(url: string): GPSCoordinates | null {
    if (!url) return null;

    // Format: ?q=lat,lon
    const queryMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (queryMatch) {
      const lat = parseFloat(queryMatch[1]);
      const lon = parseFloat(queryMatch[2]);
      if (this.validateCoordinates(lat, lon)) {
        return { lat, lon };
      }
    }

    // Format: /data=...!3d{lat}!4d{lon} (most precise coordinates from place data)
    const dataMatch = url.match(/!3d([-\d.]+)!4d([-\d.]+)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lon = parseFloat(dataMatch[2]);
      if (this.validateCoordinates(lat, lon)) {
        return { lat, lon };
      }
    }

    // Format: /@lat,lon,zoom or /@lat,lon (place and direct @)
    const atMatch = url.match(/@([-\d.]+),([-\d.]+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lon = parseFloat(atMatch[2]);
      if (this.validateCoordinates(lat, lon)) {
        return { lat, lon };
      }
    }

    return null;
  }

  /**
   * Parsuje URL i zwraca pełną strukturę z metadanymi
   */
  parseUrlFull(url: string): ParsedGoogleMapsUrl {
    if (!url) {
      return { coordinates: null, originalUrl: url, isShortened: false, parseMethod: 'none' };
    }

    const shortened = this.isShortUrl(url);

    // Format: ?q=lat,lon
    const queryMatch = url.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    if (queryMatch) {
      const lat = parseFloat(queryMatch[1]);
      const lon = parseFloat(queryMatch[2]);
      if (this.validateCoordinates(lat, lon)) {
        return { coordinates: { lat, lon }, originalUrl: url, isShortened: shortened, parseMethod: 'query' };
      }
    }

    // Format: /data=...!3d{lat}!4d{lon} (most precise coordinates from place data)
    const dataMatch = url.match(/!3d([-\d.]+)!4d([-\d.]+)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lon = parseFloat(dataMatch[2]);
      if (this.validateCoordinates(lat, lon)) {
        return { coordinates: { lat, lon }, originalUrl: url, isShortened: shortened, parseMethod: 'place' };
      }
    }

    // Format: /@lat,lon,zoom or /@lat,lon
    const atMatch = url.match(/@([-\d.]+),([-\d.]+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lon = parseFloat(atMatch[2]);
      if (this.validateCoordinates(lat, lon)) {
        const method = url.includes('/place/') ? 'place' : 'at-sign';
        return { coordinates: { lat, lon }, originalUrl: url, isShortened: shortened, parseMethod: method as 'place' | 'at-sign' };
      }
    }

    return { coordinates: null, originalUrl: url, isShortened: shortened, parseMethod: 'none' };
  }

  /**
   * Wykonuje żądanie HTTP/HTTPS i podąża za przekierowaniami, zwracając finalny URL.
   */
  private followRedirects(url: string, maxRedirects: number = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        reject(new Error(`Zbyt wiele przekierowań (max: 5)`));
        return;
      }

      const client = url.startsWith('https') ? https : http;

      const req = client.get(url, { timeout: 10000 }, (res: IncomingMessage) => {
        const location = res.headers['location'];
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && location) {
          resolve(this.followRedirects(location, maxRedirects - 1));
        } else {
          resolve(url);
        }
        res.destroy();
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout przy rozwiązywaniu URL (10000ms)'));
      });
    });
  }

  /**
   * Rozwija skrócony link Google Maps poprzez backend HTTP redirect follow.
   * Zwraca ParsedGoogleMapsUrl z rozwiązanym URL i współrzędnymi.
   */
  async resolveShortUrl(shortUrl: string): Promise<ParsedGoogleMapsUrl> {
    try {
      const resolvedUrl = await this.followRedirects(shortUrl);
      serverLogger.info(`[GoogleMapsService] Resolved short URL: ${shortUrl} -> ${resolvedUrl}`);

      const parsed = this.parseUrlFull(resolvedUrl);
      return {
        ...parsed,
        originalUrl: shortUrl,
        resolvedUrl,
        isShortened: true,
        parseMethod: parsed.coordinates ? 'redirect' : 'none',
      };
    } catch (error) {
      serverLogger.warn(`[GoogleMapsService] Failed to resolve short URL: ${shortUrl}`, error);
      return {
        coordinates: null,
        originalUrl: shortUrl,
        isShortened: true,
        parseMethod: 'none',
      };
    }
  }

  /**
   * Parsuje dowolny URL (skrócony lub pełny). Dla skróconych wykonuje HTTP redirect follow.
   */
  async parseAnyUrl(url: string): Promise<ParsedGoogleMapsUrl> {
    if (this.isShortUrl(url)) {
      return this.resolveShortUrl(url);
    }
    return this.parseUrlFull(url);
  }

  /**
   * Generuje URL nawigacji w Google Maps (destination, opcjonalnie origin)
   */
  generateNavigationUrl(destination: GPSCoordinates, origin?: GPSCoordinates): string {
    const dest = `${destination.lat},${destination.lon}`;
    if (origin) {
      const orig = `${origin.lat},${origin.lon}`;
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  }

  /**
   * Generuje URL widoku mapy dla podanych współrzędnych
   */
  generateViewUrl(coordinates: GPSCoordinates, zoom: number = 15): string {
    return `https://www.google.com/maps/@${coordinates.lat},${coordinates.lon},${zoom}z`;
  }

  /**
   * Waliduje współrzędne GPS
   */
  validateCoordinates(lat: number, lon: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  /**
   * Formatuje współrzędne GPS do czytelnego ciągu znaków
   */
  formatCoordinates(coordinates: GPSCoordinates, precision: number = 7): string {
    return `${coordinates.lat.toFixed(precision)}, ${coordinates.lon.toFixed(precision)}`;
  }

  /**
   * Oblicza odległość między dwoma punktami GPS (algorytm Haversine) w kilometrach
   */
  calculateDistance(point1: GPSCoordinates, point2: GPSCoordinates): number {
    const R = 6371; // promień Ziemi w km
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(point2.lat - point1.lat);
    const dLon = toRad(point2.lon - point1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default new GoogleMapsService();
