// src/contexts/ThemeContext.tsx
// Theme management context for Grover (dark) and Husky (light) themes

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'grover' | 'husky' | 'auto';
export type EffectiveTheme = 'grover' | 'husky';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'grover',
  effectiveTheme: 'grover',
  setTheme: () => undefined
});

const STORAGE_KEY = 'der-mag-theme';

function getEffectiveTheme(theme: Theme): EffectiveTheme {
  if (theme === 'auto') {
    const hour = new Date().getHours();
    // 6:00 - 18:00 = husky (light), 18:00 - 6:00 = grover (dark)
    return hour >= 6 && hour < 18 ? 'husky' : 'grover';
  }
  return theme;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved && ['grover', 'husky', 'auto'].includes(saved) ? saved : 'grover';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    getEffectiveTheme(theme)
  );

  const applyTheme = useCallback((t: Theme) => {
    const effective = getEffectiveTheme(t);
    setEffectiveTheme(effective);
    document.documentElement.setAttribute('data-theme', effective);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // For auto mode: update every minute to catch hour boundary
  useEffect(() => {
    if (theme !== 'auto') return;
    const interval = setInterval(() => {
      applyTheme('auto');
    }, 60_000);
    return () => clearInterval(interval);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
