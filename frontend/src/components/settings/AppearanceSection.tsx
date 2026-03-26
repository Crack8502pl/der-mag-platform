// src/components/settings/AppearanceSection.tsx
// Theme/appearance settings section

import React from 'react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';

const THEMES: { value: Theme; label: string; icon: string; desc: string }[] = [
  { value: 'grover', label: 'Grover', icon: '🔥', desc: 'Ciemny motyw z pomarańczowymi akcentami' },
  { value: 'husky', label: 'Husky', icon: '☀️', desc: 'Jasny motyw z niebieskimi akcentami' },
  { value: 'auto', label: 'Auto', icon: '🔄', desc: 'Grover w nocy (18:00–6:00), Husky w dzień (6:00–18:00)' }
];

export const AppearanceSection: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">🎨 Wygląd</h3>
      <p className="settings-section__desc">
        Wybierz motyw aplikacji. Aktualnie aktywny: <strong>{effectiveTheme === 'grover' ? '🔥 Grover (Dark)' : '☀️ Husky (Light)'}</strong>
      </p>

      <div className="theme-grid">
        {THEMES.map(t => (
          <button
            key={t.value}
            className={`theme-card${theme === t.value ? ' theme-card--active' : ''}`}
            onClick={() => setTheme(t.value)}
            type="button"
          >
            <span className="theme-card__icon">{t.icon}</span>
            <span className="theme-card__name">{t.label}</span>
            <span className="theme-card__desc">{t.desc}</span>
            {theme === t.value && <span className="theme-card__check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
