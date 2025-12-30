// src/components/layout/ForbiddenPage.tsx
// 403 Forbidden page

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ForbiddenPage.css';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="forbidden-container">
      <div className="forbidden-content">
        <div className="forbidden-icon">🚫</div>
        <h1 className="forbidden-title">403</h1>
        <h2 className="forbidden-subtitle">Brak dostępu</h2>
        <p className="forbidden-message">
          Nie masz uprawnień do wyświetlenia tej strony.
          <br />
          Skontaktuj się z administratorem, jeśli uważasz, że to błąd.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Wróć do Dashboard
        </button>
      </div>
    </div>
  );
};
