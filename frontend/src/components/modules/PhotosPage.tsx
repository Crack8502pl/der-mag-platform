import React from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './ModulePage.css';

export const PhotosPage: React.FC = () => {
  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="photos" emoji={MODULE_ICONS.photos} size={36} />
        </div>
        <div>
          <h1>Zdjęcia z realizacji</h1>
          <p className="page-subtitle">🚧 Upload, organizacja i akceptacja dokumentacji fotograficznej</p>
        </div>
      </div>

      <div className="module-content card">
        <p className="module-description">
          Zarządzanie zdjęciami – upload, organizacja i zatwierdzanie.
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
            <li>Upload zdjęć z realizacji (drag &amp; drop)</li>
            <li>Organizacja w albumy per kontrakt/zadanie</li>
            <li>Geolokalizacja zdjęć (metadane EXIF + mapa)</li>
            <li>Proces zatwierdzania (workflow)</li>
            <li>Tagowanie i wyszukiwanie</li>
            <li>Export dokumentacji fotograficznej (ZIP/PDF)</li>
            <li>Podgląd galerii z miniaturami</li>
          </ul>
        </div>

        <div className="module-cta">
          <p>💡 Masz sugestię dotyczącą tego modułu? Skontaktuj się z administratorem systemu i zgłoś propozycję funkcji.</p>
        </div>
      </div>
    </div>
  );
};
