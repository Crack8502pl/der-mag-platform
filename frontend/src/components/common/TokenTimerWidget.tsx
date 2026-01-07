// src/components/common/TokenTimerWidget.tsx
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import authService from '../../services/auth.service';
import './TokenTimerWidget.css';

// Dynamiczne obliczanie czasu życia tokenu z JWT
const getTokenLifetime = (token: string): number => {
  try {
    const decoded = jwtDecode<{ exp: number; iat: number }>(token);
    // iat = issued at (timestamp utworzenia), exp = expires at (timestamp wygaśnięcia)
    return (decoded.exp - decoded.iat) * 1000; // w milisekundach
  } catch {
    return 900000; // fallback: 15 minut (domyślna wartość ACCESS_EXPIRES)
  }
};

export const TokenTimerWidget: React.FC = () => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [tokenLifetime, setTokenLifetime] = useState<number>(900000); // 15 min default
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const token = authService.getAccessToken();
      
      if (!token) {
        setTimeRemaining(null);
        return;
      }

      try {
        const decoded = jwtDecode<{ exp: number; iat: number }>(token);
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();
        const remaining = Math.max(0, expirationTime - currentTime);
        
        // Oblicz czas życia tokenu przy pierwszej aktualizacji lub nowym tokenie
        const lifetime = getTokenLifetime(token);
        setTokenLifetime(lifetime);
        
        setTimeRemaining(remaining);
      } catch (error) {
        console.error('Błąd dekodowania tokenu:', error);
        setTimeRemaining(null);
      }
    };

    // Aktualizuj co sekundę
    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeRemaining === null) {
    return null;
  }

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeVerbose = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes} min ${seconds} sek`;
    }
    return `${seconds} sekund`;
  };

  // Progress bar width (dynamicznie obliczany na podstawie rzeczywistego czasu życia tokenu)
  const progressPercentage = Math.max(0, Math.min(100, (timeRemaining / tokenLifetime) * 100));
  
  const isExpiringSoon = timeRemaining <= 60000; // 60 sekund
  const isExpiring = timeRemaining <= 40000; // 40 sekund (threshold dla modalu ostrzeżenia)

  return (
    <div 
      className={`token-timer-widget ${isExpiring ? 'expiring' : isExpiringSoon ? 'expiring-soon' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="timer-content">
        <span className="timer-icon">🕐</span>
        <span className="timer-text">{formatTime(timeRemaining)}</span>
      </div>
      
      {/* Progress bar */}
      <div className="timer-progress">
        <div 
          className="timer-progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Tooltip z rozszerzonymi informacjami */}
      {showTooltip && (
        <div className="timer-tooltip">
          <p className="tooltip-header">⏱️ Czas sesji</p>
          <p className="tooltip-time">{formatTime(timeRemaining)}</p>
          <p className="tooltip-subtitle">do wygaśnięcia tokenu</p>
          
          <div className="tooltip-divider"></div>
          
          <div className="tooltip-stats">
            <div className="tooltip-stat">
              <span className="stat-label">Pozostało:</span>
              <span className="stat-value">{Math.floor(progressPercentage)}%</span>
            </div>
            <div className="tooltip-stat">
              <span className="stat-label">Czas życia:</span>
              <span className="stat-value">{formatTimeVerbose(tokenLifetime)}</span>
            </div>
          </div>
          
          <div className="tooltip-divider"></div>
          
          <p className="tooltip-hint">
            {isExpiring 
              ? '🚨 Token wkrótce wygaśnie!'
              : isExpiringSoon
              ? '⚠️ Przygotuj się do odświeżenia'
              : '✅ Token jest aktywny'}
          </p>
          
          {!isExpiring && (
            <p className="tooltip-info">
              <small>Auto-refresh za {Math.floor((timeRemaining - 40000) / 1000)}s</small>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
