import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const ReportsPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="reports" emoji={MODULE_ICONS.reports} size={36} />
        </div>
        <div>
          <h1>Raporty</h1>
          <p className="page-subtitle">🚧 Generowanie raportów i analiz dla kluczowych danych operacyjnych</p>
        </div>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Generowanie raportów – analiza danych, statystyki i eksport.
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
            <li>Raporty realizacji kontraktów (PDF/Excel)</li>
            <li>Statystyki zadań i SLA</li>
            <li>Raporty zasobów i stanów magazynowych</li>
            <li>Export do Excel / PDF</li>
            <li>Automatyczne raporty okresowe (email)</li>
            <li>Dashboard KPI z wykresami</li>
            <li>Raporty pracy brygad</li>
          </ul>
        </div>

        <div className="module-cta">
          <p>💡 Masz sugestię dotyczącą tego modułu? Skontaktuj się z administratorem systemu i zgłoś propozycję funkcji.</p>
        </div>
      </div>
    </div>
  );
};
