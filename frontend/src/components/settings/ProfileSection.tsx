// src/components/settings/ProfileSection.tsx
// User profile settings section

import React, { useState } from 'react';
import api from '../../services/api';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Props {
  initialData: ProfileData;
  onUpdate?: (data: ProfileData) => void;
}

export const ProfileSection: React.FC<Props> = ({ initialData, onUpdate }) => {
  const [form, setForm] = useState<ProfileData>(initialData);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data } = await api.put('/users/me/profile', form);
      if (data.success) {
        setMessage({ type: 'success', text: 'Profil zaktualizowany pomyślnie' });
        onUpdate?.(form);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Błąd aktualizacji profilu'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">👤 Profil użytkownika</h3>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-form__row">
          <div className="settings-form__field">
            <label htmlFor="firstName">Imię</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="settings-form__field">
            <label htmlFor="lastName">Nazwisko</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="settings-form__field">
          <label htmlFor="email">Adres e-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="settings-form__field">
          <label htmlFor="phone">Telefon</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone || ''}
            onChange={handleChange}
            placeholder="Opcjonalnie"
          />
        </div>

        {message && (
          <div className={`settings-message settings-message--${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Zapisywanie...' : 'Zapisz profil'}
        </button>
      </form>
    </div>
  );
};
