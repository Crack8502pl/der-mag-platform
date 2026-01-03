import React from 'react';
import { BackButton } from '../common/BackButton';
import './ModulePage.css';

export const SubsystemsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">🔧</div>
        <h1>Podsystemy</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie podsystemami infrastrukturalnymi - konfiguracja, monitoring i dokumentacja.
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
            <li>Rejestr podsystemów</li>
            <li>Generowanie BOM dla podsystemów</li>
            <li>Alokacja puli adresów IP</li>
            <li>Dokumentacja techniczna</li>
            <li>Historia zmian konfiguracji</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
