import React, { useState, useMemo } from 'react';
import type { DeviceIPAssignment, NetworkAllocation } from '../../services/network.service';
import './NetworkIPMatrix.css';

interface Props {
  allocations: NetworkAllocation[];
  canAssign: boolean;
  onAssignNew: (allocationId: number) => void;
  onConfigure: (assignment: DeviceIPAssignment) => void;
  onVerify: (assignment: DeviceIPAssignment) => void;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planowany',
  ASSIGNED: 'Przydzielony',
  CONFIGURED: 'Skonfigurowany',
  VERIFIED: 'Zweryfikowany',
  DEPLOYED: 'Wdrożony',
};

const CATEGORY_LABELS: Record<string, string> = {
  CAMERA: '📷 Kamera',
  SWITCH: '🔀 Switch',
  ROUTER: '📡 Router',
  NVR: '📹 NVR',
  SERVER: '🖥️ Serwer',
  IOT: '📶 IoT',
  ACCESS_POINT: '📡 AP',
  OTHER: '🔧 Inne',
};

export const NetworkIPMatrix: React.FC<Props> = ({
  allocations,
  canAssign,
  onAssignNew,
  onConfigure,
  onVerify,
}) => {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAllocation, setFilterAllocation] = useState<number | ''>('');

  const allAssignments = useMemo<DeviceIPAssignment[]>(() => {
    return allocations.flatMap(a => a.deviceAssignments ?? []);
  }, [allocations]);

  const filtered = useMemo(() => {
    return allAssignments.filter(a => {
      if (filterCategory && a.deviceCategory !== filterCategory) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterAllocation && a.allocationId !== filterAllocation) return false;
      return true;
    });
  }, [allAssignments, filterCategory, filterStatus, filterAllocation]);

  const categories = useMemo(() => {
    return Array.from(new Set(allAssignments.map(a => a.deviceCategory)));
  }, [allAssignments]);

  if (allocations.length === 0) {
    return (
      <div className="network-empty-state">
        <div className="network-empty-icon">🗂️</div>
        <p className="network-empty-text">Brak alokacji. Najpierw utwórz alokację sieciową dla podsystemu.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="ip-matrix-header">
        <div className="ip-matrix-filters">
          <select
            className="ip-matrix-filter"
            value={filterAllocation ?? ''}
            onChange={e => setFilterAllocation(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Wszystkie alokacje</option>
            {allocations.map(a => (
              <option key={a.id} value={a.id}>
                {a.subsystem?.subsystemNumber ?? `Alokacja #${a.id}`} – {a.allocatedRange}
              </option>
            ))}
          </select>
          <select
            className="ip-matrix-filter"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Wszystkie kategorie</option>
            {categories.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
          <select
            className="ip-matrix-filter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Wszystkie statusy</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {filtered.length} urządzeń
          </span>
        </div>

        {canAssign && allocations.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allocations.map(a => (
              <button
                key={a.id}
                className="btn btn-primary btn-sm"
                onClick={() => onAssignNew(a.id)}
              >
                + Przydziel IP ({a.subsystem?.subsystemNumber ?? `#${a.id}`})
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="network-empty-state">
          <div className="network-empty-icon">🔍</div>
          <p className="network-empty-text">Brak urządzeń spełniających kryteria filtrowania.</p>
        </div>
      ) : (
        <div className="ip-matrix-table-wrapper">
          <table className="ip-matrix-table">
            <thead>
              <tr>
                <th>Adres IP</th>
                <th>Hostname</th>
                <th>Kategoria</th>
                <th>Typ urządzenia</th>
                <th>Status</th>
                <th>Nr seryjny</th>
                <th>Firmware</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td className="ip-address-cell">{d.ipAddress}</td>
                  <td>{d.hostname}</td>
                  <td>
                    <span className="ip-category-badge">
                      {CATEGORY_LABELS[d.deviceCategory] ?? d.deviceCategory}
                    </span>
                  </td>
                  <td>{d.deviceType}</td>
                  <td>
                    <span className={`ip-status-badge ip-status-${d.status.toLowerCase()}`}>
                      {STATUS_LABELS[d.status] ?? d.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {d.serialNumber ?? '—'}
                  </td>
                  <td style={{ fontSize: '12px' }}>{d.firmwareVersion ?? '—'}</td>
                  <td>
                    <div className="ip-matrix-actions">
                      {(d.status === 'PLANNED' || d.status === 'ASSIGNED') && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Konfiguruj"
                          onClick={() => onConfigure(d)}
                        >
                          ⚙️
                        </button>
                      )}
                      {d.status === 'CONFIGURED' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Weryfikuj"
                          onClick={() => onVerify(d)}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
