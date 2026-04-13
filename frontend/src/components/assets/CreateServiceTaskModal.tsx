// src/components/assets/CreateServiceTaskModal.tsx
// Modal for creating service tasks linked to assets

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { AssetDetails } from '../../services/asset.service';

interface Props {
  asset: AssetDetails;
  onClose: () => void;
  onSuccess: () => void;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateServiceTaskDto {
  taskRole: 'warranty_service' | 'repair' | 'maintenance' | 'decommission';
  name: string;
  description?: string;
  scheduledDate?: string;
  priority: number;
  assigneeId?: number;
}

export const CreateServiceTaskModal: React.FC<Props> = ({ asset, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateServiceTaskDto>({
    taskRole: 'warranty_service',
    name: '',
    description: '',
    scheduledDate: '',
    priority: 2,
    assigneeId: undefined,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadUsers();
    const defaultName = `Serwis ${asset.assetType} - ${asset.name}`;
    setFormData(prev => ({ ...prev, name: defaultName }));
  }, [asset]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.data.data || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Nazwa zadania jest wymagana');
      return;
    }

    if (!formData.taskRole) {
      setError('Typ zadania jest wymagany');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.post(`/assets/${asset.id}/tasks`, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas tworzenia zadania');
      console.error('Error creating service task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateServiceTaskDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 Nowe zadanie dla obiektu</h2>
          <button className="modal-close" onClick={onClose} aria-label="Zamknij">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-form">
            {error && <div className="alert alert-error">{error}</div>}

            {/* Asset Info */}
            <div className="asset-info-bar">
              <div className="asset-info-label">Obiekt:</div>
              <div className="asset-info-value">
                <strong>{asset.assetNumber}</strong> - {asset.name}
              </div>
            </div>

            {/* Task Role */}
            <div className="form-group">
              <label>
                Typ zadania <span className="required">*</span>
              </label>
              <select
                value={formData.taskRole}
                onChange={(e) => handleChange('taskRole', e.target.value)}
                required
              >
                <option value="warranty_service">🛡️ Serwis gwarancyjny</option>
                <option value="repair">🔧 Naprawa</option>
                <option value="maintenance">⚙️ Konserwacja</option>
                <option value="decommission">🗑️ Demontaż</option>
              </select>
            </div>

            {/* Task Name */}
            <div className="form-group">
              <label>
                Nazwa zadania <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Np. Serwis gwarancyjny - 12 miesięcy"
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Opis (opcjonalnie)</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Szczegółowy opis zadania..."
                rows={4}
              />
            </div>

            {/* Scheduled Date */}
            <div className="form-group">
              <label>Data planowana</label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleChange('scheduledDate', e.target.value)}
              />
            </div>

            {/* Priority */}
            <div className="form-group">
              <label>Priorytet</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', Number(e.target.value))}
              >
                <option value={0}>🔶🔶 Bardzo niski</option>
                <option value={1}>🔶 Niski</option>
                <option value={2}>⚪ Normalny</option>
                <option value={3}>⭐ Wysoki</option>
                <option value={4}>⭐⭐ Bardzo Wysoki</option>
                <option value={5}>🌟🌟🌟 Krytyczny</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="form-group">
              <label>Przypisz do</label>
              {loadingUsers ? (
                <div className="loading-inline">Ładowanie użytkowników...</div>
              ) : (
                <select
                  value={formData.assigneeId || ''}
                  onChange={(e) => handleChange('assigneeId', e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Nie przypisano</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Summary Info */}
            <div className="form-info">
              <small>
                ℹ️ Zadanie zostanie automatycznie powiązane z obiektem {asset.assetNumber}{' '}
                i kontraktem {asset.contract?.contractNumber || 'N/A'}.
              </small>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Tworzenie...' : 'Utwórz zadanie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
