// src/components/assets/AssetDetailPage.tsx
// Asset detail page stub – full implementation in PR #9

import React from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '../common/BackButton';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="module-page">
      <BackButton to="/assets" />
      <div className="module-header">
        <h1>Obiekt #{id}</h1>
      </div>
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        Szczegóły obiektu – implementacja w PR #9
      </div>
    </div>
  );
};
