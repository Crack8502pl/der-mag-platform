import React, { useState } from 'react';
import type { AssignIPDto, DeviceCategory, NetworkAllocation } from '../../services/network.service';
import './NetworkAssignIPForm.css';

interface Props {
  allocations: NetworkAllocation[];
  defaultAllocationId?: number;
  onSave: (data: AssignIPDto) => Promise<void>;
  onCancel: () => void;
}

const DEVICE_CATEGORIES: DeviceCategory[] = [
  'CAMERA', 'SWITCH', 'ROUTER', 'NVR', 'SERVER', 'IOT', 'ACCESS_POINT', 'OTHER',
];

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  CAMERA: 'Kamera',
  SWITCH: 'Switch',
  ROUTER: 'Router',
  NVR: 'NVR',
  SERVER: 'Serwer',
  IOT: 'IoT',
  ACCESS_POINT: 'Access Point',
  OTHER: 'Inne',
};

export const NetworkAssignIPForm: React.FC<Props> = ({
  allocations,
  defaultAllocationId,
  onSave,
  onCancel,
}) => {
  const [allocationId, setAllocationId] = useState<number>(
    defaultAllocationId ?? (allocations[0]?.id ?? 0)
  );
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>('CAMERA');
  const [deviceType, setDeviceType] = useState('');
  const [hostname, setHostname] = useState('');
  const [description, setDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!allocationId) errs.allocationId = 'Wybierz alokację';
    if (!deviceType.trim()) errs.deviceType = 'Typ urządzenia jest wymagany';
    if (!hostname.trim()) errs.hostname = 'Hostname jest wymagany';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        allocationId,
        deviceCategory,
        deviceType: deviceType.trim(),
        hostname: hostname.trim(),
        description: description.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="assign-form-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="assign-form-modal">
        <h2>Przydziel adres IP</h2>
        <form onSubmit={handleSubmit}>
          <div className="assign-form-field">
            <label>Alokacja sieciowa *</label>
            <select
              value={allocationId}
              onChange={e => setAllocationId(Number(e.target.value))}
            >
              {allocations.map(a => (
                <option key={a.id} value={a.id}>
                  {a.subsystem?.subsystemNumber ?? `Alokacja #${a.id}`} – {a.allocatedRange}
                </option>
              ))}
            </select>
            {errors.allocationId && <div className="assign-form-error">{errors.allocationId}</div>}
          </div>

          <div className="assign-form-field">
            <label>Kategoria urządzenia *</label>
            <select
              value={deviceCategory}
              onChange={e => setDeviceCategory(e.target.value as DeviceCategory)}
            >
              {DEVICE_CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div className="assign-form-field">
            <label>Typ urządzenia *</label>
            <input
              type="text"
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
              placeholder="np. Axis P3375-V"
            />
            {errors.deviceType && <div className="assign-form-error">{errors.deviceType}</div>}
          </div>

          <div className="assign-form-field">
            <label>Hostname *</label>
            <input
              type="text"
              value={hostname}
              onChange={e => setHostname(e.target.value)}
              placeholder="np. cam-01.network.local"
              style={{ fontFamily: 'monospace' }}
            />
            {errors.hostname && <div className="assign-form-error">{errors.hostname}</div>}
          </div>

          <div className="assign-form-field">
            <label>Numer seryjny</label>
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="Opcjonalny numer seryjny"
            />
          </div>

          <div className="assign-form-field">
            <label>Opis</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Opcjonalny opis..."
            />
          </div>

          <div className="assign-form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Przydzielanie...' : 'Przydziel IP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
