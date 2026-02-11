// src/services/auth.service.ts
// Authentication service

import api from './api';
import type {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  MeResponse,
  RefreshResponse,
} from '../types/auth.types';
import { useAuthStore } from '../stores/authStore';

// Singleton promise for refresh to prevent concurrent requests
let refreshPromise: Promise<RefreshResponse> | null = null;

class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  }

  /**
   * Change password (for force password change)
   */
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await api.post<ChangePasswordResponse>('/auth/change-password', data);
    return response.data;
  }

  /**
   * Get current user info
   */
  async me(): Promise<MeResponse> {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear access token from Zustand store
      useAuthStore.getState().setAccessToken(null);
      useAuthStore.getState().logout();
    }
  }

  /**
   * Save access token to Zustand store (refresh token is in httpOnly cookie)
   */
  saveTokens(accessToken: string): void {
    useAuthStore.getState().setAccessToken(accessToken);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!useAuthStore.getState().accessToken;
  }

  /**
   * Get access token from Zustand store
   */
  getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  /**
   * Refresh access token using httpOnly cookie
   */
  async refresh(): Promise<RefreshResponse> {
    // If a refresh is already in progress, reuse it
    if (refreshPromise) {
      console.log('[AUTH] Reusing existing refresh promise');
      return refreshPromise;
    }

    // Create new refresh promise
    refreshPromise = (async () => {
      try {
        // Get CSRF token from cookie
        const csrfToken = this.getCsrfTokenFromCookie();
        
        // If no CSRF token, session cookies were cleared (e.g., after logout)
        if (!csrfToken) {
          throw new Error('No CSRF token available - session expired or logged out');
        }
        
        const response = await api.post('/auth/refresh', {}, {
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });
        return response.data;
      } finally {
        // Clear the promise after completion (success or failure)
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  /**
   * Get CSRF token from cookie
   */
  getCsrfTokenFromCookie(): string | null {
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Fetch CSRF token from server (for SPA bootstrap)
   */
  async fetchCsrfToken(): Promise<void> {
    try {
      await api.get('/auth/csrf-token');
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }
}

export default new AuthService();
