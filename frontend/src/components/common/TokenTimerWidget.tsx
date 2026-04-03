// src/components/common/TokenTimerWidget.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '../../stores/authStore';
import { getCorrectedTime, getServerTimeOffset, CLOCK_SKEW_WARNING_THRESHOLD } from '../../services/api';
import { useConnectionQuality } from '../../hooks/useConnectionQuality';
import { useTheme } from '../../contexts/ThemeContext';
import './TokenTimerWidget.css';

// localStorage key for widget position
const POSITION_STORAGE_KEY = 'tokenTimerWidgetPosition';

// Default position
const DEFAULT_POSITION = { x: 20, y: 20 };

// Dynamic calculation of token lifetime from JWT
const getTokenLifetime = (token: string): number => {
  try {
    const decoded = jwtDecode<{ exp: number; iat: number }>(token);
    return (decoded.exp - decoded.iat) * 1000;
  } catch {
    return 900000; // fallback: 15 minutes
  }
};

// Function to read position from localStorage
const getSavedPosition = (): { x: number; y: number } => {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      // Validation - ensure position is within screen bounds
      return {
        x: Math.max(0, Math.min(pos.x, window.innerWidth - 120)),
        y: Math.max(0, Math.min(pos.y, window.innerHeight - 60))
      };
    }
  } catch (e) {
    console.warn('Error reading widget position:', e);
  }
  return DEFAULT_POSITION;
};

// Function to save position to localStorage
const savePosition = (x: number, y: number) => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x, y }));
  } catch (e) {
    console.warn('Error saving widget position:', e);
  }
};

export const TokenTimerWidget: React.FC = () => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [tokenLifetime, setTokenLifetime] = useState<number>(900000);
  const [showTooltip, setShowTooltip] = useState(false);
  const [clockSkewWarning, setClockSkewWarning] = useState<string | null>(null);
  
  // Mobile: expanded state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Desktop: drag & drop
  const [position, setPosition] = useState(getSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showResetButton, setShowResetButton] = useState(false);
  
  // Reactive mobile detection
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  
  // Orientation detection for mobile landscape
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  });
  
  const widgetRef = useRef<HTMLDivElement>(null);

  // Connection quality
  const { quality, latency, bandwidth } = useConnectionQuality();
  const { effectiveTheme } = useTheme();

  // Connection quality helpers
  const getConnectionSymbol = () => {
    if (quality === 'offline') {
      return effectiveTheme === 'husky' ? '⚫' : '⚪';
    }
    switch (quality) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  };

  const getConnectionLabel = () => {
    switch (quality) {
      case 'excellent': return 'Doskonałe';
      case 'good': return 'Dobre';
      case 'poor': return 'Słabe';
      case 'offline': return 'Offline';
      default: return 'Nieznane';
    }
  };

  const getConnectionHints = () => {
    switch (quality) {
      case 'excellent':
        return [
          '✅ Połączenie stabilne',
          '✅ Upload plików zalecany',
          '✅ Wszystkie operacje bezpieczne',
        ];
      case 'good':
        return [
          '⚠️ Połączenie akceptowalne',
          '⚠️ Duże pliki mogą zająć chwilę',
          '💡 Unikaj wielokrotnego odświeżania',
        ];
      case 'poor':
        return [
          '🔴 Słabe połączenie',
          '🔴 Upload może się nie powieść',
          '💡 Znajdź lepszy zasięg lub WiFi',
          '💡 Operacje są kolejkowane automatycznie',
        ];
      case 'offline':
        return [
          effectiveTheme === 'husky' ? '⚫ Brak połączenia' : '⚪ Brak połączenia',
          '📦 Wszystkie operacje są kolejkowane',
          '🔄 Automatyczny retry po przywróceniu połączenia',
        ];
      default:
        return [];
    }
  };

  // Timer update effect
  useEffect(() => {
    const updateTimer = () => {
      // Get token from Zustand store instead of localStorage
      const token = useAuthStore.getState().accessToken;
      
      if (!token) {
        setTimeRemaining(null);
        setClockSkewWarning(null);
        return;
      }

      try {
        const decoded = jwtDecode<{ exp: number; iat: number }>(token);
        const expirationTime = decoded.exp * 1000;
        
        // ZMIANA: Użyj skorygowanego czasu
        const currentTime = getCorrectedTime();
        const remaining = Math.max(0, expirationTime - currentTime);
        
        const lifetime = getTokenLifetime(token);
        setTokenLifetime(lifetime);
        setTimeRemaining(remaining);
        
        // Show clock skew warning if significant (> 30s)
        const offset = getServerTimeOffset();
        if (Math.abs(offset) > CLOCK_SKEW_WARNING_THRESHOLD) {
          setClockSkewWarning(`⚠️ Różnica czasu: ${Math.round(Math.abs(offset) / 1000)}s`);
        } else {
          setClockSkewWarning(null);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        setTimeRemaining(null);
        setClockSkewWarning(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Desktop: Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    
    // Ignore if reset button was clicked
    if ((e.target as HTMLElement).classList.contains('reset-position-btn')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, [isMobile]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || isMobile) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to screen bounds
    const maxX = window.innerWidth - (widgetRef.current?.offsetWidth || 120);
    const maxY = window.innerHeight - (widgetRef.current?.offsetHeight || 60);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset, isMobile]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position.x, position.y);
    }
  }, [isDragging, position]);

  // Desktop: Attach/detach mouse event listeners
  useEffect(() => {
    if (isMobile) return;
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, isMobile]);

  // Reset position to default
  const resetPosition = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(DEFAULT_POSITION);
    savePosition(DEFAULT_POSITION.x, DEFAULT_POSITION.y);
  }, []);

  // Mobile: Toggle expanded state
  const handleMobileClick = useCallback(() => {
    if (isMobile) {
      setIsExpanded(prev => !prev);
    }
  }, [isMobile]);

  // Handle window resize and orientation change
  useEffect(() => {
    const handleResizeAndOrientation = () => {
      const newIsMobile = window.innerWidth < 768;
      const newIsLandscape = window.innerWidth > window.innerHeight;
      
      setIsMobile(newIsMobile);
      setIsLandscape(newIsLandscape);
      
      if (!newIsMobile) {
        // Desktop - ensure widget is within bounds
        setPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, window.innerWidth - 120)),
          y: Math.max(0, Math.min(prev.y, window.innerHeight - 60))
        }));
      }
    };
    
    window.addEventListener('resize', handleResizeAndOrientation);
    window.addEventListener('orientationchange', handleResizeAndOrientation);
    
    return () => {
      window.removeEventListener('resize', handleResizeAndOrientation);
      window.removeEventListener('orientationchange', handleResizeAndOrientation);
    };
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

  // Progress bar width (dynamically calculated based on actual token lifetime)
  const progressPercentage = Math.max(0, Math.min(100, (timeRemaining / tokenLifetime) * 100));
  
  const isExpiringSoon = timeRemaining <= 60000; // 60 seconds
  const isExpiring = timeRemaining <= 40000; // 40 seconds (threshold for warning modal)

  // Style for desktop (position from drag & drop)
  const desktopStyle: React.CSSProperties = !isMobile ? {
    top: position.y,
    left: position.x,
    right: 'auto',
    cursor: isDragging ? 'grabbing' : 'grab'
  } : {};

  return (
    <div 
      ref={widgetRef}
      className={`token-timer-widget ${isExpiring ? 'expiring' : isExpiringSoon ? 'expiring-soon' : ''} ${isDragging ? 'dragging' : ''} ${isExpanded ? 'expanded' : ''} ${isMobile && isLandscape ? 'mobile-landscape' : ''} connection-${quality}`}
      style={desktopStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => {
        if (!isMobile) {
          setShowTooltip(true);
          setShowResetButton(true);
        }
      }}
      onMouseLeave={() => {
        if (!isMobile) {
          setShowTooltip(false);
          setShowResetButton(false);
        }
      }}
      onClick={handleMobileClick}
    >
      {/* Reset position button - desktop only */}
      {!isMobile && showResetButton && (
        <button 
          className="reset-position-btn"
          onClick={resetPosition}
          title="Reset position"
        >
          ⟲
        </button>
      )}
      
      <div className="timer-content">
        <span className="timer-icon">🕐</span>
        <span className="timer-text">{formatTime(timeRemaining)}</span>
        {/* Connection quality indicator */}
        <span className="connection-indicator" title={getConnectionLabel()}>
          {getConnectionSymbol()}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="timer-progress">
        <div 
          className="timer-progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Mobile: Expanded content (instead of tooltip) */}
      {isMobile && isExpanded && (
        <div className="mobile-expanded-content">
          {/* Connection quality mobile */}
          <div className="mobile-connection-status">
            <span className="mobile-connection-icon">{getConnectionSymbol()}</span>
            <span className="mobile-connection-label">{getConnectionLabel()}</span>
          </div>

          {quality !== 'offline' && (
            <div className="mobile-connection-metrics">
              <span>{latency}ms</span>
              <span>•</span>
              <span>{bandwidth.toFixed(1)} Mbps</span>
            </div>
          )}

          <div className="expanded-stats">
            <div className="expanded-stat">
              <span className="stat-label">Pozostało:</span>
              <span className="stat-value">{formatTimeVerbose(timeRemaining)}</span>
            </div>
            <div className="expanded-stat">
              <span className="stat-label">Sesja:</span>
              <span className="stat-value">{Math.floor(progressPercentage)}%</span>
            </div>
          </div>
          <p className="expanded-hint">
            {isExpiring 
              ? '🚨 Token wkrótce wygaśnie!'
              : isExpiringSoon
              ? '⚠️ Przygotuj się do odświeżenia'
              : '✅ Token jest aktywny'}
          </p>
          
          {clockSkewWarning && (
            <p className="clock-skew-warning">
              {clockSkewWarning}
            </p>
          )}

          {/* Mobile hints */}
          <div className="mobile-hints">
            {getConnectionHints().map((hint, index) => (
              <p key={index} className="mobile-hint">{hint}</p>
            ))}
          </div>
        </div>
      )}

      {/* Desktop: Tooltip */}
      {!isMobile && showTooltip && !isDragging && (
        <div className="timer-tooltip">
          <p className="tooltip-header">⏱️ Czas sesji</p>
          <p className="tooltip-time">{formatTime(timeRemaining)}</p>
          <p className="tooltip-subtitle">do wygaśnięcia tokenu</p>
          
          <div className="tooltip-divider"></div>

          {/* Connection quality section */}
          <div className="tooltip-connection-section">
            <p className="tooltip-connection-header">
              {getConnectionSymbol()} Jakość połączenia
            </p>
            <p className="tooltip-connection-quality">
              {getConnectionLabel()}
            </p>

            {quality !== 'offline' && (
              <div className="tooltip-connection-stats">
                <div className="connection-stat">
                  <span className="stat-label">Latencja:</span>
                  <span className="stat-value">{latency}ms</span>
                </div>
                <div className="connection-stat">
                  <span className="stat-label">Przepustowość:</span>
                  <span className="stat-value">{bandwidth.toFixed(1)} Mbps</span>
                </div>
              </div>
            )}

            {/* Connection hints */}
            <div className="tooltip-connection-hints">
              <p className="hints-header">💡 Wskazówki:</p>
              <ul className="hints-list">
                {getConnectionHints().map((hint, index) => (
                  <li key={index}>{hint}</li>
                ))}
              </ul>
            </div>
          </div>

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
          
          <p className="tooltip-drag-hint">
            <small>🖱️ Przeciągnij aby zmienić pozycję</small>
          </p>
          
          {clockSkewWarning && (
            <p className="clock-skew-warning">
              {clockSkewWarning}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
