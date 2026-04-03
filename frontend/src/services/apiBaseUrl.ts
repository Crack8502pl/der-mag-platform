// src/services/apiBaseUrl.ts
// Shared API base URL computation used by both the Axios client and connection probes

/**
 * Compute the API base URL for the current environment.
 * Extracted to a standalone module to avoid circular dependencies between
 * api.ts (which imports connectionMonitor) and connectionQualityMonitor.ts
 * (which needs the same URL).
 */
export const getApiBaseURL = (): string => {
  // 1. Build-time override via environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);

  // 2. Local network (e.g. 192.168.x.x)
  if (isLocalNetwork) {
    return `${protocol}//${hostname}:3000/api`;
  }

  // 3. localhost / 127.0.0.1
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3000/api`;
  }

  // 4. Production – same origin
  return `${window.location.origin}/api`;
};

export const API_BASE_URL = getApiBaseURL();
