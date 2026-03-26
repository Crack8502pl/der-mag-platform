// src/components/settings/SecuritySection.tsx
// Security settings section

import React, { useState } from 'react';
import api from '../../services/api';

interface SecurityPrefs {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
}

interface Props {
  preferences: SecurityPrefs;
  onUpdate?: (prefs: Partial<SecurityPrefs>) => void;
}

const TIMEOUT_OPTIONS = [
  { value: 15, label: '15 minut' },
  { value: 30, label: '30 minut' },
  { value: 60, label: '1 godzina' },
  { value: 120, label: '2 godziny' },
  { value: 240, label: '4 godziny' },
  { value: 480, label: '8 godzin' },
  { value: 1440, label: '24 godziny' }
];

export const SecuritySection: React.FC<Props> = ({ preferences, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTimeoutChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timeout = Number(e.target.value);
    setSaving(true);
    setMessage(null);

    try {
      await api.put('/users/me/preferences', { sessionTimeout: timeout });
      onUpdate?.({ sessionTimeout: timeout });
      setMessage({ type: 'success', text: 'Ustawienia zabezpieczeń zapisane' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Błąd zapisywania' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">🔒 Bezpieczeństwo</h3>

      <div className="settings-form">
        <div className="settings-form__field">
          <label htmlFor="sessionTimeout">Timeout sesji</label>
          <select
            id="sessionTimeout"
            value={preferences.sessionTimeout}
            onChange={handleTimeoutChange}
            disabled={saving}
          >
            {TIMEOUT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="settings-form__hint">
            Po tym czasie nieaktywności zostaniesz wylogowany
          </span>
        </div>

        <div className="settings-toggle settings-toggle--disabled">
          <div className="settings-toggle__info">
            <span className="settings-toggle__label">🛡️ Uwierzytelnianie dwuskładnikowe (2FA)</span>
            <span className="settings-toggle__desc">
              Dodatkowa warstwa bezpieczeństwa — <em>Wkrótce dostępne</em>
            </span>
          </div>
          <button
            className="toggle-btn"
            disabled
            type="button"
            title="2FA - wkrótce dostępne"
          >
            Niedostępne
          </button>
        </div>
      </div>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};
