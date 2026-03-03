// src/components/users/DeleteUserModal.tsx
// Modal for permanently (soft) deleting a user with a required reason

import React, { useState } from 'react';
import api from '../../services/api';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
}

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Powód usunięcia jest wymagany');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.delete(`/users/${user.id}`, { data: { reason } });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania użytkownika');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🗑️ Usuń użytkownika</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="modal-body">
          <p style={{ marginBottom: '20px' }}>
            Usuwasz użytkownika:{' '}
            <strong>
              {user.firstName} {user.lastName} (@{user.username})
            </strong>
          </p>

          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            ⚠️ Po usunięciu użytkownik:
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>NIE będzie mógł się zalogować</li>
              <li>Będzie nadal widoczny na liście ze statusem "Usunięty"</li>
              <li>Email, login i kod pracownika będą mogły być ponownie użyte</li>
              <li>Operacja jest nieodwracalna</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label htmlFor="reason">Powód usunięcia <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input"
                rows={4}
                placeholder="np. Pracownik odszedł z firmy"
                required
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Anuluj
              </button>
              <button type="submit" className="btn btn-danger" disabled={loading || !reason.trim()}>
                {loading ? 'Usuwanie...' : 'Usuń użytkownika'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
