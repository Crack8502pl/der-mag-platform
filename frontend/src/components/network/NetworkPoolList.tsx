import React, { useState } from 'react';
import type { NetworkPool } from '../../services/network.service';
import './NetworkPoolList.css';

interface Props {
  pools: NetworkPool[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (pool: NetworkPool) => void;
  onDelete: (pool: NetworkPool) => void;
}

function getUsageColor(pct: number): string {
  if (pct < 50) return 'green';
  if (pct < 70) return 'blue';
  if (pct < 90) return 'orange';
  return 'red';
}

function calcUsage(pool: NetworkPool): number {
  if (!pool.allocations || pool.allocations.length === 0) return 0;
  const usedHosts = pool.allocations.reduce((s, a) => s + (a.usedHosts || 0), 0);
  const totalHosts = pool.allocations.reduce((s, a) => s + (a.totalHosts || 0), 0);
  if (totalHosts === 0) return 0;
  return Math.round((usedHosts / totalHosts) * 100);
}

export const NetworkPoolList: React.FC<Props> = ({
  pools,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<NetworkPool | null>(null);

  if (pools.length === 0) {
    return (
      <div className="network-empty-state">
        <div className="network-empty-icon">🌐</div>
        <p className="network-empty-text">Brak pul adresów IP. Utwórz pierwszą pulę.</p>
      </div>
    );
  }

  return (
    <div className="pool-list">
      {confirmDelete && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <span style={{ color: '#ef4444', fontSize: '14px' }}>
            Czy na pewno chcesz usunąć pulę <strong>{confirmDelete.name}</strong>?
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-danger btn-sm" onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}>
              Usuń
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {pools.map(pool => {
        const usagePct = calcUsage(pool);
        const color = getUsageColor(usagePct);
        const allocCount = pool.allocations?.length ?? 0;

        return (
          <div className="pool-card" key={pool.id}>
            <div className="pool-card-header">
              <div className="pool-card-title">
                <h3 className="pool-name">{pool.name}</h3>
                <span className="pool-cidr">{pool.cidrRange}</span>
                <span className={`pool-badge ${pool.isActive ? 'pool-badge-active' : 'pool-badge-inactive'}`}>
                  {pool.isActive ? '✓ Aktywna' : '✗ Nieaktywna'}
                </span>
                <span className="pool-priority">Priorytet: {pool.priority}</span>
              </div>
              <div className="pool-card-actions">
                {canEdit && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onEdit(pool)}>
                    ✏️ Edytuj
                  </button>
                )}
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(pool)}>
                    🗑️ Usuń
                  </button>
                )}
              </div>
            </div>

            {pool.description && (
              <p className="pool-description">{pool.description}</p>
            )}

            <div className="pool-utilization">
              <div className="pool-utilization-header">
                <span>Wykorzystanie ({allocCount} alokacji)</span>
                <span>{usagePct}%</span>
              </div>
              <div className="pool-progress-bar">
                <div
                  className={`pool-progress-fill ${color}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
