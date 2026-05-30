import React, { useEffect, useState } from 'react';
import type { CreateDeviceDto, DeviceDto } from '../../services/deviceService';

interface DeviceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeviceDto) => Promise<void>;
  initialDevice?: DeviceDto | null;
}

const DEFAULT_FORM: CreateDeviceDto = {
  serialNumber: '',
  name: '',
  model: '',
  manufacturer: '',
  deviceType: '',
  status: 'active',
  location: '',
  notes: '',
};

export const DeviceFormModal: React.FC<DeviceFormModalProps> = ({ isOpen, onClose, onSubmit, initialDevice }) => {
  const [form, setForm] = useState<CreateDeviceDto>(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialDevice) {
      setForm({
        serialNumber: initialDevice.serialNumber,
        name: initialDevice.name,
        model: initialDevice.model || '',
        manufacturer: initialDevice.manufacturer || '',
        deviceType: initialDevice.deviceType || '',
        status: initialDevice.status,
        location: initialDevice.location || '',
        notes: initialDevice.notes || '',
      });
      return;
    }

    setForm(DEFAULT_FORM);
  }, [initialDevice, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (key: keyof CreateDeviceDto, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.serialNumber.trim()) {
      setError('Numer seryjny jest wymagany');
      return;
    }

    if (!form.name.trim()) {
      setError('Nazwa jest wymagana');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...form,
        serialNumber: form.serialNumber.trim(),
        name: form.name.trim(),
      });
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Nie udało się zapisać urządzenia';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="card" style={{ width: 'min(620px, 95vw)', padding: '1rem' }}>
        <h3>{initialDevice ? 'Edytuj urządzenie' : 'Dodaj urządzenie'}</h3>
        {error && <p className="status-text" style={{ color: 'var(--danger)' }}>❌ {error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <label>
              Numer seryjny *
              <input value={form.serialNumber} onChange={e => handleChange('serialNumber', e.target.value)} required />
            </label>
            <label>
              Nazwa *
              <input value={form.name} onChange={e => handleChange('name', e.target.value)} required />
            </label>
            <label>
              Model
              <input value={form.model || ''} onChange={e => handleChange('model', e.target.value)} />
            </label>
            <label>
              Producent
              <input value={form.manufacturer || ''} onChange={e => handleChange('manufacturer', e.target.value)} />
            </label>
            <label>
              Typ urządzenia
              <input value={form.deviceType || ''} onChange={e => handleChange('deviceType', e.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={e => handleChange('status', e.target.value)}>
                <option value="active">Aktywne</option>
                <option value="maintenance">Serwis</option>
                <option value="inactive">Nieaktywne</option>
                <option value="decommissioned">Wycofane</option>
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Lokalizacja
              <input value={form.location || ''} onChange={e => handleChange('location', e.target.value)} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Notatki
              <textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={3} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Zapisywanie...' : 'Zapisz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
