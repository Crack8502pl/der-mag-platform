// src/components/common/TokenExpirationModal.tsx
import React from 'react';
import './TokenExpirationModal.css';

interface Props {
  secondsRemaining: number;
  onRefresh: () => void;
  onLogout: () => void;
}

export const TokenExpirationModal: React.FC<Props> = ({ 
  secondsRemaining, 
  onRefresh, 
  onLogout 
}) => {
  // Progress bar width (40s -> 0s = 100% -> 0%)
  const progressPercentage = Math.max(0, (secondsRemaining / 40) * 100);

  // Handle Enter key press
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onRefresh();
    }
  };

  return (
    <div className="token-expiration-overlay" onKeyDown={handleKeyDown}>
      <div className="token-expiration-modal">
        <div className="modal-icon">⏰</div>
        <h2>Sesja wygasa za {secondsRemaining} sekund</h2>
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
            autoFocus
          >
            🔄 Odśwież sesję
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onLogout}
          >
            🚪 Wyloguj
          </button>
        </div>
        
        <p className="modal-hint">
          <small>Naciśnij <kbd>Enter</kbd> aby odświeżyć sesję</small>
        </p>
      </div>
    </div>
  );
};
