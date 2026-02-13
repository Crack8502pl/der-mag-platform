import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const NetworkPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="network" emoji={MODULE_ICONS.network} size={36} />
        </div>
        <h1>Sieć/IP</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie adresacją IP - pule adresów, alokacja i macierze IP dla urządzeń.
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
            <li>Zarządzanie pulami adresów IP</li>
            <li>Alokacja adresów dla urządzeń</li>
            <li>Macierze adresacji IP</li>
            <li>Monitoring wykorzystania puli</li>
            <li>Export dokumentacji sieciowej</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
