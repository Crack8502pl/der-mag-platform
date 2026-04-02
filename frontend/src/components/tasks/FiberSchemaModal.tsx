// src/components/tasks/FiberSchemaModal.tsx
// Modal for configuring and calculating fiber optic transmission schema

import React, { useState, useEffect } from 'react';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';
import type {
  FiberConnection,
  FiberEndpoint,
  FiberTransmissionConfig,
} from '../../types/fiber.types';
import {
  estimateDistance,
  fibersForInsert,
  sumFibers,
  totalLengthKm,
} from '../../services/fiberCalculator.service';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/grover-theme.css';
import './FiberSchemaModal.css';

interface Props {
  /** The LCS task that anchors the fiber schema */
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

const ENDPOINT_TYPES: FiberEndpoint['typ'][] = ['LCS', 'NASTAWNIA', 'PRZEJAZD', 'SKP'];

const newEndpoint = (typ: FiberEndpoint['typ'] = 'PRZEJAZD'): FiberEndpoint => ({
  id: Date.now(),
  nazwa: '',
  typ,
});

const newConnection = (): FiberConnection => ({
  id: Date.now(),
  obiektStartowy: newEndpoint('LCS'),
  obiektKoncowy: newEndpoint('NASTAWNIA'),
  odleglosc: 0,
  typWkladki: 'DUPLEX',
  iloscWlokien: 2,
});

const endpointLabel = (typ: FiberEndpoint['typ']): string => {
  const map: Record<FiberEndpoint['typ'], string> = {
    LCS: '🏢 LCS',
    NASTAWNIA: '🏗️ Nastawnia',
    PRZEJAZD: '🚦 Przejazd',
    SKP: '🔧 SKP',
  };
  return map[typ];
};

export const FiberSchemaModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('tasks', 'update');

  const [connections, setConnections] = useState<FiberConnection[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved: FiberTransmissionConfig | undefined =
      task.metadata?.configParams?.fiberSchema;
    if (saved?.schematLacznosci?.length) {
      setConnections(saved.schematLacznosci);
    }
  }, [task.metadata]);

  /* ---------------------------------------------------------------- */
  /* Recalculate distances whenever connections change                  */
  /* ---------------------------------------------------------------- */
  const recalcConnection = (conn: FiberConnection): FiberConnection => {
    const odleglosc = estimateDistance(conn.obiektStartowy, conn.obiektKoncowy);
    const iloscWlokien = fibersForInsert(conn.typWkladki);
    return { ...conn, odleglosc, iloscWlokien };
  };

  const updateConnection = (idx: number, patch: Partial<FiberConnection>) => {
    setConnections(prev => {
      const updated = [...prev];
      const merged = { ...updated[idx], ...patch };
      updated[idx] = recalcConnection(merged);
      return updated;
    });
  };

  const updateEndpoint = (
    connIdx: number,
    side: 'obiektStartowy' | 'obiektKoncowy',
    patch: Partial<FiberEndpoint>
  ) => {
    setConnections(prev => {
      const updated = [...prev];
      const conn = { ...updated[connIdx] };
      conn[side] = { ...conn[side], ...patch };
      updated[connIdx] = recalcConnection(conn);
      return updated;
    });
  };

  const addConnection = () => {
    setConnections(prev => [...prev, newConnection()]);
  };

  const removeConnection = (idx: number) => {
    setConnections(prev => prev.filter((_, i) => i !== idx));
  };

  /* ---------------------------------------------------------------- */
  /* Summary calculations                                               */
  /* ---------------------------------------------------------------- */
  const totalFibers = sumFibers(connections);
  const totalKm = totalLengthKm(connections);

  const buildConfig = (): FiberTransmissionConfig => ({
    schematLacznosci: connections,
    obliczenia: {
      calkowitaDlugoscKm: Math.round(totalKm * 100) / 100,
      wymaganychWlokien: totalFibers,
      typPolaczenia: connections.every(c => c.typWkladki === 'WDM') ? 'WDM' : 'DUPLEX',
    },
  });

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError('');
      await taskService.update(task.taskNumber, {
        metadata: {
          ...task.metadata,
          configParams: {
            ...(task.metadata?.configParams || {}),
            fiberSchema: buildConfig(),
          },
        },
        status: 'configured',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zapisywania schematu światłowodowego');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>🔗 Schemat transmisji światłowodowej</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          {!canEdit && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              🔒 Tryb podglądu – brak uprawnień do edycji
            </div>
          )}

          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            Zdefiniuj połączenia między obiektami. Odległości są automatycznie obliczane z kilometrażu
            lub współrzędnych GPS. Wkładka <strong>DUPLEX</strong> wymaga 2 włókien, <strong>WDM</strong> – 1 włókna.
          </p>

          {/* Connection list */}
          <div className="fiber-connection-list">
            {connections.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                Brak zdefiniowanych połączeń. Kliknij „Dodaj połączenie" aby dodać pierwsze.
              </div>
            )}
            {connections.map((conn, idx) => (
              <ConnectionRow
                key={conn.id}
                conn={conn}
                idx={idx}
                readOnly={!canEdit}
                onUpdateConnection={updateConnection}
                onUpdateEndpoint={updateEndpoint}
                onRemove={removeConnection}
              />
            ))}
          </div>

          {canEdit && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={addConnection}
              style={{ marginBottom: '16px' }}
            >
              ➕ Dodaj połączenie
            </button>
          )}

          {/* Summary */}
          {connections.length > 0 && (
            <div className="fiber-summary">
              <h4>📊 Podsumowanie</h4>
              <div className="fiber-summary-grid">
                <div className="fiber-summary-item">
                  <div className="fiber-summary-value">{totalKm.toFixed(2)}</div>
                  <div className="fiber-summary-label">km światłowodu łącznie</div>
                </div>
                <div className="fiber-summary-item">
                  <div className="fiber-summary-value">{connections.length}</div>
                  <div className="fiber-summary-label">połączeń</div>
                </div>
                <div className="fiber-summary-item">
                  <div className="fiber-summary-value">{totalFibers}</div>
                  <div className="fiber-summary-label">włókien wymaganych</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Zamknij
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisywanie...' : '💾 Zapisz schemat'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ConnectionRow sub-component                                           */
/* ------------------------------------------------------------------ */

interface ConnectionRowProps {
  conn: FiberConnection;
  idx: number;
  readOnly: boolean;
  onUpdateConnection: (idx: number, patch: Partial<FiberConnection>) => void;
  onUpdateEndpoint: (
    connIdx: number,
    side: 'obiektStartowy' | 'obiektKoncowy',
    patch: Partial<FiberEndpoint>
  ) => void;
  onRemove: (idx: number) => void;
}

const ConnectionRow: React.FC<ConnectionRowProps> = ({
  conn,
  idx,
  readOnly,
  onUpdateConnection,
  onUpdateEndpoint,
  onRemove,
}) => {
  const distanceM = Math.round(conn.odleglosc);
  const distanceKm = (conn.odleglosc / 1000).toFixed(2);

  return (
    <div className="fiber-connection-item">
      <div className="fiber-connection-header">
        <span className="fiber-connection-label">Połączenie {idx + 1}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            className={`fiber-type-badge ${conn.typWkladki === 'DUPLEX' ? 'fiber-type-duplex' : 'fiber-type-wdm'}`}
          >
            {conn.typWkladki} · {conn.iloscWlokien} włókna
          </span>
          {!readOnly && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '3px 8px', fontSize: '12px' }}
              onClick={() => onRemove(idx)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Endpoints */}
      <div className="fiber-endpoints">
        <EndpointForm
          endpoint={conn.obiektStartowy}
          label="Obiekt startowy"
          readOnly={readOnly}
          onChange={(patch) => onUpdateEndpoint(idx, 'obiektStartowy', patch)}
        />
        <div className="fiber-arrow">→</div>
        <EndpointForm
          endpoint={conn.obiektKoncowy}
          label="Obiekt końcowy"
          readOnly={readOnly}
          onChange={(patch) => onUpdateEndpoint(idx, 'obiektKoncowy', patch)}
        />
      </div>

      {/* Meta fields: insert type + distance */}
      <div className="fiber-meta-row">
        <div className="form-group">
          <label style={{ fontSize: '12px' }}>Typ wkładki</label>
          <select
            value={conn.typWkladki}
            disabled={readOnly}
            onChange={(e) =>
              onUpdateConnection(idx, { typWkladki: e.target.value as 'DUPLEX' | 'WDM' })
            }
          >
            <option value="DUPLEX">DUPLEX (2 włókna)</option>
            <option value="WDM">WDM (1 włókno)</option>
          </select>
        </div>
        <div className="form-group">
          <label style={{ fontSize: '12px' }}>Odległość [m]</label>
          <input
            type="number"
            min={0}
            value={distanceM}
            disabled={readOnly}
            onChange={(e) =>
              onUpdateConnection(idx, { odleglosc: Number(e.target.value) })
            }
          />
          {conn.odleglosc > 0 && (
            <div className="fiber-distance-auto">≈ {distanceKm} km</div>
          )}
        </div>
        <div className="form-group">
          <label style={{ fontSize: '12px' }}>Włókna</label>
          <input
            type="number"
            min={1}
            value={conn.iloscWlokien}
            disabled={true}
            readOnly
          />
          <div className="fiber-distance-auto">auto z typu wkładki</div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* EndpointForm sub-component                                            */
/* ------------------------------------------------------------------ */

interface EndpointFormProps {
  endpoint: FiberEndpoint;
  label: string;
  readOnly: boolean;
  onChange: (patch: Partial<FiberEndpoint>) => void;
}

const EndpointForm: React.FC<EndpointFormProps> = ({ endpoint, label, readOnly, onChange }) => (
  <div className="fiber-endpoint-card">
    <label>{label}</label>
    <div className="form-group" style={{ marginBottom: '6px' }}>
      <select
        value={endpoint.typ}
        disabled={readOnly}
        onChange={(e) => onChange({ typ: e.target.value as FiberEndpoint['typ'] })}
        style={{ fontSize: '13px' }}
      >
        {ENDPOINT_TYPES.map(t => (
          <option key={t} value={t}>
            {endpointLabel(t)}
          </option>
        ))}
      </select>
    </div>
    <div className="form-group" style={{ marginBottom: '6px' }}>
      <input
        type="text"
        placeholder="Nazwa obiektu"
        value={endpoint.nazwa}
        disabled={readOnly}
        style={{ fontSize: '13px' }}
        onChange={(e) => onChange({ nazwa: e.target.value })}
      />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
      <input
        type="number"
        placeholder="Kilometraż"
        value={endpoint.kilometraz ?? ''}
        disabled={readOnly}
        style={{ fontSize: '12px' }}
        onChange={(e) =>
          onChange({ kilometraz: e.target.value !== '' ? Number(e.target.value) : undefined })
        }
        title="Kilometraż na linii kolejowej"
      />
      <input
        type="text"
        placeholder="lat,lng (GPS)"
        value={endpoint.gps ? `${endpoint.gps.lat},${endpoint.gps.lng}` : ''}
        disabled={readOnly}
        style={{ fontSize: '12px' }}
        onChange={(e) => {
          const parts = e.target.value.split(',').map(s => s.trim());
          if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
            onChange({ gps: { lat: Number(parts[0]), lng: Number(parts[1]) } });
          } else if (e.target.value === '') {
            onChange({ gps: undefined });
          }
        }}
        title="Współrzędne GPS: szerokość, długość"
      />
    </div>
  </div>
);
