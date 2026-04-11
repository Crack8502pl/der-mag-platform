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
        <h1>Urządzenia</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Rejestracja i zarządzanie urządzeniami - numery seryjne, konfiguracja i lokalizacja.
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
            <li>Rejestr urządzeń</li>
            <li>Zarządzanie numerami seryjnymi</li>
            <li>Konfiguracja i parametry</li>
            <li>Lokalizacja urządzeń</li>
            <li>Historia serwisowa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
