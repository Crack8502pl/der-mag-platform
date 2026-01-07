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
  
  // 2. Wykryj sieć lokalną (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const hostname = window.location.hostname;
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  
  // 3. Dla sieci lokalnej - zawsze dodaj port 3000
  if (isLocalNetwork) {
    return `http://${hostname}:3000/api`;
  }
  
  // 4. Dla localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const port = window.location.port || '3000';
    return `http://localhost:${port}/api`;
  }
  
  // 5. Fallback: użyj origin (dla production)
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseURL();

// 🆕 Debug info w konsoli
console.log('🌐 API Configuration:', {
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

// Response interceptor - handle token refresh
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

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Save new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
