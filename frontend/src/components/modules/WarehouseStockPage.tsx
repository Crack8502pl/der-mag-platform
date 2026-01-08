// src/components/modules/WarehouseStockPage.tsx
// Main warehouse stock management page

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { useAuth } from '../../hooks/useAuth';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { WarehouseStock, StockFilters, StockStatus, MaterialType } from '../../types/warehouseStock.types';
import './WarehouseStockPage.css';

export const WarehouseStockPage: React.FC = () => {
  const { hasPermission } = useAuth();
  
  const [items, setItems] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState<StockStatus | ''>('');
  const [filterMaterialType, setFilterMaterialType] = useState<MaterialType | ''>('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const itemsPerPage = 30;
  
  // Dropdown data
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  
  // Modals (placeholders for now)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseStock | null>(null);
  const [detailItem, setDetailItem] = useState<WarehouseStock | null>(null);

  // Permission checks
  const canCreate = hasPermission('warehouse_stock', 'create');
  const canUpdate = hasPermission('warehouse_stock', 'update');
  const canDelete = hasPermission('warehouse_stock', 'delete');
  const canImport = hasPermission('warehouse_stock', 'import');
  const canExport = hasPermission('warehouse_stock', 'export');
  const canViewPrices = hasPermission('warehouse_stock', 'view_prices');

  useEffect(() => {
    loadItems();
  }, [searchTerm, filterCategory, filterSupplier, filterStatus, filterMaterialType, filterLowStock, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters: StockFilters = {};
      if (searchTerm) filters.search = searchTerm;
      if (filterCategory) filters.category = filterCategory;
      if (filterSupplier) filters.supplier = filterSupplier;
      if (filterStatus) filters.status = filterStatus as StockStatus;
      if (filterMaterialType) filters.materialType = filterMaterialType as MaterialType;
      if (filterLowStock) filters.lowStock = true;
      
      const response = await warehouseStockService.getAll(
        filters,
        currentPage,
        itemsPerPage,
        sortBy,
        sortOrder
      );
      
      setItems(response.data);
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania materiałów');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await warehouseStockService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Błąd pobierania kategorii:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const supps = await warehouseStockService.getSuppliers();
      setSuppliers(supps);
    } catch (err) {
      console.error('Błąd pobierania dostawców:', err);
    }
  };

  const handleDelete = async (item: WarehouseStock) => {
    if (!confirm(`Czy na pewno chcesz usunąć materiał ${item.catalogNumber}?`)) return;
    
    try {
      await warehouseStockService.delete(item.id);
      setSuccess('Materiał usunięty pomyślnie');
      loadItems();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania materiału');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'ASC' ? '↑' : '↓';
  };

  const getStatusBadgeClass = (status: StockStatus): string => {
    switch (status) {
      case 'ACTIVE': return 'badge-success';
      case 'OUT_OF_STOCK': return 'badge-danger';
      case 'DISCONTINUED': return 'badge-secondary';
      case 'ORDERED': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  const getStatusLabel = (status: StockStatus): string => {
    switch (status) {
      case 'ACTIVE': return 'Aktywny';
      case 'OUT_OF_STOCK': return 'Brak na stanie';
      case 'DISCONTINUED': return 'Wycofany';
      case 'ORDERED': return 'Zamówiony';
      default: return status;
    }
  };

  const getMaterialTypeLabel = (type: MaterialType): string => {
    switch (type) {
      case 'consumable': return 'Materiał zużywalny';
      case 'device': return 'Urządzenie';
      case 'tool': return 'Narzędzie';
      case 'component': return 'Komponent';
      default: return type;
    }
  };

  const isLowStock = (item: WarehouseStock): boolean => {
    return item.minStockLevel !== undefined && 
           item.minStockLevel !== null && 
           item.quantityInStock <= item.minStockLevel;
  };

  const handleDownloadTemplate = async () => {
    try {
      await warehouseStockService.downloadTemplate();
      setSuccess('Szablon pobrany pomyślnie');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Błąd pobierania szablonu');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleExport = async () => {
    try {
      const filters: StockFilters = {};
      if (searchTerm) filters.search = searchTerm;
      if (filterCategory) filters.category = filterCategory;
      if (filterSupplier) filters.supplier = filterSupplier;
      if (filterStatus) filters.status = filterStatus as StockStatus;
      if (filterMaterialType) filters.materialType = filterMaterialType as MaterialType;
      if (filterLowStock) filters.lowStock = true;
      
      await warehouseStockService.exportToExcel(filters);
      setSuccess('Dane wyeksportowane pomyślnie');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Błąd eksportu danych');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="module-page">
        <BackButton to="/dashboard" />
        <div className="loading">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="module-page warehouse-stock-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">🏭📦</div>
        <h1>Magazyn</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Toolbar */}
      <div className="warehouse-toolbar card">
        <div className="toolbar-row">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Szukaj po numerze katalogowym, nazwie lub opisie..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="toolbar-buttons">
            {canExport && (
              <button
                className="btn btn-secondary"
                onClick={handleExport}
              >
                📤 Export Excel
              </button>
            )}
            {canImport && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={handleDownloadTemplate}
                >
                  📥 Pobierz szablon
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(true)}
                >
                  📥 Import CSV
                </button>
              </>
            )}
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Dodaj materiał
              </button>
            )}
          </div>
        </div>
        
        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie kategorie</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterSupplier}
            onChange={(e) => {
              setFilterSupplier(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszyscy dostawcy</option>
            {suppliers.map(sup => (
              <option key={sup} value={sup}>{sup}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as StockStatus | '');
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie statusy</option>
            <option value="ACTIVE">Aktywny</option>
            <option value="OUT_OF_STOCK">Brak na stanie</option>
            <option value="DISCONTINUED">Wycofany</option>
            <option value="ORDERED">Zamówiony</option>
          </select>

          <select
            className="filter-select"
            value={filterMaterialType}
            onChange={(e) => {
              setFilterMaterialType(e.target.value as MaterialType | '');
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie typy</option>
            <option value="consumable">Materiał zużywalny</option>
            <option value="device">Urządzenie</option>
            <option value="tool">Narzędzie</option>
            <option value="component">Komponent</option>
          </select>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => {
                setFilterLowStock(e.target.checked);
                setCurrentPage(1);
              }}
            />
            <span>Tylko niskie stany</span>
          </label>
          
          <div className="items-count">
            Znaleziono: <strong>{totalItems}</strong> materiałów
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="warehouse-table-container card">
        <table className="warehouse-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('catalogNumber')} className="sortable">
                Numer katalogowy {getSortIcon('catalogNumber')}
              </th>
              <th onClick={() => handleSort('materialName')} className="sortable">
                Nazwa {getSortIcon('materialName')}
              </th>
              <th onClick={() => handleSort('category')} className="sortable">
                Kategoria {getSortIcon('category')}
              </th>
              <th onClick={() => handleSort('unit')} className="sortable">
                Jednostka {getSortIcon('unit')}
              </th>
              <th onClick={() => handleSort('quantityInStock')} className="sortable">
                Stan {getSortIcon('quantityInStock')}
              </th>
              <th>Zarezerwowane</th>
              <th>Dostępne</th>
              {canViewPrices && (
                <th onClick={() => handleSort('unitPrice')} className="sortable">
                  Cena jedn. {getSortIcon('unitPrice')}
                </th>
              )}
              <th>Dostawca</th>
              <th>Lokalizacja</th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {getSortIcon('status')}
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={canViewPrices ? 12 : 11} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Brak materiałów do wyświetlenia
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr 
                  key={item.id} 
                  className={isLowStock(item) ? 'low-stock-row' : ''}
                >
                  <td>
                    <code className="catalog-number">{item.catalogNumber}</code>
                  </td>
                  <td>
                    <span 
                      className="material-name clickable"
                      onClick={() => setDetailItem(item)}
                    >
                      {item.materialName}
                    </span>
                  </td>
                  <td>{item.category || '-'}</td>
                  <td>{item.unit}</td>
                  <td className={isLowStock(item) ? 'low-stock-qty' : ''}>
                    <strong>{item.quantityInStock}</strong>
                    {item.minStockLevel && (
                      <span className="min-level"> / {item.minStockLevel}</span>
                    )}
                  </td>
                  <td>{item.quantityReserved}</td>
                  <td><strong>{item.quantityAvailable}</strong></td>
                  {canViewPrices && (
                    <td>
                      {item.unitPrice ? `${item.unitPrice} ${item.currency}` : '-'}
                    </td>
                  )}
                  <td>{item.supplier || '-'}</td>
                  <td>{item.warehouseLocation || '-'}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-icon" 
                        title="Szczegóły"
                        onClick={() => setDetailItem(item)}
                      >
                        👁️
                      </button>
                      {canUpdate && (
                        <button 
                          className="btn btn-icon" 
                          title="Edytuj"
                          onClick={() => setEditingItem(item)}
                        >
                          ✏️
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          className="btn btn-icon btn-danger" 
                          title="Usuń"
                          onClick={() => handleDelete(item)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
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
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Poprzednia
          </button>
          <span className="page-info">
            Strona {currentPage} z {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Następna →
          </button>
        </div>
      )}

      {/* Modals - placeholders for now */}
      {showCreateModal && (
        <div className="modal-placeholder">
          <p>Modal tworzenia materiału (do zaimplementowania)</p>
          <button onClick={() => setShowCreateModal(false)}>Zamknij</button>
        </div>
      )}
      
      {showImportModal && (
        <div className="modal-placeholder">
          <p>Modal importu CSV (do zaimplementowania)</p>
          <button onClick={() => setShowImportModal(false)}>Zamknij</button>
        </div>
      )}
      
      {editingItem && (
        <div className="modal-placeholder">
          <p>Modal edycji materiału (do zaimplementowania)</p>
          <button onClick={() => setEditingItem(null)}>Zamknij</button>
        </div>
      )}
      
      {detailItem && (
        <div className="modal-placeholder">
          <p>Modal szczegółów materiału (do zaimplementowania)</p>
          <button onClick={() => setDetailItem(null)}>Zamknij</button>
        </div>
      )}
    </div>
  );
};
