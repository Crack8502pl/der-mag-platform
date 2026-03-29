// src/components/admin/RecorderSpecificationModal.tsx
// Modal for creating/editing recorder specifications

import React, { useState } from 'react';
import recorderSpecificationService from '../../services/recorderSpecification.service';
import type { RecorderSpecification, CreateRecorderSpecificationDto } from '../../services/recorderSpecification.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import '../../styles/grover-theme.css';

interface RecorderSpecificationModalProps {
  recorder?: RecorderSpecification;
  warehouseItems: WarehouseStock[];
  onClose: () => void;
  onSuccess: () => void;
}

export const RecorderSpecificationModal: React.FC<RecorderSpecificationModalProps> = ({
  recorder,
  warehouseItems,
  onClose,
  onSuccess
}) => {
  const isEdit = !!recorder;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [warehouseStockId, setWarehouseStockId] = useState<number | ''>(recorder?.warehouseStockId || '');
  const [modelName, setModelName] = useState(recorder?.modelName || '');
  const [minCameras, setMinCameras] = useState<number>(recorder?.minCameras ?? 1);
  const [maxCameras, setMaxCameras] = useState<number>(recorder?.maxCameras ?? 4);
  const [diskSlots, setDiskSlots] = useState<number>(recorder?.diskSlots ?? 1);
  const [maxStorageTb, setMaxStorageTb] = useState<number | ''>(recorder?.maxStorageTb ?? '');
  const [supportedDiskCapacities, setSupportedDiskCapacities] = useState<string>(
    (recorder?.supportedDiskCapacities || [6, 8, 10, 12, 14, 18]).join(', ')
  );
  const [requiresExtension, setRequiresExtension] = useState(recorder?.requiresExtension ?? false);
  const [extensionWarehouseStockId, setExtensionWarehouseStockId] = useState<number | ''>(
    recorder?.extensionWarehouseStockId ?? ''
  );
  const [isActive, setIsActive] = useState(recorder?.isActive ?? true);
  const [notes, setNotes] = useState(recorder?.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!warehouseStockId || !modelName || !maxCameras) {
      setError('Wypełnij wymagane pola: produkt, model, maksymalna liczba kamer');
      return;
    }

    const capacities = supportedDiskCapacities
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));

    const payload: CreateRecorderSpecificationDto = {
      warehouseStockId: Number(warehouseStockId),
      modelName: modelName.trim(),
      minCameras,
      maxCameras,
      diskSlots,
      maxStorageTb: maxStorageTb !== '' ? Number(maxStorageTb) : undefined,
      supportedDiskCapacities: capacities,
      requiresExtension,
      extensionWarehouseStockId: extensionWarehouseStockId !== '' ? Number(extensionWarehouseStockId) : undefined,
      isActive,
      notes: notes.trim() || undefined
    };

    setLoading(true);
    try {
      if (isEdit && recorder) {
        await recorderSpecificationService.update(recorder.id, payload);
      } else {
        await recorderSpecificationService.create(payload);
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
        style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
            🖥️ {isEdit ? 'Edytuj specyfikację rejestratora' : 'Nowa specyfikacja rejestratora'}
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

          <div style={fieldStyle}>
            <label style={labelStyle}>Nazwa modelu *</label>
            <input
              type="text"
              style={inputStyle}
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              placeholder="np. WJ-NX310"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Min. kamer *</label>
              <input type="number" style={inputStyle} value={minCameras} min={1} onChange={e => setMinCameras(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Max. kamer *</label>
              <input type="number" style={inputStyle} value={maxCameras} min={1} onChange={e => setMaxCameras(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Sloty dysków *</label>
              <input type="number" style={inputStyle} value={diskSlots} min={1} onChange={e => setDiskSlots(Number(e.target.value))} />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Max pojemność (TB)</label>
            <input
              type="number"
              step="0.01"
              style={inputStyle}
              value={maxStorageTb}
              onChange={e => setMaxStorageTb(e.target.value ? Number(e.target.value) : '')}
              placeholder="np. 48"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Obsługiwane pojemności dysków (TB, rozdzielone przecinkami)</label>
            <input
              type="text"
              style={inputStyle}
              value={supportedDiskCapacities}
              onChange={e => setSupportedDiskCapacities(e.target.value)}
              placeholder="6, 8, 10, 12, 14, 18"
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={requiresExtension} onChange={e => setRequiresExtension(e.target.checked)} />
              Wymaga rozszerzenia
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              Aktywny
            </label>
          </div>

          {requiresExtension && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Produkt rozszerzenia</label>
              <select
                style={inputStyle}
                value={extensionWarehouseStockId}
                onChange={e => setExtensionWarehouseStockId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">-- Brak --</option>
                {warehouseItems.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.catalogNumber}] {item.materialName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Notatki</label>
            <textarea
              style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
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

export default RecorderSpecificationModal;
