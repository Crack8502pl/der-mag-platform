// src/components/common/TokenExpirationModal.tsx
import React from 'react';
import './TokenExpirationModal.css';

interface Props {
  secondsRemaining: number;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing?: boolean;
  error?: string | null;
}

export const TokenExpirationModal: React.FC<Props> = ({ 
  secondsRemaining, 
  onRefresh, 
  onLogout,
  isRefreshing = false,
  error = null
}) => {
  const progressPercentage = Math.max(0, (secondsRemaining / 40) * 100);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isRefreshing) {
      onRefresh();
    }
  };

  return (
    <div className="token-expiration-overlay" onKeyDown={handleKeyDown}>
      <div className="token-expiration-modal">
        <div className="modal-icon">{isRefreshing ? '⏳' : '⏰'}</div>
        <h2>
          {isRefreshing 
            ? 'Odświeżanie sesji...' 
            : `Sesja wygasa za ${secondsRemaining} sekund`
          }
        </h2>
        
        {error && (
          <p className="modal-error">
            ⚠️ {error}
          </p>
        )}
        
        <p>Twoja sesja wkrótce wygaśnie. Czy chcesz kontynuować pracę?</p>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={onRefresh}
            disabled={isRefreshing}
            autoFocus
          >
            {isRefreshing ? '⏳ Odświeżanie...' : '🔄 Odśwież sesję'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onLogout}
            disabled={isRefreshing}
          >
            🚪 Wyloguj
          </button>
        </div>
        
        <p className="modal-hint">
          <small>
            {isRefreshing 
              ? 'Proszę czekać...' 
              : 'Naciśnij Enter aby odświeżyć sesję'
            }
          </small>
        </p>
      </div>
    </div>
  );
};
