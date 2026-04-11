import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const ContractsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="contracts" emoji={MODULE_ICONS.contracts} size={36} />
        </div>
        <h1>Kontrakty</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie kontraktami - tworzenie, edycja i monitoring realizacji kontraktów.
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
            <li>Lista kontraktów z filtrowaniem</li>
            <li>Tworzenie i edycja kontraktów</li>
            <li>Import kontraktów z zewnętrznych systemów</li>
            <li>Monitoring statusu realizacji</li>
            <li>Generowanie raportów kontraktowych</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
