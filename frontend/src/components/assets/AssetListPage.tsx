// src/components/assets/AssetListPage.tsx
// Asset list page (Obiekty) with filters, pagination and sorting

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import assetService from '../../services/asset.service';
import type { Asset, AssetStatus, AssetType } from '../../services/asset.service';
import './AssetListPage.css';

const STATUS_LABELS: Record<AssetStatus, string> = {
  planned: 'Planowany',
  installed: 'Zainstalowany',
  active: 'Aktywny',
  in_service: 'W serwisie',
  faulty: 'Uszkodzony',
  inactive: 'Nieaktywny',
  decommissioned: 'Wycofany'
};

const TYPE_LABELS: Record<AssetType, string> = {
  PRZEJAZD: 'Przejazd',
  SKP: 'SKP',
  NASTAWNIA: 'Nastawnia',
  LCS: 'LCS',
  CUID: 'CUID'
};

const ASSET_STATUSES: AssetStatus[] = [
  'planned',
  'installed',
  'active',
  'in_service',
  'faulty',
  'inactive',
  'decommissioned'
];

const ASSET_TYPES: AssetType[] = ['PRZEJAZD', 'SKP', 'NASTAWNIA', 'LCS', 'CUID'];

export const AssetListPage: React.FC = () => {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const itemsPerPage = 20;

  // Debounce for search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params: Record<string, string | number | undefined> = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      if (filterAssetType) params.assetType = filterAssetType;

      const response = await assetService.getAll(params);

      setAssets(response.data);
      setTotalAssets(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania obiektów');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, debouncedSearch, filterStatus, filterAssetType]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'ASC' ? '↑' : '↓';
  };

  const handleRowClick = (assetId: number) => {
    navigate(`/assets/${assetId}`);
  };

  if (loading && assets.length === 0) {
    return (
      <div className="module-page">
        <BackButton to="/dashboard" />
        <div className="loading">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />

      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="assets" emoji={MODULE_ICONS.assets} size={36} />
        </div>
        <h1>Obiekty</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Toolbar */}
      <div className="assets-toolbar card">
        <div className="toolbar-row">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Szukaj po numerze, nazwie lub lokalizacji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie statusy</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterAssetType}
            onChange={(e) => {
              setFilterAssetType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie typy</option>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <div className="assets-count">
            Znaleziono: <strong>{totalAssets}</strong>{' '}
            {totalAssets === 1
              ? 'obiekt'
              : (totalAssets % 10 >= 2 && totalAssets % 10 <= 4 && (totalAssets % 100 < 10 || totalAssets % 100 >= 20))
                ? 'obiekty'
                : 'obiektów'}
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="assets-table-container card">
        <table className="assets-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('assetNumber')} className="sortable">
                Numer {getSortIcon('assetNumber')}
              </th>
              <th onClick={() => handleSort('name')} className="sortable">
                Nazwa {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('assetType')} className="sortable">
                Typ {getSortIcon('assetType')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th>Kontrakt</th>
              <th>Podsystem</th>
              <th onClick={() => handleSort('actualInstallationDate')} className="sortable">
                Data instalacji {getSortIcon('actualInstallationDate')}
              </th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                Utworzony {getSortIcon('createdAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  {loading ? 'Ładowanie...' : 'Brak obiektów do wyświetlenia'}
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} onClick={() => handleRowClick(asset.id)}>
                  <td>
                    <code className="asset-number">{asset.assetNumber}</code>
                  </td>
                  <td>
                    <span className="asset-name">{asset.name}</span>
                  </td>
                  <td>
                    <span className="type-badge">{TYPE_LABELS[asset.assetType] ?? 'Nieznany typ'}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${asset.status}`}>
                      {STATUS_LABELS[asset.status] ?? 'Nieznany status'}
                    </span>
                  </td>
                  <td>
                    {asset.contract ? (
                      <code className="asset-contract">{asset.contract.contractNumber}</code>
                    ) : (
                      <span className="text-muted" style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td>
                    {asset.subsystem ? (
                      <code className="asset-subsystem">{asset.subsystem.subsystemNumber}</code>
                    ) : (
                      <span className="text-muted" style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td>
                    {asset.actualInstallationDate
                      ? new Date(asset.actualInstallationDate).toLocaleDateString('pl-PL')
                      : <span style={{ color: '#999' }}>—</span>}
                  </td>
                  <td>
                    {new Date(asset.createdAt).toLocaleDateString('pl-PL')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            ← Poprzednia
          </button>
          <span className="page-info">
            Strona {currentPage} z {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Następna →
          </button>
        </div>
      )}
    </div>
  );
};
