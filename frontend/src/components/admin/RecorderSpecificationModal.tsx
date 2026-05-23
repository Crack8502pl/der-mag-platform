// src/components/admin/RecorderSpecificationModal.tsx
// Modal for creating/editing recorder specifications

import React, { useEffect, useRef, useState } from 'react';
import recorderSpecificationService from '../../services/recorderSpecification.service';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { RecorderSpecification, CreateRecorderSpecificationDto } from '../../services/recorderSpecification.service';
import type { WarehouseStock } from '../../types/warehouseStock.types';
import '../../styles/grover-theme.css';

interface RecorderSpecificationModalProps {
  recorder?: RecorderSpecification;
  warehouseItems: WarehouseStock[];
  onClose: () => void;
  onSuccess: () => void;
}

type WarehouseItemLabelSource = Pick<WarehouseStock, 'catalogNumber' | 'materialName'> | null | undefined;

const formatWarehouseItemLabel = (item?: WarehouseItemLabelSource) =>
  item ? `[${item.catalogNumber}] ${item.materialName}` : '';

export const RecorderSpecificationModal: React.FC<RecorderSpecificationModalProps> = (props) => {
  const { recorder, onClose, onSuccess } = props;
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

  const [productSearch, setProductSearch] = useState(formatWarehouseItemLabel(recorder?.warehouseStock));
  const [productSearchResults, setProductSearchResults] = useState<WarehouseStock[]>([]);
  const [selectedProductLabel, setSelectedProductLabel] = useState(formatWarehouseItemLabel(recorder?.warehouseStock));
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  const [extensionSearch, setExtensionSearch] = useState(formatWarehouseItemLabel(recorder?.extensionWarehouseStock));
  const [extensionSearchResults, setExtensionSearchResults] = useState<WarehouseStock[]>([]);
  const [selectedExtensionLabel, setSelectedExtensionLabel] = useState(formatWarehouseItemLabel(recorder?.extensionWarehouseStock));
  const [extensionDropdownOpen, setExtensionDropdownOpen] = useState(false);
  const productSearchRequestRef = useRef(0);
  const extensionSearchRequestRef = useRef(0);

  // Delay prevents the dropdown from closing before onMouseDown fires on an item
  const DROPDOWN_CLOSE_DELAY = 200;

  const searchWarehouseItems = async (
    term: string,
    requestRef: React.MutableRefObject<number>,
    setResults: React.Dispatch<React.SetStateAction<WarehouseStock[]>>,
    errorContext: string
  ) => {
    const requestId = ++requestRef.current;

    try {
      const response = await warehouseStockService.getAll({ search: term }, 1, 50);

      if (requestRef.current === requestId) {
        setResults(response.data || []);
      }
    } catch (err) {
      if (requestRef.current === requestId) {
        setResults([]);
      }
      console.error(errorContext, err);
    }
  };

  useEffect(() => {
    if (!productDropdownOpen) return;

    const term = productSearch.trim();
    if (!term || term === selectedProductLabel) {
      setProductSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void searchWarehouseItems(term, productSearchRequestRef, setProductSearchResults, 'Błąd wyszukiwania produktu:');
    }, 300);

    return () => clearTimeout(timeout);
  }, [productDropdownOpen, productSearch, selectedProductLabel]);

  useEffect(() => {
    if (!extensionDropdownOpen) return;

    const term = extensionSearch.trim();
    if (!term || term === selectedExtensionLabel) {
      setExtensionSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      void searchWarehouseItems(term, extensionSearchRequestRef, setExtensionSearchResults, 'Błąd wyszukiwania rozszerzenia:');
    }, 300);

    return () => clearTimeout(timeout);
  }, [extensionDropdownOpen, extensionSearch, selectedExtensionLabel]);

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
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                style={inputStyle}
                placeholder="Wyszukaj po nazwie lub numerze katalogowym..."
                value={productSearch}
                onChange={e => {
                  const value = e.target.value;
                  setProductSearch(value);
                  setProductDropdownOpen(true);
                  if (!value) {
                    setWarehouseStockId('');
                    setSelectedProductLabel('');
                    setProductSearchResults([]);
                  } else if (value !== selectedProductLabel) {
                    setWarehouseStockId('');
                  }
                }}
                onFocus={() => setProductDropdownOpen(true)}
                onBlur={() => setTimeout(() => setProductDropdownOpen(false), DROPDOWN_CLOSE_DELAY)}
                autoComplete="off"
              />
              {productDropdownOpen && productSearchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', marginTop: '4px',
                  maxHeight: '220px', overflowY: 'auto', zIndex: 1001
                }}>
                  {productSearchResults.map(item => (
                    <div
                      key={item.id}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--text-primary)',
                        background: item.id === warehouseStockId ? 'var(--bg-hover)' : 'transparent'
                      }}
                      onMouseDown={() => {
                        const label = formatWarehouseItemLabel(item);
                        setWarehouseStockId(item.id);
                        setProductSearch(label);
                        setSelectedProductLabel(label);
                        setProductSearchResults([]);
                        setProductDropdownOpen(false);
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>[{item.catalogNumber}]</span>{' '}
                      {item.materialName}
                    </div>
                  ))}
                </div>
              )}
              <input type="hidden" value={warehouseStockId} />
            </div>
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
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="Wyszukaj po nazwie lub numerze katalogowym..."
                  value={extensionSearch}
                  onChange={e => {
                    const value = e.target.value;
                    setExtensionSearch(value);
                    setExtensionDropdownOpen(true);
                    if (!value) {
                      setExtensionWarehouseStockId('');
                      setSelectedExtensionLabel('');
                      setExtensionSearchResults([]);
                    } else if (value !== selectedExtensionLabel) {
                      setExtensionWarehouseStockId('');
                    }
                  }}
                  onFocus={() => setExtensionDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setExtensionDropdownOpen(false), DROPDOWN_CLOSE_DELAY)}
                  autoComplete="off"
                />
                {extensionDropdownOpen && extensionSearchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', marginTop: '4px',
                    maxHeight: '220px', overflowY: 'auto', zIndex: 1001
                  }}>
                    {extensionSearchResults.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                          color: 'var(--text-primary)',
                          background: item.id === extensionWarehouseStockId ? 'var(--bg-hover)' : 'transparent'
                        }}
                        onMouseDown={() => {
                          const label = formatWarehouseItemLabel(item);
                          setExtensionWarehouseStockId(item.id);
                          setExtensionSearch(label);
                          setSelectedExtensionLabel(label);
                          setExtensionSearchResults([]);
                          setExtensionDropdownOpen(false);
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>[{item.catalogNumber}]</span>{' '}
                        {item.materialName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
