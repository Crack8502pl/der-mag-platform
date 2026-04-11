import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const DocumentsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="documents" emoji={MODULE_ICONS.documents} size={36} />
        </div>
        <h1>Dokumenty</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie dokumentami - szablony, generowanie i archiwizacja dokumentów.
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
            <li>Biblioteka szablonów dokumentów</li>
            <li>Generowanie dokumentów z danymi</li>
            <li>Wersjonowanie dokumentów</li>
            <li>Podpisy elektroniczne</li>
            <li>Archiwizacja i wyszukiwanie</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
