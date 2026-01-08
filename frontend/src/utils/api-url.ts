// src/utils/api-url.ts
// Wspólna funkcja pomocnicza dla dynamicznego wykrywania URL API

/**
 * Inteligentnie określa bazowy URL API na podstawie środowiska i bieżącej lokalizacji.
 * 
 * Priorytet:
 * 1. Zmienna środowiskowa VITE_API_URL (build time)
 * 2. Dynamiczne wykrywanie protokołu z window.location
 * 3. Fallback do origin/api dla środowiska produkcyjnego
 * 
 * @returns {string} Pełny bazowy URL API (np. "https://localhost:3000/api")
 */
export const getApiBaseURL = (): string => {
  // 1. Priorytet: zmienna środowiskowa (build time)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Wykryj protokół (HTTPS lub HTTP)
  const protocol = window.location.protocol; // 'https:' lub 'http:'
  const hostname = window.location.hostname;
  
  // 3. Dla localhost lub 127.0.0.1 - użyj tego samego protokołu co frontend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3000/api`;
  }
  
  // 4. Dla sieci lokalnej (192.168.x.x, 10.x.x.x, etc.)
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  if (isLocalNetwork) {
    return `${protocol}//${hostname}:3000/api`;
  }
  
  // 5. Fallback: użyj origin (dla production gdy frontend serwowany z backendu)
  return `${window.location.origin}/api`;
};
