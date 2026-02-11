// src/services/api.ts
// Axios instance with interceptors

import axios, { type AxiosError, type AxiosResponse } from 'axios';
import type { AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';

// Inteligentne wykrywanie API URL dla różnych środowisk
const getApiBaseURL = (): string => {
  // 1. Priorytet: zmienna środowiskowa (build time)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // 2. Wykryj protokół (HTTPS lub HTTP)
  const protocol = window.location.protocol; // 'https:' lub 'http:'
  const hostname = window.location.hostname;
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  
  // 3. Dla sieci lokalnej - użyj tego samego protokołu co frontend
  if (isLocalNetwork) {
    return `${protocol}//${hostname}:3000/api`;
  }
  
  // 4. Dla localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3000/api`;
  }
  
  // 5. Fallback: użyj origin (dla production)
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseURL();

// 🆕 Debug info w konsoli
console.log('🌐 API Configuration:', {
  protocol: window.location.protocol,
  hostname: window.location.hostname,
  origin: window.location.origin,
  calculatedApiUrl: API_BASE_URL,
  env: import.meta.env.VITE_API_BASE_URL || 'not set'
});

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 🆕 15s timeout dla slow mobile networks
  withCredentials: true, // 🆕 Enable cookies for CSRF and refresh token
});

// ====== CLOCK SKEW COMPENSATION ======
// Track difference between server time and client time
let serverTimeOffset = 0;
let lastServerTimeUpdate = 0;
const SERVER_TIME_UPDATE_INTERVAL = 30000; // Update every 30s
export const CLOCK_SKEW_WARNING_THRESHOLD = 30000; // 30 seconds - show warning if skew exceeds this

/**
 * Calculate offset from server response Date header
 */
const calculateServerTimeOffset = (response: AxiosResponse) => {
  const now = Date.now();
  
  // Don't update too frequently
  if (now - lastServerTimeUpdate < SERVER_TIME_UPDATE_INTERVAL) {
    return;
  }
  
  const dateHeader = response.headers['date'];
  if (dateHeader) {
    const serverTime = new Date(dateHeader).getTime();
    const newOffset = serverTime - now;
    
    // Only update if significantly different (> 1 second)
    if (Math.abs(newOffset - serverTimeOffset) > 1000) {
      serverTimeOffset = newOffset;
      lastServerTimeUpdate = now;
      
      // Log if significant difference (> 30 seconds)
      if (Math.abs(serverTimeOffset) > CLOCK_SKEW_WARNING_THRESHOLD) {
        console.warn(`⚠️ Clock skew detected: ${Math.round(serverTimeOffset / 1000)}s difference with server`);
      }
    }
  }
};

/**
 * Get current time corrected for server clock skew
 */
export const getCorrectedTime = (): number => {
  return Date.now() + serverTimeOffset;
};

/**
 * Get current server time offset in milliseconds
 */
export const getServerTimeOffset = (): number => serverTimeOffset;

// ====== AUTH/ME THROTTLING ======
// Prevent rapid /auth/me requests
let lastAuthMeRequest = 0;
const AUTH_ME_MIN_INTERVAL = 5000; // Minimum 5s between /auth/me requests

// Request interceptor - add access token
api.interceptors.request.use(
  (config) => {
    // Throttle /auth/me requests to prevent flooding
    if (config.url && (config.url.endsWith('/auth/me') || config.url.includes('/auth/me?'))) {
      const now = Date.now();
      if (now - lastAuthMeRequest < AUTH_ME_MIN_INTERVAL) {
        console.warn('⏸️ Throttling /auth/me - too frequent');
        return Promise.reject({ 
          __THROTTLED__: true, 
          message: 'Request throttled - too frequent' 
        });
      }
      lastAuthMeRequest = now;
    }
    
    // Get access token from Zustand store instead of localStorage
    const accessToken = useAuthStore.getState().accessToken;
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Stan rate limitingu (singleton)
let isRateLimited = false;
let rateLimitResetTime = 0;

// Refresh token mutex - prevents concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

// Response interceptor - handle token refresh AND rate limiting
api.interceptors.response.use(
  (response) => {
    // Track server time for clock skew compensation
    calculateServerTimeOffset(response);
    return response;
  },
  async (error: AxiosError) => {
    // Handle throttled requests gracefully
    if ((error as any).__THROTTLED__) {
      return Promise.reject(error);
    }
    
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    });
    
    const originalRequest = error.config as any;

    // 🆕 OBSŁUGA 429 - Rate Limit Exceeded
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // domyślnie 60s
      
      console.warn(`⚠️ Rate limit exceeded. Retry after ${retryMs / 1000}s`);
      
      // Ustaw flagę rate limiting
      isRateLimited = true;
      rateLimitResetTime = Date.now() + retryMs;
      
      // Emituj event dla UI (opcjonalnie pokaż komunikat użytkownikowi)
      window.dispatchEvent(new CustomEvent('rateLimitExceeded', { 
        detail: { retryAfter: retryMs } 
      }));
      
      // Jeśli to nie jest retry i mamy retry count < 3
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }
      
      if (originalRequest._retryCount < 2) {
        originalRequest._retryCount++;
        
        // Exponential backoff: 5s, 15s, 45s
        const backoffDelay = Math.min(5000 * Math.pow(3, originalRequest._retryCount - 1), 45000);
        
        console.log(`🔄 Retry ${originalRequest._retryCount}/2 after ${backoffDelay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        // Sprawdź czy rate limit się zresetował
        if (Date.now() >= rateLimitResetTime) {
          isRateLimited = false;
        }
        
        return api(originalRequest);
      }
      
      // Po 2 próbach - zwróć błąd, nie wylogowuj
      console.error('❌ Rate limit: max retries exceeded');
      return Promise.reject(error);
    }

    // Obsługa 401 - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failing request is itself an auth endpoint
      const authEndpoints = ['/api/auth/refresh', '/api/auth/login', '/api/auth/logout'];
      const requestPath = originalRequest.url?.split('?')[0] || ''; // Remove query params
      if (authEndpoints.some(ep => requestPath.endsWith(ep) || requestPath === ep)) {
        return Promise.reject(error);
      }
      
      // Nie próbuj refresh jeśli rate limited
      if (isRateLimited && Date.now() < rateLimitResetTime) {
        console.warn('⚠️ Skipping token refresh - rate limited');
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        // Use singleton refresh promise to prevent concurrent refresh calls
        if (!refreshPromise) {
          console.log('🔄 Starting token refresh (singleton)');
          refreshPromise = (async () => {
            try {
              // Get CSRF token from cookie
              const csrfTokenMatch = document.cookie.match(/csrf-token=([^;]+)/);
              const csrfToken = csrfTokenMatch ? csrfTokenMatch[1] : null;

              if (!csrfToken) {
                throw new Error('No CSRF token');
              }

              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
                withCredentials: true,
                headers: {
                  'X-CSRF-Token': csrfToken
                }
              });

              const { accessToken } = response.data.data;

              // Store new access token in Zustand
              useAuthStore.getState().setAccessToken(accessToken);
              
              console.log('✅ Token refresh completed successfully');
              return accessToken;
            } catch (refreshError: any) {
              console.error('❌ Token refresh failed:', refreshError);
              
              // Jeśli refresh failed z powodu 429 - nie wylogowuj od razu
              if (refreshError.response?.status === 429) {
                console.warn('⚠️ Token refresh rate limited - keeping session');
                throw refreshError;
              }
              
              // Inne błędy - wyloguj
              useAuthStore.getState().setAccessToken(null);
              useAuthStore.getState().logout();
              window.location.href = '/login';
              throw refreshError;
            } finally {
              // Clear the promise so next refresh cycle can start
              refreshPromise = null;
            }
          })();
        } else {
          console.log('⏳ Refresh already in progress, waiting for existing promise...');
        }

        // Wait for the refresh to complete
        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Eksportuj funkcję pomocniczą do sprawdzenia stanu rate limit
export const isApiRateLimited = (): boolean => {
  if (isRateLimited && Date.now() >= rateLimitResetTime) {
    isRateLimited = false;
  }
  return isRateLimited;
};

export const getRateLimitResetTime = (): number => rateLimitResetTime;

// Export function to check if refresh is in progress
export const isRefreshInProgress = (): boolean => refreshPromise !== null;

export default api;
