import React, { useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const RealizationPage: React.FC = () => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          {imageError ? (
            <ModuleIcon name="realization" emoji={MODULE_ICONS.realization} size={36} alt="Realizacja" />
          ) : (
            <img
              src="/assets/realization.png"
              alt="Realizacja"
              width={36}
              height={36}
              onError={() => setImageError(true)}
            />
          )}
        </div>
        <div>
          <h1>Realizacja</h1>
          <p className="page-subtitle">🚧 Planowanie, postęp i rozliczanie prac w terenie</p>
        </div>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Zarządzanie realizacją zleceń – planowanie, postęp i rozliczenie prac w terenie.
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
          <p>💡 Masz sugestię dotyczącą tego modułu? Skontaktuj się z administratorem systemu i zgłoś propozycję funkcji.</p>
        </div>
      </div>
    </div>
  );
};
