// src/components/settings/PasswordSection.tsx
// Password change section

import React, { useState } from 'react';
import api from '../../services/api';

export const PasswordSection: React.FC = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Nowe hasła nie są identyczne' });
      return;
    }

    if (form.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Nowe hasło musi mieć co najmniej 8 znaków' });
      return;
    }

    setSaving(true);

    try {
      const { data } = await api.put('/users/me/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      if (data.success) {
        setMessage({ type: 'success', text: 'Hasło zmienione pomyślnie' });
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Błąd zmiany hasła'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">🔑 Zmiana hasła</h3>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-form__field">
          <label htmlFor="currentPassword">Obecne hasło</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="settings-form__field">
          <label htmlFor="newPassword">Nowe hasło</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <span className="settings-form__hint">Minimum 8 znaków</span>
        </div>

        <div className="settings-form__field">
          <label htmlFor="confirmPassword">Potwierdź nowe hasło</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
        </div>

        {message && (
          <div className={`settings-message settings-message--${message.type}`}>
            {message.text}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Zmienianie...' : 'Zmień hasło'}
        </button>
      </form>
    </div>
  );
};
