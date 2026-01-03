import React from 'react';
import { BackButton } from '../common/BackButton';
import './ModulePage.css';

export const BOMPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">🔩</div>
        <h1>Materiały BOM</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie materiałami i szablonami BOM - katalog materiałów i wyceny.
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
            <li>Katalog materiałów</li>
            <li>Szablony BOM</li>
            <li>Import materiałów</li>
            <li>Wyceny i kalkulacje</li>
            <li>Historia zmian cen</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
