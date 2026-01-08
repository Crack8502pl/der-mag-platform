// src/components/brigades/BrigadeEditModal.tsx
// Modal for editing an existing brigade

import React, { useState } from 'react';
import brigadeService from '../../services/brigade.service';
import type { Brigade, UpdateBrigadeDto } from '../../types/brigade.types';

interface BrigadeEditModalProps {
  brigade: Brigade;
  onClose: () => void;
  onSuccess: () => void;
}

export const BrigadeEditModal: React.FC<BrigadeEditModalProps> = ({ brigade, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<UpdateBrigadeDto>({
    code: brigade.code,
    name: brigade.name,
    description: brigade.description || '',
    active: brigade.active,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      setError('Kod i nazwa są wymagane');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await brigadeService.update(brigade.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas aktualizacji brygady');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brigade-modal" onClick={onClose}>
      <div className="brigade-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="brigade-modal-header">
          <h2>✏️ Edytuj Brygadę</h2>
          <button className="brigade-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="brigade-modal-body">
            <div className="form-group">
              <label htmlFor="code">
                Kod (Numer rejestracyjny) <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="code"
                placeholder="np. WA12345"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">
                Nazwa <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="name"
                placeholder="np. Brygada Warszawska"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Opis</label>
              <textarea
                id="description"
                placeholder="Opcjonalny opis brygady..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="active">Aktywna</label>
              </div>
            </div>
          </div>

          <div className="brigade-modal-footer">
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
              {loading ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
