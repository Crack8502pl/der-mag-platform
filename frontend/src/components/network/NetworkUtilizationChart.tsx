import React from 'react';
import type { NetworkPool, NetworkAllocation } from '../../services/network.service';
import './NetworkUtilizationChart.css';

interface Props {
  pools: NetworkPool[];
  allocations: NetworkAllocation[];
}

function getColorClass(pct: number): string {
  if (pct < 50) return 'green';
  if (pct < 70) return 'blue';
  if (pct < 90) return 'orange';
  return 'red';
}

export const NetworkUtilizationChart: React.FC<Props> = ({ pools, allocations }) => {
  const totalHosts = allocations.reduce((s, a) => s + a.totalHosts, 0);
  const usedHosts = allocations.reduce((s, a) => s + a.usedHosts, 0);
  const availableHosts = totalHosts - usedHosts;
  const globalPct = totalHosts > 0 ? Math.round((usedHosts / totalHosts) * 100) : 0;

  // Per-pool usage
  const poolStats = pools.map(pool => {
    const poolAllocations = allocations.filter(a => a.poolId === pool.id);
    const pTotal = poolAllocations.reduce((s, a) => s + a.totalHosts, 0);
    const pUsed = poolAllocations.reduce((s, a) => s + a.usedHosts, 0);
    const pct = pTotal > 0 ? Math.round((pUsed / pTotal) * 100) : 0;
    return { pool, pTotal, pUsed, pct, allocCount: poolAllocations.length };
  });

  return (
    <div>
      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-icon">📊</div>
          <div className="summary-card-value">{globalPct}%</div>
          <div className="summary-card-label">Globalne wykorzystanie</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">🌐</div>
          <div className="summary-card-value">{pools.length}</div>
          <div className="summary-card-label">Liczba pul</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">✅</div>
          <div className="summary-card-value">{usedHosts.toLocaleString()}</div>
          <div className="summary-card-label">Przydzielone adresy</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">🔓</div>
          <div className="summary-card-value">{availableHosts.toLocaleString()}</div>
          <div className="summary-card-label">Dostępne adresy</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon">📋</div>
          <div className="summary-card-value">{allocations.length}</div>
          <div className="summary-card-label">Alokacje</div>
        </div>
      </div>

      {/* Per-pool utilization */}
      {poolStats.length === 0 ? (
        <div className="network-empty-state">
          <div className="network-empty-icon">📈</div>
          <p className="network-empty-text">Brak danych do wyświetlenia.</p>
        </div>
      ) : (
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
            Wykorzystanie per pula
          </h3>
          <div className="utilization-grid">
            {poolStats.map(({ pool, pTotal, pUsed, pct, allocCount }) => {
              const color = getColorClass(pct);
              return (
                <div className="utilization-card" key={pool.id}>
                  <div className="utilization-card-header">
                    <div className="utilization-card-name">{pool.name}</div>
                    <div className="utilization-card-cidr">{pool.cidrRange}</div>
                  </div>
                  <div className={`utilization-percent ${color}`}>{pct}%</div>
                  <div className="utilization-bar-bg">
                    <div
                      className={`utilization-bar-fill ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="utilization-stats">
                    <span>{pUsed.toLocaleString()} zajętych</span>
                    <span>{(pTotal - pUsed).toLocaleString()} wolnych</span>
                    <span>{allocCount} alokacji</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
