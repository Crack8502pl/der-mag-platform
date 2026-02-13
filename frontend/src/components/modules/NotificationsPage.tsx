import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="notifications" emoji={MODULE_ICONS.notifications} size={36} />
        </div>
        <h1>Powiadomienia</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Konfiguracja powiadomień - alerty, triggery i kanały komunikacji.
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
            <li>Konfiguracja alertów</li>
            <li>Triggery automatyczne</li>
            <li>Powiadomienia email/SMS</li>
            <li>Historia powiadomień</li>
            <li>Personalizacja ustawień</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
