// src/controllers/GoogleMapsController.ts
// Kontroler do obsługi Google Maps API

import { Request, Response } from 'express';
import googleMapsService from '../services/GoogleMapsService';
import { GPSCoordinates } from '../services/GoogleMapsService';

export class GoogleMapsController {
  /**
   * POST /api/maps/parse-url
   * Parsuje URL Google Maps i zwraca współrzędne GPS
   */
  static async parseUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body as { url?: string };

      if (!url || typeof url !== 'string') {
        res.status(400).json({ success: false, message: 'Pole "url" jest wymagane' });
        return;
      }

      if (url.length > 500) {
        res.status(400).json({ success: false, message: 'URL jest zbyt długi (max 500 znaków)' });
        return;
      }

      const result = await googleMapsService.parseAnyUrl(url);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd podczas parsowania URL' });
    }
  }

  /**
   * POST /api/maps/generate-navigation
   * Generuje URL nawigacji w Google Maps
   */
  static generateNavigation(req: Request, res: Response): void {
    try {
      const { destination, origin } = req.body as {
        destination?: GPSCoordinates;
        origin?: GPSCoordinates;
      };

      if (!destination || typeof destination.lat !== 'number' || typeof destination.lon !== 'number') {
        res.status(400).json({ success: false, message: 'Pole "destination" z właściwościami lat i lon jest wymagane' });
        return;
      }

      if (!googleMapsService.validateCoordinates(destination.lat, destination.lon)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe współrzędne destination' });
        return;
      }

      if (origin) {
        if (typeof origin.lat !== 'number' || typeof origin.lon !== 'number') {
          res.status(400).json({ success: false, message: 'Pole "origin" musi zawierać właściwości lat i lon' });
          return;
        }
        if (!googleMapsService.validateCoordinates(origin.lat, origin.lon)) {
          res.status(400).json({ success: false, message: 'Nieprawidłowe współrzędne origin' });
          return;
        }
      }

      const navigationUrl = googleMapsService.generateNavigationUrl(destination, origin);
      const viewUrl = googleMapsService.generateViewUrl(destination);

      res.json({
        success: true,
        data: {
          navigationUrl,
          viewUrl,
          destination,
          origin: origin || null,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd podczas generowania URL nawigacji' });
    }
  }

  /**
   * POST /api/maps/calculate-distance
   * Oblicza odległość między dwoma punktami GPS
   */
  static calculateDistance(req: Request, res: Response): void {
    try {
      const { point1, point2 } = req.body as {
        point1?: GPSCoordinates;
        point2?: GPSCoordinates;
      };

      if (!point1 || typeof point1.lat !== 'number' || typeof point1.lon !== 'number') {
        res.status(400).json({ success: false, message: 'Pole "point1" z właściwościami lat i lon jest wymagane' });
        return;
      }

      if (!point2 || typeof point2.lat !== 'number' || typeof point2.lon !== 'number') {
        res.status(400).json({ success: false, message: 'Pole "point2" z właściwościami lat i lon jest wymagane' });
        return;
      }

      if (!googleMapsService.validateCoordinates(point1.lat, point1.lon)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe współrzędne point1' });
        return;
      }

      if (!googleMapsService.validateCoordinates(point2.lat, point2.lon)) {
        res.status(400).json({ success: false, message: 'Nieprawidłowe współrzędne point2' });
        return;
      }

      const distanceKm = googleMapsService.calculateDistance(point1, point2);

      res.json({
        success: true,
        data: {
          distanceKm: Math.round(distanceKm * 1000) / 1000,
          distanceM: Math.round(distanceKm * 1000),
          point1,
          point2,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Błąd podczas obliczania odległości' });
    }
  }
}
