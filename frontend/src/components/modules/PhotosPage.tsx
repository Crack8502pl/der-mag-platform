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
        <h1>Zdjęcia</h1>
      </div>
      
      <div className="module-content card">
        <p className="module-description">
          Zarządzanie zdjęciami z realizacji - upload, organizacja i zatwierdzanie.
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
            <li>Upload zdjęć z realizacji</li>
            <li>Organizacja w albumy</li>
            <li>Geolokalizacja zdjęć</li>
            <li>Proces zatwierdzania</li>
            <li>Export dokumentacji fotograficznej</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
