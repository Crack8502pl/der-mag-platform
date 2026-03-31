// src/components/layout/ForbiddenPage.tsx
// 403 Forbidden page

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { encodePermissionError } from '../../utils/permissionCodec';
import './ForbiddenPage.css';

interface ForbiddenLocationState {
  module?: string;
  action?: string;
}

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const state = location.state as ForbiddenLocationState | null;
  const requestedModule = state?.module ?? '';
  const requestedAction = state?.action ?? '';

  const errorCode =
    user && requestedModule
      ? encodePermissionError({
          userId: user.id,
          username: user.username,
          roleName: typeof user.role === 'string' ? user.role : '',
          requestedModule,
          requestedAction,
          timestamp: Date.now(),
        })
      : null;

  const handleCopy = () => {
    if (!errorCode) return;
    navigator.clipboard.writeText(errorCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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

        {requestedModule && (
          <p className="forbidden-details">
            Wymagane uprawnienie:{' '}
            <code className="forbidden-perm-badge">
              {requestedModule}.{requestedAction}
            </code>
          </p>
        )}

        {errorCode && (
          <div className="forbidden-error-code">
            <p className="forbidden-error-code-label">
              Skopiuj kod błędu i wyślij do administratora:
            </p>
            <div className="forbidden-error-code-row">
              <code className="forbidden-error-code-text">{errorCode}</code>
              <button
                className="btn btn-secondary forbidden-copy-btn"
                onClick={handleCopy}
              >
                {copied ? '✅ Skopiowano' : '📋 Kopiuj'}
              </button>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Wróć do Dashboard
        </button>
      </div>
    </div>
  );
};
