// src/components/assets/AssetDetailPage.tsx
// Asset detail page - placeholder for PR#10

import React from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './AssetListPage.css';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="asset-list-page">
      <div className="page-header">
        <BackButton />
        <div className="header-content">
          <ModuleIcon name="assets" emoji={MODULE_ICONS.assets} size={36} />
          <div>
            <h1>Obiekt #{id}</h1>
            <p className="page-subtitle">Szczegóły obiektu infrastruktury</p>
          </div>
        </div>
      </div>
      <div className="empty-state">
        <div className="empty-icon">🏗️</div>
        <h3>Widok szczegółów w budowie</h3>
        <p>Szczegóły obiektu będą dostępne w kolejnej wersji (PR#10).</p>
      </div>
    </div>
  );
};
