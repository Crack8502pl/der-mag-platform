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
        <div>
          <h1>Dokumenty</h1>
          <p className="page-subtitle">🚧 Szablony, generowanie i archiwizacja dokumentów projektowych</p>
        </div>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Zarządzanie dokumentami – szablony, generowanie i archiwizacja.
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
            <li>Biblioteka szablonów dokumentów (Word/PDF/Excel)</li>
            <li>Generowanie dokumentów z danymi kontraktu/zadania</li>
            <li>Wersjonowanie dokumentów</li>
            <li>Podpisy elektroniczne</li>
            <li>Archiwizacja i wyszukiwanie pełnotekstowe</li>
            <li>Udostępnianie dokumentów zewnętrznym podmiotom</li>
            <li>Zarządzanie uprawnieniami do dokumentów</li>
          </ul>
        </div>

        <div className="module-cta">
          <p>💡 Masz sugestię dotyczącą tego modułu? Skontaktuj się z administratorem systemu i zgłoś propozycję funkcji.</p>
        </div>
      </div>
    </div>
  );
};
