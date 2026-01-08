// src/components/users/DeactivateUserModal.tsx
// Modal for deactivating/blocking a user

import React, { useState } from 'react';
import axios from 'axios';
import { getApiBaseURL } from '../../utils/api-url';

const API_BASE_URL = getApiBaseURL();

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  active: boolean;
}

interface DeactivateUserModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeactivateUserModal: React.FC<DeactivateUserModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE_URL}/users/${user.id}/deactivate`,
        { reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd dezaktywacji użytkownika');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🚫 Dezaktywuj użytkownika</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="modal-body">
          <p style={{ marginBottom: '20px' }}>
            Dezaktywujesz użytkownika:{' '}
            <strong>
              {user.firstName} {user.lastName} (@{user.username})
            </strong>
          </p>

          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            ⚠️ Po dezaktywacji użytkownik:
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>NIE będzie mógł się zalogować</li>
              <li>Przy próbie logowania zobaczy komunikat "Twoje konto zostało zablokowane"</li>
              <li>Jego dane nie będą sprawdzane pod kątem unikalności</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="reason">Powód dezaktywacji (opcjonalnie)</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input"
                rows={4}
                placeholder="np. Pracownik odszedł z firmy"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Anuluj
              </button>
              <button type="submit" className="btn btn-danger" disabled={loading}>
                {loading ? 'Dezaktywowanie...' : 'Dezaktywuj użytkownika'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
