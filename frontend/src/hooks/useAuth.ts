// src/hooks/useAuth.ts
// Hook for authentication

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';

// Module-level promise to ensure only one initialization runs at a time
let initPromise: Promise<void> | null = null;

export const useAuth = () => {
  const { user, isAuthenticated, requirePasswordChange, setUser, setRequirePasswordChange, logout: storeLogout } = useAuthStore();

  // Initialize user from token on mount or try silent refresh
  useEffect(() => {
    const initializeAuth = async () => {
      // If initialization is already in progress, wait for it
      if (initPromise) {
        await initPromise.catch(() => {});
        return;
      }

      // Check if another hook already initialized the state
      const state = useAuthStore.getState();
      if (state.accessToken || state.user) {
        return;
      }

      // Start initialization
      initPromise = (async () => {
        try {
          // If we have an access token in Zustand, fetch user info
          const currentState = useAuthStore.getState();
          if (currentState.accessToken && !currentState.user) {
            try {
              const response = await authService.me();
              setUser(response.data);
            } catch (error: unknown) {
              // Skip logging for throttled requests (not real errors)
              const isThrottled = typeof error === 'object' && error !== null && '__THROTTLED__' in error;
              if (!isThrottled) {
                console.error('Failed to fetch user:', error);
              }
              storeLogout();
            }
          } 
          // If no access token but might have httpOnly cookie, try silent refresh
          else if (!currentState.accessToken && !currentState.user) {
            // Skip silent refresh on auth pages (login, forgot-password) - no session expected
            const authPages = ['/login', '/forgot-password', '/change-password'];
            if (authPages.some(page => window.location.pathname.startsWith(page))) {
              return;
            }
            
            // Skip if no csrf-token cookie (session was cleared by logout)
            const hasCsrfToken = document.cookie.includes('csrf-token=');
            if (!hasCsrfToken) {
              return;
            }
            
            try {
              const response = await authService.refresh();
              authService.saveTokens(response.data.accessToken);
              
              // Fetch user info after successful refresh
              const meResponse = await authService.me();
              setUser(meResponse.data);
            } catch {
              // Silent refresh failed - user needs to login (expected on login page)
            }
          }
        } finally {
          initPromise = null;
        }
      })();

      await initPromise;
    };

    initializeAuth();
  }, [setUser, storeLogout]);

  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    
    // Save access token to Zustand (refresh token is in httpOnly cookie)
    authService.saveTokens(response.data.accessToken);
    
    // Fetch full user data including permissions
    const meResponse = await authService.me();
    setUser(meResponse.data);
    
    // Set password change requirement
    setRequirePasswordChange(response.data.requirePasswordChange);
    
    return response;
  };

  const changePassword = async (newPassword: string, confirmPassword: string) => {
    const response = await authService.changePassword({ newPassword, confirmPassword });
    
    // After password change, update user data
    const meResponse = await authService.me();
    setUser(meResponse.data);
    setRequirePasswordChange(false);
    
    return response;
  };

  const logout = async () => {
    await authService.logout();
    storeLogout();
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!user || !user.permissions) return false;
    
    const permissions = user.permissions;
    
    // Admin has all permissions
    if (permissions.all === true) return true;
    
    // Check specific module permission
    const modulePerms = permissions[module];
    if (!modulePerms) return false;
    
    return modulePerms[action] === true;
  };

  return {
    user,
    isAuthenticated,
    requirePasswordChange,
    login,
    changePassword,
    logout,
    hasPermission,
  };
};
