// src/components/dashboard/AssetSummaryWidget.tsx
// Widget podsumowania assetów na Dashboard

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import assetService, { type AssetStats } from '../../services/asset.service';
import './AssetSummaryWidget.css';

interface StatCardProps {
  label: string;
  value: number;
  icon?: string;
  color?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'default', link }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (link) navigate(link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (link && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(link);
    }
  };

  return (
    <div
      className={`stat-card ${color} ${link ? 'clickable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={link ? 'button' : undefined}
      tabIndex={link ? 0 : undefined}
      aria-label={link ? `${label}: ${value} - kliknij aby przejść do filtrowanej listy` : undefined}
    >
      {icon && <div className="stat-icon" aria-hidden="true">{icon}</div>}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

export const AssetSummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchStats = async (isInitial: boolean) => {
      // Only show the full skeleton on the very first load
      if (isInitial) {
        setLoading(true);
      }

      try {
        const data = await assetService.getAssetStats();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load asset stats:', err);
          setError(err.response?.data?.message || 'Błąd podczas ładowania statystyk');
          // Only replace stats with zeros on initial load to prevent blank UI
          if (isInitial) {
            setStats({
              total: 0,
              byStatus: { planned: 0, installed: 0, active: 0, in_service: 0, faulty: 0, inactive: 0, decommissioned: 0 },
              byType: {},
              byCategory: {},
            });
          }
        }
      } finally {
        if (!cancelled) {
          if (isInitial) {
            setLoading(false);
          }
          // Schedule next refresh only after current fetch completes to prevent overlapping calls
          timeoutId = setTimeout(() => fetchStats(false), 60000);
        }
      }
    };

    fetchStats(true);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const getStatusCount = (status: string): number => {
    if (!stats) return 0;
    // Backend may return totalAssets (instead of total) - handle both
    const byStatus = stats.byStatus || {};
    return byStatus[status] ?? 0;
  };

  const totalCount = stats
    ? (stats.total ?? (stats as any).totalAssets ?? 0)
    : 0;

  if (loading) {
    return (
      <div className="asset-summary-widget" aria-label="Ładowanie podsumowania obiektów">
        <div className="widget-header">
          <h3>🏗️ Obiekty - Podsumowanie</h3>
        </div>
        <div className="stats-grid stats-grid--loading" aria-busy="true">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="stat-card skeleton" aria-hidden="true">
              <div className="skeleton-icon" />
              <div className="skeleton-value" />
              <div className="skeleton-label" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="asset-summary-widget">
      <div className="widget-header">
        <h3>🏗️ Obiekty - Podsumowanie</h3>
        <button
          className="btn-see-all"
          onClick={() => navigate('/assets')}
          aria-label="Zobacz wszystkie obiekty"
        >
          Zobacz wszystkie
        </button>
      </div>

      {error && (
        <div className="widget-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      <div className="stats-grid" role="list" aria-label="Statystyki obiektów">
        <div role="listitem">
          <StatCard
            label="Łącznie"
            value={totalCount}
            icon="🏗️"
          />
        </div>
        <div role="listitem">
          <StatCard
            label="Aktywne"
            value={getStatusCount('active')}
            icon="✅"
            color="success"
            link="/assets?status=active"
          />
        </div>
        <div role="listitem">
          <StatCard
            label="W serwisie"
            value={getStatusCount('in_service')}
            icon="🔧"
            color="warning"
            link="/assets?status=in_service"
          />
        </div>
        <div role="listitem">
          <StatCard
            label="Awarie"
            value={getStatusCount('faulty')}
            icon="⚠️"
            color="danger"
            link="/assets?status=faulty"
          />
        </div>
        <div role="listitem">
          <StatCard
            label="Planowane"
            value={getStatusCount('planned')}
            icon="📅"
            color="info"
            link="/assets?status=planned"
          />
        </div>
      </div>
    </div>
  );
};

export default AssetSummaryWidget;
