// src/services/api.ts
// Axios instance with interceptors

import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

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
});

// Request interceptor - add access token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
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

// Response interceptor - handle token refresh AND rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
      // Nie próbuj refresh jeśli rate limited
      if (isRateLimited && Date.now() < rateLimitResetTime) {
        console.warn('⚠️ Skipping token refresh - rate limited');
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Jeśli refresh failed z powodu 429 - nie wylogowuj od razu
        if (refreshError.response?.status === 429) {
          console.warn('⚠️ Token refresh rate limited - keeping session');
          return Promise.reject(refreshError);
        }
        
        // Inne błędy - wyloguj
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
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

export default api;
