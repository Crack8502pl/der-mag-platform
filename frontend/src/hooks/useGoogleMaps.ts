// src/hooks/useGoogleMaps.ts
// Hook do obsługi Google Maps i współrzędnych GPS

import { useState, useCallback } from 'react';
import { api } from '../services/api';

export interface GPSCoordinates {
  lat: number;
  lon: number;
}

export interface ParsedUrlResult {
  coordinates: GPSCoordinates | null;
  originalUrl: string;
  resolvedUrl?: string;
  isShortened: boolean;
  navigationUrl: string | null;
}

export const useGoogleMaps = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parsuje URL Google Maps przez backend (obsługuje skrócone linki)
   */
  const parseUrl = useCallback(async (url: string): Promise<ParsedUrlResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ success: boolean; data: ParsedUrlResult }>('/maps/parse-url', { url });
      if (response.data.success) {
        return response.data.data;
      }
      setError('Nie udało się sparsować URL');
      return null;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Błąd podczas parsowania URL Google Maps';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Parsuje URL lokalnie (tylko dla pełnych linków, bez rozwijania)
   */
  const parseUrlLocal = useCallback((url: string): GPSCoordinates | null => {
    // Format: ?q=LAT,LON
    const qMatch = url.match(/[?&]q=([-0-9.]+),([-0-9.]+)/);
    if (qMatch) {
      const lat = parseFloat(qMatch[1]);
      const lon = parseFloat(qMatch[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }

    // Format: /@LAT,LON
    const atMatch = url.match(/\/@([-0-9.]+),([-0-9.]+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lon = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }

    // Format: plain coordinates "LAT, LON"
    const coordMatch = url.trim().match(/^([-0-9.]+)\s*,\s*([-0-9.]+)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }

    return null;
  }, []);

  /**
   * Sprawdza czy URL wymaga rozwinięcia przez backend
   */
  const isShortUrl = useCallback((url: string): boolean => {
    return (
      url.includes('goo.gl/maps') ||
      url.includes('maps.app.goo.gl') ||
      url.includes('g.co/maps')
    );
  }, []);

  /**
   * Generuje URL do nawigacji
   */
  const generateNavigationUrl = useCallback(
    (destination: GPSCoordinates, origin?: GPSCoordinates): string => {
      let url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lon}`;
      if (origin) {
        url += `&origin=${origin.lat},${origin.lon}`;
      }
      return url;
    },
    []
  );

  /**
   * Otwiera nawigację Google Maps w nowym oknie
   */
  const openNavigation = useCallback((destination: GPSCoordinates, origin?: GPSCoordinates) => {
    const url = generateNavigationUrl(destination, origin);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [generateNavigationUrl]);

  /**
   * Otwiera lokalizację w Google Maps
   */
  const openLocation = useCallback((coordinates: GPSCoordinates, zoom = 17) => {
    const url = `https://www.google.com/maps/@${coordinates.lat},${coordinates.lon},${zoom}z`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  /**
   * Formatuje współrzędne do wyświetlenia
   */
  const formatCoordinates = useCallback(
    (coordinates: GPSCoordinates, precision = 6): string => {
      if (!coordinates || coordinates.lat == null || coordinates.lon == null) {
        return 'Brak współrzędnych';
      }

      // PostgreSQL DECIMAL columns may be returned as strings by TypeORM
      const lat = Number(coordinates.lat);
      const lon = Number(coordinates.lon);

      if (isNaN(lat) || isNaN(lon)) {
        return 'Nieprawidłowe współrzędne';
      }

      return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
    },
    []
  );

  /**
   * Waliduje współrzędne
   */
  const validateCoordinates = useCallback((lat: number, lon: number): boolean => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }, []);

  return {
    loading,
    error,
    parseUrl,
    parseUrlLocal,
    isShortUrl,
    openNavigation,
    openLocation,
    generateNavigationUrl,
    formatCoordinates,
    validateCoordinates,
  };
};
