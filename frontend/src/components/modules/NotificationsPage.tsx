import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="notifications" emoji={MODULE_ICONS.notifications} size={36} />
        </div>
        <div>
          <h1>Powiadomienia</h1>
          <p className="page-subtitle">🚧 Alerty, triggery i kanały komunikacji dla użytkowników</p>
        </div>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Konfiguracja powiadomień – alerty, triggery i kanały komunikacji.
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
            <li>Konfiguracja alertów dla zdarzeń systemowych</li>
            <li>Triggery automatyczne (np. deadline, zmiana statusu)</li>
            <li>Kanały: Email / SMS / Slack</li>
            <li>Historia wysłanych powiadomień</li>
            <li>Personalizacja ustawień per użytkownik</li>
            <li>Subskrypcje modułowe</li>
            <li>Podgląd szablonów email</li>
          </ul>
        </div>

        <div className="module-cta">
          <p>💡 Masz sugestię dotyczącą tego modułu? Skontaktuj się z administratorem systemu i zgłoś propozycję funkcji.</p>
        </div>
      </div>
    </div>
  );
};
