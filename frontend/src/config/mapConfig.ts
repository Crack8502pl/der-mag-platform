/**
 * Map Tiles Configuration
 * Centralna konfiguracja dla wszystkich komponentów mapowych
 */

// Sprawdź czy używamy proxy (dla produkcji)
const USE_TILE_PROXY = import.meta.env.VITE_USE_TILE_PROXY === 'true';

// Bazowy URL API
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Konfiguracja providerów kafelków
 */
export const TILE_PROVIDERS = {
  // Backend proxy z cache'em (zalecane dla produkcji)
  proxy: {
    url: `${API_BASE}/api/tiles/{z}/{x}/{y}.png`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },

  // Bezpośredni OSM (development/fallback)
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },

  // Carto Dark (darmowy, pasuje do dark theme)
  cartoDark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
  },
} as const;

/**
 * Pobierz aktualny provider kafelków
 */
export function getTileProvider() {
  if (USE_TILE_PROXY) {
    return TILE_PROVIDERS.proxy;
  }
  // Domyślnie używaj Carto Dark (pasuje do Grover dark theme, bez rate limiting)
  return TILE_PROVIDERS.cartoDark;
}

/**
 * Domyślne ustawienia mapy
 */
export const DEFAULT_MAP_CONFIG = {
  center: [52.2297, 21.0122] as [number, number], // Warszawa
  zoom: 6,
  minZoom: 4,
  maxZoom: 18,
};
