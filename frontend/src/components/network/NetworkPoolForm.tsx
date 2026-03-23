import React, { useState, useEffect } from 'react';
import type { NetworkPool, CreatePoolDto, UpdatePoolDto } from '../../services/network.service';
import './NetworkPoolForm.css';

interface Props {
  pool?: NetworkPool | null;
  onSave: (data: CreatePoolDto | UpdatePoolDto) => Promise<void>;
  onCancel: () => void;
}

export const NetworkPoolForm: React.FC<Props> = ({ pool, onSave, onCancel }) => {
  const [name, setName] = useState(pool?.name ?? '');
  const [cidrRange, setCidrRange] = useState(pool?.cidrRange ?? '');
  const [priority, setPriority] = useState<number>(pool?.priority ?? 1);
  const [description, setDescription] = useState(pool?.description ?? '');
  const [isActive, setIsActive] = useState(pool?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (pool) {
      setName(pool.name);
      setCidrRange(pool.cidrRange);
      setPriority(pool.priority);
      setDescription(pool.description ?? '');
      setIsActive(pool.isActive);
    }
  }, [pool]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nazwa jest wymagana';
    if (!cidrRange.trim()) {
      errs.cidrRange = 'Zakres CIDR jest wymagany';
    } else if (!/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(cidrRange.trim())) {
      errs.cidrRange = 'Nieprawidłowy format CIDR (np. 172.16.0.0/12)';
    }
    if (!priority || priority < 1) errs.priority = 'Priorytet musi być >= 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const data: CreatePoolDto | UpdatePoolDto = {
        name: name.trim(),
        cidrRange: cidrRange.trim(),
        priority,
        description: description.trim() || undefined,
        ...(pool ? { isActive } : {}),
      };
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pool-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="pool-form-modal">
        <h2>{pool ? 'Edytuj pulę IP' : 'Nowa pula IP'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="pool-form-field">
            <label>Nazwa *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. Pula główna SMOKIP"
            />
            {errors.name && <div className="pool-form-error">{errors.name}</div>}
          </div>

          <div className="pool-form-field">
            <label>Zakres CIDR *</label>
            <input
              type="text"
              value={cidrRange}
              onChange={e => setCidrRange(e.target.value)}
              placeholder="np. 172.16.0.0/12"
              style={{ fontFamily: 'monospace' }}
            />
            {errors.cidrRange && <div className="pool-form-error">{errors.cidrRange}</div>}
          </div>

          <div className="pool-form-field">
            <label>Priorytet *</label>
            <select value={priority} onChange={e => setPriority(Number(e.target.value))}>
              <option value={1}>1 – Główna</option>
              <option value={2}>2 – Backup</option>
              <option value={3}>3 – Specjalna</option>
            </select>
            {errors.priority && <div className="pool-form-error">{errors.priority}</div>}
          </div>

          <div className="pool-form-field">
            <label>Opis</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Opcjonalny opis puli..."
            />
          </div>

          {pool && (
            <div className="pool-form-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Aktywna
              </label>
            </div>
          )}

          <div className="pool-form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Zapisywanie...' : (pool ? 'Zapisz zmiany' : 'Utwórz pulę')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
