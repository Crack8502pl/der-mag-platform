// src/components/auth/PasswordChangeForm.tsx
// Password change form with real-time validation

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePasswordValidation } from '../../hooks/usePasswordValidation';
import { PasswordInput } from '../common/PasswordInput';
import { PasswordRequirements } from './PasswordRequirements';
import './PasswordChangeForm.css';

export const PasswordChangeForm: React.FC = () => {
  const navigate = useNavigate();
  const { changePassword } = useAuth();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validation = usePasswordValidation(formData.newPassword);
  const passwordsMatch = formData.newPassword === formData.confirmPassword;
  const canSubmit = validation.isValid && passwordsMatch && formData.confirmPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Proszę spełnić wszystkie wymagania hasła');
      return;
    }

    setLoading(true);

    try {
      await changePassword(formData.newPassword, formData.confirmPassword);
      navigate('/dashboard');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Błąd zmiany hasła. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-change-container">
      <div className="password-change-card card">
        <div className="logo">Grover</div>
        <h1 className="password-change-title">Zmień hasło</h1>
        <p className="password-change-subtitle">
          Musisz zmienić swoje hasło jednorazowe na nowe, silne hasło.
        </p>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="password-change-form">
          <div className="form-group">
            <label htmlFor="newPassword" className="label">
              Nowe hasło
            </label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Wpisz nowe hasło"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="label">
              Potwierdź hasło
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Wpisz hasło ponownie"
              autoComplete="new-password"
              error={formData.confirmPassword.length > 0 && !passwordsMatch}
            />
            {formData.confirmPassword.length > 0 && !passwordsMatch && (
              <p className="error-message">Hasła nie są identyczne</p>
            )}
          </div>

          <PasswordRequirements
            password={formData.newPassword}
            confirmPassword={formData.confirmPassword}
          />

          <button
            type="submit"
            className="btn btn-primary password-change-button"
            disabled={loading || !canSubmit}
          >
            {loading ? 'Zmiana hasła...' : 'Zmień hasło'}
          </button>

          <div className="password-change-info">
            <p>
              Po zmianie hasła otrzymasz email z nowymi danymi logowania.
              Zachowaj je w bezpiecznym miejscu.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
