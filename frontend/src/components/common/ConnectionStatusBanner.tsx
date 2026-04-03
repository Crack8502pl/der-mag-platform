// src/components/common/ConnectionStatusBanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import { onConnectionChange } from '../../services/connectionMonitor';
import './ConnectionStatusBanner.css';

export const ConnectionStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = onConnectionChange((online) => {
      setIsOnline(online);
    });

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, message } = customEvent.detail;

      setNotification({ type, message });

      // Cancel any pending dismiss timer before starting a new one
      if (notificationTimerRef.current !== null) {
        clearTimeout(notificationTimerRef.current);
      }
      notificationTimerRef.current = setTimeout(() => {
        setNotification(null);
        notificationTimerRef.current = null;
      }, 5000);
    };

    window.addEventListener('connectionMonitorNotification', handleNotification);

    return () => {
      unsubscribe();
      window.removeEventListener('connectionMonitorNotification', handleNotification);
      if (notificationTimerRef.current !== null) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="connection-banner connection-banner--offline">
        <span className="connection-banner__icon">📡</span>
        <span className="connection-banner__text">
          Tryb offline - żądania zostaną wysłane automatycznie po przywróceniu połączenia
        </span>
      </div>
    );
  }

  if (notification) {
    return (
      <div className={`connection-banner connection-banner--${notification.type}`}>
        <span className="connection-banner__text">{notification.message}</span>
        <button
          className="connection-banner__close"
          onClick={() => setNotification(null)}
        >
          ×
        </button>
      </div>
    );
  }

  return null;
};
