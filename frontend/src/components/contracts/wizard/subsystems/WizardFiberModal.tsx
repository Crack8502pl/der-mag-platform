// src/components/contracts/wizard/subsystems/WizardFiberModal.tsx
// Lightweight fiber connection editor for use within the contract wizard.
// Unlike FiberSchemaModal, it does NOT require an existing Task entity —
// connections are stored in taskDetails and saved when the contract is created.

import React, { useRef, useState } from 'react';
import type { FiberConnection, FiberEndpoint } from '../../../../types/fiber.types';
import {
  estimateDistance,
  fibersForInsert,
  sumFibers,
  totalLengthKm,
} from '../../../../services/fiberCalculator.service';
import '../../../../styles/grover-theme.css';
import '../../../tasks/FiberSchemaModal.css';

interface WizardFiberModalProps {
  /** Display name for the LCS task anchor */
  taskLabel: string;
  /** Initial connections to pre-populate the editor */
  initialConnections: FiberConnection[];
  /** GPS / km data for auto-populating the LCS endpoint when adding a connection */
  gpsLatitude?: string;
  gpsLongitude?: string;
  kilometraz?: string;
  onSave: (connections: FiberConnection[]) => void;
  onClose: () => void;
}

const ENDPOINT_TYPES: FiberEndpoint['typ'][] = ['LCS', 'NASTAWNIA', 'PRZEJAZD', 'SKP'];

// Monotonic ID counter to avoid duplicate keys when multiple items are created
// within the same millisecond.
let _nextId = Date.now();
const nextId = (): number => ++_nextId;

const newEndpoint = (typ: FiberEndpoint['typ'] = 'PRZEJAZD'): FiberEndpoint => ({
  id: nextId(),
  nazwa: '',
  typ,
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

export const WizardFiberModal: React.FC<WizardFiberModalProps> = ({
  taskLabel,
  initialConnections,
  gpsLatitude,
  gpsLongitude,
  kilometraz,
  onSave,
  onClose,
}) => {
  const [connections, setConnections] = useState<FiberConnection[]>(initialConnections);
  // Per-instance ID counter so that parallel open modals don't share global state.
  const idCounterRef = useRef(Date.now());
  const genId = (): number => { idCounterRef.current += 1; return idCounterRef.current; };

  const recalcEndpoints = (conn: FiberConnection): FiberConnection => {
    const estimated = estimateDistance(conn.obiektStartowy, conn.obiektKoncowy);
    const hasAutoData =
      (conn.obiektStartowy.kilometraz != null && conn.obiektKoncowy.kilometraz != null) ||
      (conn.obiektStartowy.gps != null && conn.obiektKoncowy.gps != null);
    return {
      ...conn,
      odleglosc: hasAutoData ? estimated : conn.odleglosc,
      iloscWlokien: fibersForInsert(conn.typWkladki),
    };
  };

  const updateConnection = (idx: number, patch: Partial<FiberConnection>) => {
    setConnections(prev => {
      const updated = [...prev];
      const merged = { ...updated[idx], ...patch };
      updated[idx] = { ...merged, iloscWlokien: fibersForInsert(merged.typWkladki) };
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
      updated[connIdx] = recalcEndpoints(conn);
      return updated;
    });
  };

  const addConnection = () => {
    const taskKm = kilometraz ? parseFloat(kilometraz) : undefined;

    // Only use GPS values when both are present and numeric
    const latNum = gpsLatitude ? Number(gpsLatitude) : NaN;
    const lonNum = gpsLongitude ? Number(gpsLongitude) : NaN;
    const taskGps =
      !isNaN(latNum) && !isNaN(lonNum) && gpsLatitude && gpsLongitude
        ? { lat: latNum, lng: lonNum }
        : undefined;

    const lcsEndpoint: FiberEndpoint = {
      id: genId(),
      nazwa: taskLabel || 'LCS',
      typ: 'LCS',
      ...(taskKm != null && !isNaN(taskKm) ? { kilometraz: taskKm } : {}),
      ...(taskGps ? { gps: taskGps } : {}),
    };

    const conn: FiberConnection = {
      id: genId(),
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

  const totalFibers = sumFibers(connections);
  const totalKm = totalLengthKm(connections);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>🔗 Połączenia światłowodowe — {taskLabel}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            Zdefiniuj połączenia między obiektami. Odległości są automatycznie obliczane z kilometrażu
            lub współrzędnych GPS. Wkładka <strong>DUPLEX</strong> wymaga 2 włókien, <strong>WDM</strong> – 1 włókna.
          </p>

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
                onUpdateConnection={updateConnection}
                onUpdateEndpoint={updateEndpoint}
                onRemove={removeConnection}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={addConnection}
            style={{ marginBottom: '16px' }}
          >
            ➕ Dodaj połączenie
          </button>

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
          <button className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={() => onSave(connections)}>
            💾 Zapisz połączenia
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ConnectionRow sub-component (same UI pattern as FiberSchemaModal)   */
/* ------------------------------------------------------------------ */

interface ConnectionRowProps {
  conn: FiberConnection;
  idx: number;
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
  onUpdateConnection,
  onUpdateEndpoint,
  onRemove,
}) => (
  <div className="fiber-connection-row" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <strong style={{ fontSize: '13px' }}>Połączenie {idx + 1}</strong>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => onRemove(idx)}
        style={{ padding: '2px 8px' }}
      >
        🗑️ Usuń
      </button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      {/* Start endpoint */}
      <EndpointEditor
        label="Obiekt START"
        endpoint={conn.obiektStartowy}
        onChange={(patch) => onUpdateEndpoint(idx, 'obiektStartowy', patch)}
      />
      {/* End endpoint */}
      <EndpointEditor
        label="Obiekt KONIEC"
        endpoint={conn.obiektKoncowy}
        onChange={(patch) => onUpdateEndpoint(idx, 'obiektKoncowy', patch)}
      />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Typ wkładki</label>
        <select
          value={conn.typWkladki}
          onChange={(e) => onUpdateConnection(idx, { typWkladki: e.target.value as 'DUPLEX' | 'WDM' })}
          style={{ width: '100%' }}
        >
          <option value="DUPLEX">DUPLEX (2 włókna)</option>
          <option value="WDM">WDM (1 włókno)</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Odległość (m)</label>
        <input
          type="number"
          min={0}
          value={conn.odleglosc}
          onChange={(e) => onUpdateConnection(idx, { odleglosc: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Włókna</label>
        <span style={{ fontSize: '16px', fontWeight: 700 }}>{conn.iloscWlokien}</span>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* EndpointEditor sub-component                                          */
/* ------------------------------------------------------------------ */

interface EndpointEditorProps {
  label: string;
  endpoint: FiberEndpoint;
  onChange: (patch: Partial<FiberEndpoint>) => void;
}

const EndpointEditor: React.FC<EndpointEditorProps> = ({ label, endpoint, onChange }) => (
  <div style={{ fontSize: '13px' }}>
    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>{label}</label>
    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
      <select
        value={endpoint.typ}
        onChange={(e) => onChange({ typ: e.target.value as FiberEndpoint['typ'] })}
        style={{ flex: '0 0 auto' }}
      >
        {ENDPOINT_TYPES.map(t => (
          <option key={t} value={t}>{endpointLabel(t)}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nazwa"
        value={endpoint.nazwa}
        onChange={(e) => onChange({ nazwa: e.target.value })}
        style={{ flex: 1 }}
      />
    </div>
    <input
      type="number"
      placeholder="Kilometraż"
      value={endpoint.kilometraz ?? ''}
      onChange={(e) => onChange({ kilometraz: e.target.value ? Number(e.target.value) : undefined })}
      style={{ width: '100%', fontSize: '12px' }}
    />
  </div>
);
