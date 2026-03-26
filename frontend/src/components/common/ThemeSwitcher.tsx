// src/components/common/ThemeSwitcher.tsx
// Dropdown for selecting the application theme

import React, { useState, useRef, useEffect } from 'react';
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

  const handleSelect = (value: Theme) => {
    setTheme(value);
    setOpen(false);
  };

  return (
    <div className="theme-switcher" ref={containerRef}>
      <button
        className="theme-switcher__toggle"
        onClick={() => setOpen(prev => !prev)}
        title="Zmień motyw"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.icon}</span>
        <span className="theme-switcher__label">{current.label}</span>
        <span className="theme-switcher__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="theme-switcher__dropdown" role="listbox">
          {THEME_OPTIONS.map(option => (
            <li
              key={option.value}
              className={`theme-switcher__option${theme === option.value ? ' theme-switcher__option--active' : ''}`}
              role="option"
              aria-selected={theme === option.value}
              onClick={() => handleSelect(option.value)}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
