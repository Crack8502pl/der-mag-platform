// src/hooks/usePermissionRefresh.ts
// Hook that connects to the backend SSE stream and refreshes user permissions
// when an admin changes the role's permissions.

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';

const getSSEUrl = (): string => {
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

export const usePermissionRefresh = () => {
  const { isAuthenticated, accessToken, setUser } = useAuthStore();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Close any existing connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    // EventSource doesn't support custom headers, so we pass the token as a
    // query parameter.  The backend authenticate middleware already reads from
    // the Authorization header, so we include a lightweight wrapper URL that
    // appends the token.
    const url = `${getSSEUrl()}?token=${encodeURIComponent(accessToken)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'permission-update') {
          // Re-fetch user info to get updated permissions
          try {
            const meResponse = await authService.me();
            setUser(meResponse.data);
          } catch {
            // Ignore refresh errors (e.g. token expired – user will be logged out by interceptor)
          }
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

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAuthenticated, accessToken, setUser]);
};
