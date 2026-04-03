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
import { useAuth } from '../../hooks/useAuth';
import '../../styles/grover-theme.css';
import './FiberSchemaModal.css';

interface Props {
  /** Existing task – optional. When provided, data is loaded from task metadata. */
  task?: Task;
  /** Task number label shown in the header when no task entity is available. */
  taskNumber?: string;
  onClose: () => void;
  /** Callback used in wizard mode – receives the built config and closes the modal. */
  onSave?: (config: FiberTransmissionConfig) => void;
  /** Pre-populated connections for wizard mode (task not yet created). */
  initialConnections?: FiberConnection[];
  onSuccess?: () => void;
}

const ENDPOINT_TYPES: FiberEndpoint['typ'][] = ['LCS', 'NASTAWNIA', 'PRZEJAZD', 'SKP'];

const newEndpoint = (typ: FiberEndpoint['typ'] = 'PRZEJAZD'): FiberEndpoint => ({
  id: Date.now(),
  nazwa: '',
  typ,
});

const endpointLabel = (typ: FiberEndpoint['typ']): string => {
  const map: Record<FiberEndpoint['typ'], string> = {
    LCS: 'LCS',
    NASTAWNIA: 'Nastawnia',
    PRZEJAZD: 'Przejazd',
    SKP: 'SKP',
  };
  return map[typ];
};

export const FiberSchemaModal: React.FC<Props> = ({
  task,
  taskNumber,
  onClose,
  onSave,
  initialConnections,
  onSuccess,
}) => {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canEdit = hasPermission('tasks', 'update');
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [connections, setConnections] = useState<FiberConnection[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialConnections && initialConnections.length > 0) {
      setConnections(initialConnections);
    } else if (task) {
      const saved: FiberTransmissionConfig | undefined =
        task.metadata?.configParams?.fiberSchema;
      if (saved?.schematLacznosci?.length) {
        setConnections(saved.schematLacznosci);
      }
    }
  }, [task, initialConnections]);

  /* ---------------------------------------------------------------- */
  /* Recalculate helpers                                               */
  /* ---------------------------------------------------------------- */

  /** Recalc only when endpoints change. Preserves manually-entered odleglosc. */
  const recalcEndpoints = (conn: FiberConnection): FiberConnection => {
    const estimated = estimateDistance(conn.obiektStartowy, conn.obiektKoncowy);
    // Only overwrite distance if auto-calculation produced a non-zero result
    // (i.e., at least one endpoint has km or GPS data)
    const hasAutoData =
      (conn.obiektStartowy.kilometraz != null && conn.obiektKoncowy.kilometraz != null) ||
      (conn.obiektStartowy.gps != null && conn.obiektKoncowy.gps != null);
    return {
      ...conn,
      odleglosc: hasAutoData ? estimated : conn.odleglosc,
      iloscWlokien: fibersForInsert(conn.typWkladki),
    };
  };

  /** Called when user changes typWkladki or odleglosc directly – never overwrites odleglosc. */
  const updateConnection = (idx: number, patch: Partial<FiberConnection>) => {
    setConnections(prev => {
      const updated = [...prev];
      const merged = { ...updated[idx], ...patch };
      // Only recalc iloscWlokien, preserve odleglosc as provided (manual or unchanged)
      updated[idx] = { ...merged, iloscWlokien: fibersForInsert(merged.typWkladki) };
      return updated;
    });
  };

  /** Called when an endpoint field changes – triggers auto-distance recalculation. */
  const updateEndpoint = (
    connIdx: number,
    side: 'obiektStartowy' | 'obiektKoncowy',
    patch: Partial<FiberEndpoint>
  ) => {
    setConnections(prev => {
      const updated = [...prev];
      const conn = { ...updated[connIdx] };
      conn[side] = { ...conn[side], ...patch };
      updated[connIdx] = recalcEndpoints(conn);
      return updated;
    });
  };

  /** Create a new connection, pre-populating the LCS endpoint from current task data. */
  const addConnection = () => {
    const taskKm = task?.metadata?.configParams?.kilometraz
      ? parseFloat(task.metadata.configParams.kilometraz)
      : undefined;
    const taskGps =
      task && task.gpsLatitude != null && task.gpsLongitude != null
        ? { lat: Number(task.gpsLatitude), lng: Number(task.gpsLongitude) }
        : undefined;

    const lcsEndpoint: FiberEndpoint = {
      id: Date.now(),
      nazwa: task?.title || taskNumber || 'LCS',
      typ: 'LCS',
      ...(taskKm != null && !isNaN(taskKm) ? { kilometraz: taskKm } : {}),
      ...(taskGps ? { gps: taskGps } : {}),
    };

    const conn: FiberConnection = {
      id: Date.now() + 1,
      obiektStartowy: lcsEndpoint,
      obiektKoncowy: newEndpoint('NASTAWNIA'),
      odleglosc: 0,
      typWkladki: 'DUPLEX',
      iloscWlokien: 2,
    };

    setConnections(prev => [...prev, conn]);
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
    if (!canEdit && !onSave) return;
    const config = buildConfig();

    if (onSave) {
      // Wizard mode – return data to parent and close
      onSave(config);
      onClose();
      return;
    }

    if (!task) return;

    try {
      setSaving(true);
      setError('');
      await taskService.update(task.taskNumber, {
        metadata: {
          ...task.metadata,
          configParams: {
            ...(task.metadata?.configParams || {}),
            fiberSchema: config,
          },
        },
        status: 'configured',
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zapisywania schematu światłowodowego');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content fiber-schema-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>Schemat transmisji światłowodowej{taskNumber ? ` — ${taskNumber}` : task ? ` — ${task.taskNumber}` : ''}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          {!canEdit && !onSave && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              Tryb podglądu – brak uprawnień do edycji
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
                readOnly={!canEdit && !onSave}
                isAdmin={isAdmin}
                onUpdateConnection={updateConnection}
                onUpdateEndpoint={updateEndpoint}
                onRemove={removeConnection}
              />
            ))}
          </div>

          {(canEdit || onSave) && (
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
              <h4>Podsumowanie</h4>
              <div className="fiber-summary-grid">
                <div className="fiber-summary-item">
                  <div className="fiber-summary-value">{totalKm.toFixed(2)}</div>
                  <div className="fiber-summary-label">km światłowodu łącznie</div>
                  {isAdmin && <small className="bom-variable-hint">[obliczenia.calkowitaDlugoscKm]</small>}
                </div>
                <div className="fiber-summary-item">
                  <div className="fiber-summary-value">{connections.length}</div>
                  <div className="fiber-summary-label">połączeń</div>
                </div>
                <div className="fiber-summary-item">
                  <div className="fiber-summary-value">{totalFibers}</div>
                  <div className="fiber-summary-label">włókien wymaganych</div>
                  {isAdmin && <small className="bom-variable-hint">[obliczenia.wymaganychWlokien]</small>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {onSave ? 'Anuluj' : 'Zamknij'}
          </button>
          {(canEdit || onSave) && (
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
  isAdmin: boolean;
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
  isAdmin,
  onUpdateConnection,
  onUpdateEndpoint,
  onRemove,
}) => {
  const distanceM = Math.round(conn.odleglosc);
  const distanceKm = (conn.odleglosc / 1000).toFixed(2);

  // Detect if distance was auto-calculated from endpoints (km or GPS)
  const hasAutoKm =
    conn.obiektStartowy.kilometraz != null && conn.obiektKoncowy.kilometraz != null;
  const hasAutoGps =
    conn.obiektStartowy.gps != null && conn.obiektKoncowy.gps != null;
  const isAutoDistance = hasAutoKm || hasAutoGps;

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
          side="obiektStartowy"
          connIdx={idx}
          readOnly={readOnly}
          isAdmin={isAdmin}
          onChange={(patch) => onUpdateEndpoint(idx, 'obiektStartowy', patch)}
        />
        <div className="fiber-arrow">→</div>
        <EndpointForm
          endpoint={conn.obiektKoncowy}
          label="Obiekt końcowy"
          side="obiektKoncowy"
          connIdx={idx}
          readOnly={readOnly}
          isAdmin={isAdmin}
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
          {isAdmin && <small className="bom-variable-hint">[schematLacznosci[{idx}].typWkladki]</small>}
        </div>
        <div className="form-group">
          <label style={{ fontSize: '12px' }}>
            Odległość [m]{isAutoDistance && <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>⚡ auto</span>}
          </label>
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
            <div className="fiber-distance-auto">
              ≈ {distanceKm} km{isAutoDistance ? ' · obliczona z danych' : ' · ręcznie'}
            </div>
          )}
          {isAdmin && <small className="bom-variable-hint">[schematLacznosci[{idx}].odleglosc]</small>}
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
          {isAdmin && <small className="bom-variable-hint">[schematLacznosci[{idx}].iloscWlokien]</small>}
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
  side: 'obiektStartowy' | 'obiektKoncowy';
  connIdx: number;
  readOnly: boolean;
  isAdmin: boolean;
  onChange: (patch: Partial<FiberEndpoint>) => void;
}

const EndpointForm: React.FC<EndpointFormProps> = ({ endpoint, label, side, connIdx, readOnly, isAdmin, onChange }) => (
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
      {isAdmin && <small className="bom-variable-hint">[schematLacznosci[{connIdx}].{side}.typ]</small>}
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
      <div>
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
        {isAdmin && <small className="bom-variable-hint">[schematLacznosci[{connIdx}].{side}.kilometraz]</small>}
      </div>
      <div>
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
        {isAdmin && (
          <small className="bom-variable-hint">
            [{`schematLacznosci[${connIdx}].${side}.gps.lat`}]<br />
            [{`schematLacznosci[${connIdx}].${side}.gps.lon`}]
          </small>
        )}
      </div>
    </div>
  </div>
);
