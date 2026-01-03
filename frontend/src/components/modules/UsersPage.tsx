import React from 'react';
import { BackButton } from '../common/BackButton';
import './ModulePage.css';

export const UsersPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">👥</div>
        <h1>Użytkownicy</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie użytkownikami systemu - role, uprawnienia i profile.
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
            <li>Lista użytkowników</li>
            <li>Profile użytkowników</li>
            <li>Zarządzanie rolami</li>
            <li>Historia aktywności</li>
            <li>Ustawienia uprawnień</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
