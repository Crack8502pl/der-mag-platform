import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const SettingsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="settings" emoji={MODULE_ICONS.settings} size={36} />
        </div>
        <h1>Ustawienia</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Ustawienia konta - profil użytkownika, preferencje i bezpieczeństwo.
        </p>
        
        <div className="module-status">
          <span className="status-badge status-development">🚧 Moduł w budowie</span>
          <p className="status-text">
            Ten moduł jest obecnie w fazie rozwoju. Funkcjonalność będzie dostępna wkrótce.
          </p>
        </div>
        
        <div className="module-features">
          <h3>Planowane funkcje:</h3>
          <ul>
            <li>Profil użytkownika</li>
            <li>Zmiana hasła</li>
            <li>Preferencje wyświetlania</li>
            <li>Ustawienia powiadomień</li>
            <li>Bezpieczeństwo konta</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
