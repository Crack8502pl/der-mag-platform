import React from 'react';
import { BackButton } from '../common/BackButton';
import './ModulePage.css';

export const TasksPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">📋</div>
        <h1>Zadania</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie zadaniami - planowanie, przypisywanie i monitoring realizacji zadań.
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
            <li>Lista zadań z filtrowaniem i sortowaniem</li>
            <li>Tworzenie i edycja zadań</li>
            <li>Przypisywanie do pracowników</li>
            <li>Monitoring statusu realizacji</li>
            <li>Automatyczne powiadomienia</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
