// src/hooks/useAuth.ts
// Hook for authentication

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';

export const useAuth = () => {
  const { user, isAuthenticated, requirePasswordChange, setUser, setRequirePasswordChange, logout: storeLogout } = useAuthStore();

  // Initialize user from token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (authService.isAuthenticated() && !user) {
        try {
          const response = await authService.me();
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          storeLogout();
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    
    // Save tokens
    authService.saveTokens(response.data.accessToken, response.data.refreshToken);
    
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

  return {
    user,
    isAuthenticated,
    requirePasswordChange,
    login,
    changePassword,
    logout,
  };
};
