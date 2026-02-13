import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const PrefabricationPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="prefabrication" emoji={MODULE_ICONS.prefabrication} size={36} />
        </div>
        <h1>Prefabrykacja</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Prefabrykacja urządzeń - konfiguracja, weryfikacja i przygotowanie urządzeń do montażu.
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
            <li>Przyjmowanie zleceń prefabrykacji</li>
            <li>Konfiguracja urządzeń</li>
            <li>Weryfikacja numerów seryjnych</li>
            <li>Przygotowanie do wysyłki</li>
            <li>Dokumentacja wykonanych prac</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
