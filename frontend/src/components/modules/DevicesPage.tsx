import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const DevicesPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="devices" emoji={MODULE_ICONS.devices} size={36} />
        </div>
        <div>
          <h1>Urządzenia</h1>
          <p className="page-subtitle">🚧 Rejestracja i zarządzanie urządzeniami w jednym miejscu</p>
        </div>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Rejestracja i zarządzanie urządzeniami – numery seryjne, konfiguracja i lokalizacja.
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
            <li>Rejestr urządzeń (numer seryjny, model, producent)</li>
            <li>Zarządzanie numerami seryjnymi z walidacją</li>
            <li>Konfiguracja i parametry techniczne urządzenia</li>
            <li>Lokalizacja urządzeń na mapie (GPS/adres)</li>
            <li>Historia serwisowa i zdarzenia</li>
            <li>Przypisanie urządzenia do obiektu/kontraktu</li>
            <li>Import/export rejestru CSV</li>
          </ul>
        </div>

        <div className="module-cta">
          <p>💡 Masz sugestię dotyczącą tego modułu? Skontaktuj się z administratorem systemu i zgłoś propozycję funkcji.</p>
        </div>
      </div>
    </div>
  );
};
