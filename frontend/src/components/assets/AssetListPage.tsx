// src/components/assets/AssetListPage.tsx
// Asset list page - read-only view with filters and pagination

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import assetService, { Asset, AssetFilters } from '../../services/asset.service';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './AssetListPage.css';

export const AssetListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters — initialize contractId from URL query param if provided
  const initialContractId = searchParams.get('contractId')
    ? Number(searchParams.get('contractId'))
    : undefined;

  const [filters, setFilters] = useState<AssetFilters>({
    assetType: '',
    status: '',
    category: '',
    search: '',
    contractId: initialContractId,
    page: 1,
    limit: 20
  });
  const [searchInputValue, setSearchInputValue] = useState('');

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetService.getAssets({
        assetType: filters.assetType,
        status: filters.status,
        category: filters.category,
        search: filters.search,
        contractId: filters.contractId,
        page,
        limit: 20
      });
      setAssets(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas pobierania obiektów');
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.assetType, filters.status, filters.category, filters.search, filters.contractId, page]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleFilterChange = (key: keyof AssetFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      handleFilterChange('search', value);
    }, 300);
  };

  const getStatusBadgeClass = (status: string): string => {
    const statusMap: Record<string, string> = {
      'planned': 'status-planned',
      'installed': 'status-installed',
      'active': 'status-active',
      'in_service': 'status-in-service',
      'faulty': 'status-faulty',
      'inactive': 'status-inactive',
      'decommissioned': 'status-decommissioned'
    };
    return statusMap[status] || 'status-default';
  };

  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      'planned': 'Planowany',
      'installed': 'Zainstalowany',
      'active': 'Aktywny',
      'in_service': 'W serwisie',
      'faulty': 'Uszkodzony',
      'inactive': 'Nieaktywny',
      'decommissioned': 'Zlikwidowany'
    };
    return statusLabels[status] || status;
  };

  const getAssetTypeLabel = (type: string): string => {
    const typeLabels: Record<string, string> = {
      'PRZEJAZD': 'Przejazd',
      'SKP': 'SKP',
      'NASTAWNIA': 'Nastawnia',
      'LCS': 'LCS',
      'CUID': 'CUID'
    };
    return typeLabels[type] || type;
  };

  return (
    <div className="asset-list-page">
      <div className="page-header">
        <BackButton />
        <div className="header-content">
          <ModuleIcon name="assets" emoji={MODULE_ICONS.assets} size={36} />
          <div>
            <h1>Obiekty</h1>
            <p className="page-subtitle">
              Lista obiektów infrastruktury ({total} obiektów)
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="filter-type">Typ:</label>
          <select
            id="filter-type"
            value={filters.assetType || ''}
            onChange={(e) => handleFilterChange('assetType', e.target.value)}
          >
            <option value="">Wszystkie</option>
            <option value="PRZEJAZD">Przejazd</option>
            <option value="SKP">SKP</option>
            <option value="NASTAWNIA">Nastawnia</option>
            <option value="LCS">LCS</option>
            <option value="CUID">CUID</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-status">Status:</label>
          <select
            id="filter-status"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">Wszystkie</option>
            <option value="planned">Planowany</option>
            <option value="installed">Zainstalowany</option>
            <option value="active">Aktywny</option>
            <option value="in_service">W serwisie</option>
            <option value="faulty">Uszkodzony</option>
            <option value="inactive">Nieaktywny</option>
            <option value="decommissioned">Zlikwidowany</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-category">Kategoria:</label>
          <select
            id="filter-category"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">Wszystkie</option>
            <option value="KAT A">KAT A</option>
            <option value="KAT B">KAT B</option>
            <option value="KAT C">KAT C</option>
            <option value="KAT E">KAT E</option>
            <option value="KAT F">KAT F</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label htmlFor="filter-search">🔍 Szukaj:</label>
          <input
            id="filter-search"
            type="text"
            placeholder="Nazwa, numer, lokalizacja..."
            value={searchInputValue}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <p>⏳ Ładowanie obiektów...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchAssets}>Spróbuj ponownie</button>
        </div>
      )}

      {/* Assets Table */}
      {!loading && !error && (
        <>
          {assets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏗️</div>
              <h3>Brak obiektów</h3>
              <p>Zmień filtry lub utwórz nowy obiekt kończąc zadanie instalacyjne.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="assets-table">
                <thead>
                  <tr>
                    <th>Numer</th>
                    <th>Typ</th>
                    <th>Nazwa</th>
                    <th>Kategoria</th>
                    <th>Lokalizacja</th>
                    <th>Status</th>
                    <th>Data instalacji</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr
                      key={asset.id}
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/assets/${asset.id}`);
                        }
                      }}
                      className="clickable-row"
                      role="link"
                      tabIndex={0}
                    >
                      <td className="asset-number">{asset.assetNumber}</td>
                      <td>{getAssetTypeLabel(asset.assetType)}</td>
                      <td className="asset-name">{asset.name}</td>
                      <td>{asset.category || '-'}</td>
                      <td className="asset-location">
                        {asset.liniaKolejowa && asset.kilometraz
                          ? `${asset.liniaKolejowa} km ${asset.kilometraz}`
                          : asset.miejscowosc || '-'}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(asset.status)}`}>
                          {getStatusLabel(asset.status)}
                        </span>
                      </td>
                      <td>
                        {asset.actualInstallationDate
                          ? new Date(asset.actualInstallationDate).toLocaleDateString('pl-PL')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                ← Poprzednia
              </button>
              <span className="page-info">
                Strona {page} z {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Następna →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
