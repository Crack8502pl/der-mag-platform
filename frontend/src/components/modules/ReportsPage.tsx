import React from 'react';
import { BackButton } from '../common/BackButton';
import './ModulePage.css';

export const ReportsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">📈</div>
        <h1>Raporty</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Generowanie raportów - analiza danych, statystyki i eksport.
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
            <li>Raporty realizacji kontraktów</li>
            <li>Statystyki zadań</li>
            <li>Raporty zasobów</li>
            <li>Export do Excel/PDF</li>
            <li>Automatyczne raporty okresowe</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
