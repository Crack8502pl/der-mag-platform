// src/components/common/ThemeSwitcher.tsx
// Dropdown for selecting the application theme

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import './ThemeSwitcher.css';

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'grover', label: 'Grover (Dark)', icon: '🔥' },
  { value: 'husky', label: 'Husky (Light)', icon: '☀️' },
  { value: 'auto', label: 'Auto', icon: '🔄' }
];

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  const current = THEME_OPTIONS.find(o => o.value === theme) ?? THEME_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus first option when dropdown opens
  useEffect(() => {
    if (open) {
      firstOptionRef.current?.focus();
    }
  }, [open]);

  const handleSelect = useCallback((value: Theme) => {
    setTheme(value);
    setOpen(false);
  }, [setTheme]);

  const handleToggleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number, value: Theme) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(value);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = containerRef.current?.querySelectorAll<HTMLButtonElement>('.theme-switcher__option');
      next?.[index + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = containerRef.current?.querySelectorAll<HTMLButtonElement>('.theme-switcher__option');
      if (index === 0) {
        containerRef.current?.querySelector<HTMLButtonElement>('.theme-switcher__toggle')?.focus();
      } else {
        items?.[index - 1]?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      firstOptionRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const items = containerRef.current?.querySelectorAll<HTMLButtonElement>('.theme-switcher__option');
      items?.[items.length - 1]?.focus();
    }
  };

  return (
    <div className="theme-switcher" ref={containerRef}>
      <button
        className="theme-switcher__toggle"
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={handleToggleKeyDown}
        title="Zmień motyw"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{current.icon}</span>
        <span className="theme-switcher__label">{current.label}</span>
        <span className="theme-switcher__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="theme-switcher__dropdown" role="menu">
          {THEME_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              ref={index === 0 ? firstOptionRef : undefined}
              className={`theme-switcher__option${theme === option.value ? ' theme-switcher__option--active' : ''}`}
              role="menuitemradio"
              aria-checked={theme === option.value}
              onClick={() => handleSelect(option.value)}
              onKeyDown={e => handleOptionKeyDown(e, index, option.value)}
              type="button"
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
