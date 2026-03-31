// src/hooks/usePermissionRefresh.ts
// Hook that connects to the backend SSE stream and refreshes user permissions
// when an admin changes the role's permissions.
// Uses a short-lived one-time SSE token (instead of the long-lived access token)
// to avoid leaking credentials in URLs/logs/browser history.

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';
import api from '../services/api';

const getSSEBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}/permissions/events`;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
  if (isLocalNetwork) {
    return `${protocol}//${hostname}:3000/api/permissions/events`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3000/api/permissions/events`;
  }
  return `${window.location.origin}/api/permissions/events`;
};

/** Fetch a short-lived one-time SSE token from the backend. */
async function fetchSseToken(): Promise<string | null> {
  try {
    const response = await api.post<{ success: boolean; data: { sseToken: string } }>(
      '/permissions/sse-token'
    );
    return response.data.data.sseToken;
  } catch {
    return null;
  }
}

export const usePermissionRefresh = () => {
  const { isAuthenticated, setUser } = useAuthStore();
  const esRef = useRef<EventSource | null>(null);
  // Debounce timer for coalescing multiple rapid permission-update events
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Refresh user permissions, coalescing multiple quick events into one call. */
  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      try {
        const meResponse = await authService.me();
        setUser(meResponse.data);
      } catch (err: unknown) {
        // Ignore throttled requests and normal auth errors
        const isThrottled =
          typeof err === 'object' && err !== null && '__THROTTLED__' in err;
        if (!isThrottled && import.meta.env.DEV) {
          console.debug('[usePermissionRefresh] Failed to refresh permissions:', err);
        }
      }
    }, 500); // 500 ms debounce – well above the AUTH_ME_MIN_INTERVAL (5 s) to avoid back-to-back throttled rejections
  }, [setUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let es: EventSource | null = null;

    const connect = async () => {
      // Get a short-lived one-time token to avoid putting the access token in the URL
      const sseToken = await fetchSseToken();
      if (cancelled || !sseToken) return;

      const url = `${getSSEBaseUrl()}?sseToken=${encodeURIComponent(sseToken)}`;
      es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'permission-update') {
            scheduleRefresh();
          } else if (data.type === 'unauthorized') {
            // Server rejected the token – stop reconnecting
            es?.close();
            esRef.current = null;
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        // EventSource automatically reconnects on error.
        // Log in dev mode for easier debugging.
        if (import.meta.env.DEV) {
          console.debug('[usePermissionRefresh] SSE connection error – will auto-reconnect');
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      es?.close();
      esRef.current = null;
    };
  }, [isAuthenticated, scheduleRefresh]);
};
