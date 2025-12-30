// src/stores/authStore.ts
// Zustand store for authentication state

import { create } from 'zustand';
import type { User } from '../types/auth.types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  requirePasswordChange: boolean;
  setUser: (user: User | null) => void;
  setRequirePasswordChange: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  requirePasswordChange: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setRequirePasswordChange: (value) => set({ requirePasswordChange: value }),
  logout: () => set({ user: null, isAuthenticated: false, requirePasswordChange: false }),
}));
