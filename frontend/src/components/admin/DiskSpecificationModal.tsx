// src/components/admin/DiskSpecificationModal.tsx
// Modal for creating/editing disk specifications

import React, { useState } from 'react';
import diskSpecificationService from '../../services/diskSpecification.service';
import type { DiskSpecification, CreateDiskSpecificationDto, DiskType } from '../../services/diskSpecification.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import type { RecorderSpecification } from '../../services/recorderSpecification.service';
import '../../styles/grover-theme.css';

interface DiskSpecificationModalProps {
  disk?: DiskSpecification;
  warehouseItems: WarehouseStock[];
  recorders: RecorderSpecification[];
  onClose: () => void;
  onSuccess: () => void;
}

export const DiskSpecificationModal: React.FC<DiskSpecificationModalProps> = ({
  disk,
  warehouseItems,
  recorders,
  onClose,
  onSuccess
}) => {
  const isEdit = !!disk;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [warehouseStockId, setWarehouseStockId] = useState<number | ''>(disk?.warehouseStockId || '');
  const [capacityTb, setCapacityTb] = useState<number | ''>(disk?.capacityTb ?? '');
  const [diskType, setDiskType] = useState<DiskType>(disk?.diskType ?? 'HDD_SURVEILLANCE');
  const [compatibleRecorderIds, setCompatibleRecorderIds] = useState<number[]>(
    disk?.compatibleRecorderIds || []
  );
  const [isActive, setIsActive] = useState(disk?.isActive ?? true);
  const [priority, setPriority] = useState<number>(disk?.priority ?? 10);

  const toggleRecorder = (id: number) => {
    setCompatibleRecorderIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!warehouseStockId || capacityTb === '') {
      setError('Wypełnij wymagane pola: produkt i pojemność');
      return;
    }

    const payload: CreateDiskSpecificationDto = {
      warehouseStockId: Number(warehouseStockId),
      capacityTb: Number(capacityTb),
      diskType,
      compatibleRecorderIds,
      isActive,
      priority
    };

    setLoading(true);
    try {
      if (isEdit && disk) {
        await diskSpecificationService.update(disk.id, payload);
      } else {
        await diskSpecificationService.create(payload);
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setError(error.response?.data?.message || error.message || 'Błąd podczas zapisywania');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--background-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500
  };

  const fieldStyle: React.CSSProperties = { marginBottom: '16px' };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
            💾 {isEdit ? 'Edytuj specyfikację dysku' : 'Nowa specyfikacja dysku'}
          </h2>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', color: '#ef4444', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Produkt (Warehouse Stock) *</label>
            <select
              style={inputStyle}
              value={warehouseStockId}
              onChange={e => setWarehouseStockId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">-- Wybierz produkt --</option>
              {warehouseItems.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.catalogNumber}] {item.materialName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Pojemność (TB) *</label>
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                value={capacityTb}
                onChange={e => setCapacityTb(e.target.value ? Number(e.target.value) : '')}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Typ dysku</label>
              <select
                style={inputStyle}
                value={diskType}
                onChange={e => setDiskType(e.target.value as DiskType)}
              >
                <option value="HDD_SURVEILLANCE">HDD Surveillance</option>
                <option value="HDD_ENTERPRISE">HDD Enterprise</option>
                <option value="SSD">SSD</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priorytet</label>
              <input
                type="number"
                style={inputStyle}
                value={priority}
                min={1}
                onChange={e => setPriority(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              Kompatybilne rejestratory
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                (puste = kompatybilny ze wszystkimi)
              </span>
            </label>
            <div style={{
              border: '1px solid var(--border-color)', borderRadius: '6px',
              padding: '10px', maxHeight: '160px', overflowY: 'auto',
              background: 'var(--background-secondary)'
            }}>
              {recorders.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Brak rejestratorów</div>
              ) : (
                recorders.map(r => (
                  <label key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 0', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px'
                  }}>
                    <input
                      type="checkbox"
                      checked={compatibleRecorderIds.includes(r.id)}
                      onChange={() => toggleRecorder(r.id)}
                    />
                    {r.modelName} ({r.minCameras}–{r.maxCameras} kamer)
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Aktywny
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Zapisywanie...' : (isEdit ? 'Zapisz zmiany' : 'Utwórz')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiskSpecificationModal;
