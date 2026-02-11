// src/components/users/ResetPasswordModal.tsx
// Modal for resetting user password

import React, { useState } from 'react';
import api from '../../services/api';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
}

interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    setLoading(true);

    try {
      await api.post(`/users/${user.id}/reset-password`, { password });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd resetowania hasła');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 Resetuj hasło</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="modal-body">
          <p style={{ marginBottom: '20px' }}>
            Resetujesz hasło dla użytkownika:{' '}
            <strong>
              {user.firstName} {user.lastName} (@{user.username})
            </strong>
          </p>

          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            ℹ️ Użytkownik otrzyma email z nowym hasłem i zostanie poproszony o jego zmianę przy następnym logowaniu.
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="password">
                Nowe hasło <span className="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                minLength={8}
                placeholder="Minimum 8 znaków"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Potwierdź hasło <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
                minLength={8}
                placeholder="Powtórz hasło"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Anuluj
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Resetowanie...' : 'Resetuj hasło'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
