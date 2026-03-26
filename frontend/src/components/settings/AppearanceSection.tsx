// src/components/settings/AppearanceSection.tsx
// Theme/appearance settings section

import React from 'react';
import { useTheme, type Theme } from '../../contexts/ThemeContext';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
  iconType: 'emoji' | 'image';
  desc: string;
}

const THEMES: ThemeOption[] = [
  { value: 'grover', label: 'Grover', icon: '/Dark.png', iconType: 'image', desc: 'Ciemny motyw z pomarańczowymi akcentami' },
  { value: 'husky', label: 'Husky', icon: '/Light.png', iconType: 'image', desc: 'Jasny motyw z niebieskimi akcentami' },
  { value: 'auto', label: 'Auto', icon: '🔄', iconType: 'emoji', desc: 'Grover w nocy (18:00–6:00), Husky w dzień (6:00–18:00)' }
];

const cardIconStyle: React.CSSProperties = { width: '24px', height: '24px', objectFit: 'contain' };
const descIconStyle: React.CSSProperties = { width: '16px', height: '16px', objectFit: 'contain', verticalAlign: 'middle' };

export const AppearanceSection: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const activeTheme = THEMES.find(t => t.value === effectiveTheme) ?? THEMES[0];

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">🎨 Wygląd</h3>
      <p className="settings-section__desc">
        Wybierz motyw aplikacji. Aktualnie aktywny:{' '}
        <strong>
          {activeTheme.iconType === 'image' ? (
            <><img src={activeTheme.icon} alt={activeTheme.label} style={descIconStyle} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />{' '}</>
          ) : (
            <>{activeTheme.icon}{' '}</>
          )}
          {activeTheme.label}{effectiveTheme === 'grover' ? ' (Dark)' : ' (Light)'}
        </strong>
      </p>

      <div className="theme-grid">
        {THEMES.map(t => (
          <button
            key={t.value}
            className={`theme-card${theme === t.value ? ' theme-card--active' : ''}`}
            onClick={() => setTheme(t.value)}
            type="button"
          >
            <span className="theme-card__icon">
              {t.iconType === 'image' ? (
                <img src={t.icon} alt={t.label} style={cardIconStyle} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                t.icon
              )}
            </span>
            <span className="theme-card__name">{t.label}</span>
            <span className="theme-card__desc">{t.desc}</span>
            {theme === t.value && <span className="theme-card__check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
