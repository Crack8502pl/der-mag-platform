// src/components/settings/NotificationsSection.tsx
// Notification preferences section

import React, { useState } from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import api from '../../services/api';

interface NotifPrefs {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
}

interface Props {
  preferences: NotifPrefs;
  onUpdate?: (prefs: Partial<NotifPrefs>) => void;
}

export const NotificationsSection: React.FC<Props> = ({ preferences, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { isSupported, isSubscribed, isLoading, error: pushError, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = async (field: keyof NotifPrefs) => {
    const newValue = !preferences[field];
    setSaving(true);
    setMessage(null);

    try {
      await api.put('/users/me/preferences', { [field]: newValue });
      onUpdate?.({ [field]: newValue });
      setMessage({ type: 'success', text: 'Ustawienia zapisane' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Błąd zapisywania' });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) {
        await api.put('/users/me/preferences', { pushNotifications: false }).catch(() => null);
        onUpdate?.({ pushNotifications: false });
      }
    } else {
      const ok = await subscribe();
      if (ok) {
        await api.put('/users/me/preferences', { pushNotifications: true }).catch(() => null);
        onUpdate?.({ pushNotifications: true });
      }
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">🔔 Powiadomienia</h3>

      <div className="settings-toggles">
        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">📧 Powiadomienia e-mail</span>
            <span className="settings-toggle__desc">Otrzymuj ważne powiadomienia na adres e-mail</span>
          </div>
          <button
            className={`toggle-btn${preferences.emailNotifications ? ' toggle-btn--on' : ''}`}
            onClick={() => handleToggle('emailNotifications')}
            disabled={saving}
            type="button"
            aria-pressed={preferences.emailNotifications}
          >
            {preferences.emailNotifications ? 'Włączone' : 'Wyłączone'}
          </button>
        </div>

        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">📱 Powiadomienia Push</span>
            <span className="settings-toggle__desc">
              {isSupported
                ? 'Natywne powiadomienia w przeglądarce (wymaga połączenia VPN)'
                : 'Twoja przeglądarka nie obsługuje Web Push'}
            </span>
          </div>
          <button
            className={`toggle-btn${isSubscribed ? ' toggle-btn--on' : ''}`}
            onClick={handlePushToggle}
            disabled={!isSupported || isLoading}
            type="button"
            aria-pressed={isSubscribed}
          >
            {isLoading ? 'Ładowanie...' : isSubscribed ? 'Włączone' : 'Wyłączone'}
          </button>
        </div>

        <div className="settings-toggle">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">🔊 Dźwięk powiadomień</span>
            <span className="settings-toggle__desc">Odtwarzaj dźwięk przy nowych powiadomieniach</span>
          </div>
          <button
            className={`toggle-btn${preferences.notificationSound ? ' toggle-btn--on' : ''}`}
            onClick={() => handleToggle('notificationSound')}
            disabled={saving}
            type="button"
            aria-pressed={preferences.notificationSound}
          >
            {preferences.notificationSound ? 'Włączony' : 'Wyłączony'}
          </button>
        </div>
      </div>

      {(pushError || message) && (
        <div className={`settings-message settings-message--${message?.type || 'error'}`}>
          {pushError || message?.text}
        </div>
      )}
    </div>
  );
};
