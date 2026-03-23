import React, { useState, useMemo } from 'react';
import type { NetworkAllocation } from '../../services/network.service';
import './NetworkAllocationList.css';

interface Props {
  allocations: NetworkAllocation[];
}

function getUsageColor(pct: number): string {
  if (pct < 50) return 'green';
  if (pct < 70) return 'blue';
  if (pct < 90) return 'orange';
  return 'red';
}

function getSystemTypeBadgeClass(systemType: string): string {
  const t = systemType.toUpperCase();
  if (t.includes('SMOKIP')) return 'allocation-badge-smokip';
  if (t.includes('CMOKIP')) return 'allocation-badge-cmokip';
  return 'allocation-badge-other';
}

export const NetworkAllocationList: React.FC<Props> = ({ allocations }) => {
  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const systemTypes = useMemo(() => {
    return Array.from(new Set(allocations.map(a => a.systemType))).sort();
  }, [allocations]);

  const filtered = useMemo(() => {
    return allocations.filter(a => {
      if (filterType && a.systemType !== filterType) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        return (
          a.subsystem?.subsystemNumber?.toLowerCase().includes(q) ||
          a.contract?.contractNumber?.toLowerCase().includes(q) ||
          a.allocatedRange?.toLowerCase().includes(q) ||
          a.systemType?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allocations, filterType, filterSearch]);

  if (allocations.length === 0) {
    return (
      <div className="network-empty-state">
        <div className="network-empty-icon">📋</div>
        <p className="network-empty-text">Brak alokacji sieciowych.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="allocation-filters">
        <input
          className="allocation-filter-input"
          type="text"
          placeholder="🔍 Szukaj..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          style={{ minWidth: '200px' }}
        />
        <select
          className="allocation-filter-input"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">Wszystkie typy</option>
          {systemTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          {filtered.length} z {allocations.length}
        </span>
      </div>

      <div className="allocation-table-wrapper">
        <table className="allocation-table">
          <thead>
            <tr>
              <th>Podsystem</th>
              <th>Kontrakt</th>
              <th>Typ systemu</th>
              <th>Sieć</th>
              <th>Gateway / NTP</th>
              <th>Wykorzystanie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const pct = a.totalHosts > 0 ? Math.round((a.usedHosts / a.totalHosts) * 100) : 0;
              const color = getUsageColor(pct);
              return (
                <tr key={a.id}>
                  <td>{a.subsystem?.subsystemNumber ?? `#${a.subsystemId}`}</td>
                  <td>{a.contract?.contractNumber ?? `#${a.contractId}`}</td>
                  <td>
                    <span className={`allocation-badge ${getSystemTypeBadgeClass(a.systemType)}`}>
                      {a.systemType}
                    </span>
                  </td>
                  <td>
                    <div className="allocation-network-info">
                      <code>{a.allocatedRange}</code>
                      <code>Maska: {a.subnetMask}</code>
                    </div>
                  </td>
                  <td>
                    <div className="allocation-network-info">
                      <code>GW: {a.gateway}</code>
                      <code>NTP: {a.ntpServer}</code>
                    </div>
                  </td>
                  <td>
                    <div className="allocation-usage">
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {a.usedHosts}/{a.totalHosts} hostów ({pct}%)
                      </span>
                      <div className="allocation-usage-bar">
                        <div
                          className={`allocation-usage-fill ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
