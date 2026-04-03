// src/components/common/ConnectionStatusBanner.tsx
import React, { useEffect, useState } from 'react';
import { onConnectionChange } from '../../services/connectionMonitor';
import './ConnectionStatusBanner.css';

export const ConnectionStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onConnectionChange((online) => {
      setIsOnline(online);
    });

    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, message } = customEvent.detail;

      setNotification({ type, message });

      setTimeout(() => {
        setNotification(null);
      }, 5000);
    };

    window.addEventListener('connectionMonitorNotification', handleNotification);

    return () => {
      unsubscribe();
      window.removeEventListener('connectionMonitorNotification', handleNotification);
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
