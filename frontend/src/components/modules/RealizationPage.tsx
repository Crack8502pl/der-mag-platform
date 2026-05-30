import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const RealizationPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="realization" emoji={MODULE_ICONS.realization} size={36} />
        </div>
        <div>
          <h1>Realizacja</h1>
          <p className="page-subtitle">Zarządzanie realizacją zleceń – planowanie, postęp i rozliczenie prac w terenie.</p>
        </div>
      </div>

      <div className="module-content card">
        <div className="module-status">
          <span className="status-badge status-development">🚧 Moduł w budowie</span>
        </div>

        <div className="module-features">
          <h3>Planowane funkcje:</h3>
          <ul>
            <li>Zlecenia realizacji powiązane z kontraktem</li>
            <li>Planowanie i harmonogram prac brygad</li>
            <li>Śledzenie postępu realizacji (% ukończenia)</li>
            <li>Rozliczenie materiałów i robocizny</li>
            <li>Protokoły odbioru z podpisem</li>
            <li>Integracja z modułem Zdjęcia i Dokumenty</li>
            <li>Raport końcowy realizacji</li>
            <li>Historia zmian i logi zdarzeń</li>
          </ul>
        </div>

        <div className="module-cta">
          <p>💡 Masz sugestię? Skontaktuj się z administratorem systemu.</p>
        </div>
      </div>
    </div>
  );
};
