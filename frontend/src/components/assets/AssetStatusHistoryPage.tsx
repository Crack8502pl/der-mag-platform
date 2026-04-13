// src/components/assets/AssetStatusHistoryPage.tsx
// Asset Status History Page with Timeline Visualization - PR#14

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import assetService from '../../services/asset.service';
import type { HistoryFilters, StatusHistoryEntry, AssetHistoryResponse } from '../../services/asset.service';
import type { AssetDetails } from '../../services/asset.service';
import { BackButton } from '../common/BackButton';
import './AssetStatusHistoryPage.css';

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planowany',
  installed: 'Zainstalowany',
  active: 'Aktywny',
  in_service: 'W serwisie',
  faulty: 'Uszkodzony',
  inactive: 'Nieaktywny',
  decommissioned: 'Zlikwidowany'
};

const STATUS_OPTIONS = [
  { value: '', label: 'Wszystkie statusy' },
  { value: 'planned', label: 'Planowany' },
  { value: 'installed', label: 'Zainstalowany' },
  { value: 'active', label: 'Aktywny' },
  { value: 'in_service', label: 'W serwisie' },
  { value: 'faulty', label: 'Uszkodzony' },
  { value: 'inactive', label: 'Nieaktywny' },
  { value: 'decommissioned', label: 'Zlikwidowany' }
];

const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status] || status;

const getDotClass = (status: string): string => {
  const map: Record<string, string> = {
    planned: 'status-planned',
    installed: 'status-installed',
    active: 'status-active',
    in_service: 'status-in_service',
    faulty: 'status-faulty',
    inactive: 'status-inactive',
    decommissioned: 'status-decommissioned'
  };
  return map[status] || '';
};

const ITEMS_PER_PAGE = 20;

export const AssetStatusHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [asset, setAsset] = useState<Pick<AssetDetails, 'id' | 'name' | 'assetNumber'> | null>(null);
  const [historyResult, setHistoryResult] = useState<AssetHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);

  // Active (applied) filters
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>({ page: 1, limit: ITEMS_PER_PAGE });

  const fetchHistory = useCallback(async (filters: HistoryFilters) => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [assetDetails, historyData] = await Promise.all([
        assetService.getAssetDetails(Number(id)),
        assetService.getAssetStatusHistory(Number(id), filters)
      ]);
      setAsset({ id: assetDetails.id, name: assetDetails.name, assetNumber: assetDetails.assetNumber });
      setHistoryResult(historyData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas pobierania historii statusów');
      console.error('Error fetching asset history:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchHistory(appliedFilters);
  }, [fetchHistory, appliedFilters]);

  const handleFilter = () => {
    // Validate dates
    if (startDate && endDate && startDate > endDate) {
      setFilterError("Data 'Od' nie może być późniejsza niż 'Do'");
      return;
    }
    setFilterError(null);
    const filters: HistoryFilters = {
      page: 1,
      limit: ITEMS_PER_PAGE,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(statusFilter && { status: statusFilter })
    };
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setFilterError(null);
    setAppliedFilters({ page: 1, limit: ITEMS_PER_PAGE });
  };

  const handlePageChange = (newPage: number) => {
    setAppliedFilters(prev => ({ ...prev, page: newPage }));
  };

  if (!loading && (error || !asset)) {
    return (
      <div className="asset-history-page">
        <BackButton to={id ? `/assets/${id}` : '/assets'} label="Powrót do szczegółów obiektu" />
        <div className="history-page-error">
          <p>❌ {error || 'Obiekt nie znaleziony'}</p>
          <button onClick={() => fetchHistory(appliedFilters)}>Spróbuj ponownie</button>
        </div>
      </div>
    );
  }

  const pagination = historyResult?.pagination;
  const entries: StatusHistoryEntry[] = historyResult?.data ?? [];

  return (
    <div className="asset-history-page">
      <BackButton to={id ? `/assets/${id}` : '/assets'} label="Powrót do szczegółów obiektu" />

      {/* Page Header */}
      <div className="history-page-header">
        <h1>📊 Historia statusów: {asset?.name ?? '...'}</h1>
        {asset?.assetNumber && (
          <div className="history-asset-number">#{asset.assetNumber}</div>
        )}
      </div>

      {/* Filters */}
      <div className="history-filters">
        <h3>🔍 Filtry</h3>
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="filter-start-date">Od</label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              aria-label="Data od"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="filter-end-date">Do</label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              aria-label="Data do"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="filter-status">Status docelowy</label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filtr statusu"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn-filter" onClick={handleFilter}>
              🔍 Filtruj
            </button>
            <button className="btn-reset" onClick={handleReset}>
              ↺ Resetuj
            </button>
          </div>
        </div>
        {filterError && (
          <div className="filter-error" role="alert">⚠️ {filterError}</div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="timeline-section">
        <div className="timeline-header">
          <h2>🕐 Oś czasu</h2>
          {!loading && pagination && (
            <span className="timeline-count">
              {pagination.total} {pagination.total === 1 ? 'zmiana' : 'zmian'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="history-loading" aria-live="polite">
            ⏳ Ładowanie historii statusów...
          </div>
        ) : entries.length === 0 ? (
          <div className="history-empty" aria-live="polite">
            📭 Brak historii statusów dla tego obiektu
            {(appliedFilters.startDate || appliedFilters.endDate || appliedFilters.status) && (
              <> pasujących do wybranych filtrów</>
            )}
          </div>
        ) : (
          <div className="timeline" role="list" aria-label="Historia statusów">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="timeline-item"
                role="listitem"
                aria-label={`Zmiana statusu ${new Date(entry.changedAt).toLocaleString('pl-PL')}`}
              >
                <div
                  className={`timeline-dot ${getDotClass(entry.newStatus)}`}
                  aria-hidden="true"
                />
                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span className="timeline-date">
                      📅 {new Date(entry.changedAt).toLocaleString('pl-PL')}
                    </span>
                    <span className="timeline-user">
                      👤 {entry.changedBy
                        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}`
                        : 'Nieznany'}
                    </span>
                  </div>
                  <div className="timeline-change">
                    {entry.oldStatus ? (
                      <>
                        <span className={`status-chip ${getDotClass(entry.oldStatus)}`}>
                          {getStatusLabel(entry.oldStatus)}
                        </span>
                        <span className="timeline-arrow" aria-hidden="true">→</span>
                      </>
                    ) : (
                      <span className="timeline-date">Status początkowy:</span>
                    )}
                    <span className={`status-chip ${getDotClass(entry.newStatus)}`}>
                      {getStatusLabel(entry.newStatus)}
                    </span>
                  </div>
                  {entry.reason && (
                    <div className="timeline-reason">💬 "{entry.reason}"</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="pagination-bar" aria-label="Paginacja historii statusów">
          <span className="pagination-info">
            Strona {pagination.page} z {pagination.totalPages} ({pagination.total} wpisów)
          </span>
          <div className="pagination-controls">
            <button
              className="btn-page"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Poprzednia strona"
            >
              ← Poprzednia
            </button>
            <span className="page-indicator">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="btn-page"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              aria-label="Następna strona"
            >
              Następna →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
