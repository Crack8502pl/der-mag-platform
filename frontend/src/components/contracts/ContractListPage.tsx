// src/components/contracts/ContractListPage.tsx
// Main contracts list page with CRUD operations

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ContractCreateModal } from './ContractCreateModal';
import { ContractImportModal } from './ContractImportModal';
import { ContractWizardModal } from './wizard';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { useAuth } from '../../hooks/useAuth';
import type { Contract } from '../../services/contract.service';
import api from '../../services/api';
import './ContractListPage.css';

export const ContractListPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Manager list for filter
  const [managers, setManagers] = useState<Array<{
    id: number;
    firstName: string;
    lastName: string;
    employeeCode?: string;
  }>>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContracts, setTotalContracts] = useState(0);
  const itemsPerPage = 30;
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Permission checks
  const canCreate = hasPermission('contracts', 'create');
  const canUpdate = hasPermission('contracts', 'update');
  const canApprove = hasPermission('contracts', 'approve');
  const canDelete = hasPermission('contracts', 'delete');
  const canImport = hasPermission('contracts', 'import');

  useEffect(() => {
    loadContracts();
  }, [searchTerm, filterStatus, filterManager, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    loadManagers();
  }, []);

  const loadManagers = async () => {
    try {
      const response = await api.get('/users/managers');
      const data = response.data.data || response.data || [];
      setManagers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Błąd pobierania listy kierowników:', err);
      setManagers([]);
      setError('Nie udało się pobrać listy kierowników. Filtr może być niedostępny.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder
      };
      
      if (searchTerm) params.search = searchTerm;
      if (filterStatus) params.status = filterStatus;
      
      // Auto-filter by current user for non-admin users
      if (user && user.role !== 'admin' && user.id) {
        params.projectManagerId = user.id;
      } else if (filterManager) {
        params.projectManagerId = parseInt(filterManager, 10);
      }
      
      const response = await api.get('/contracts', { params });
      
      const data = response.data.data || response.data;
      setContracts(Array.isArray(data) ? data : []);

      // Use pagination from response if available
      if (response.data.pagination) {
        setTotalContracts(response.data.pagination.total || 0);
        setTotalPages(response.data.pagination.totalPages || 1);
      } else {
        setTotalContracts(response.data.count || data.length || 0);
        setTotalPages(Math.ceil((response.data.count || data.length) / itemsPerPage));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania kontraktów');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (contractId: number) => {
    if (!confirm('Czy na pewno chcesz zatwierdzić ten kontrakt?')) return;
    
    try {
      await api.post(`/contracts/${contractId}/approve`);
      setSuccess('Kontrakt zatwierdzony pomyślnie');
      loadContracts();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zatwierdzania kontraktu');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (contractId: number, contractNumber: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć kontrakt ${contractNumber}?`)) return;
    
    try {
      await api.delete(`/contracts/${contractId}`);
      setSuccess('Kontrakt usunięty pomyślnie');
      loadContracts();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania kontraktu');
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

  const handleContractCreated = () => {
    setShowCreateModal(false);
    setSuccess('Kontrakt utworzony pomyślnie');
    loadContracts();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleContractUpdated = () => {
    setEditingContract(null);
    setSuccess('Kontrakt zaktualizowany pomyślnie');
    loadContracts();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleImportCompleted = (count: number) => {
    setShowImportModal(false);
    setSuccess(`Zaimportowano ${count} kontraktów`);
    loadContracts();
    setTimeout(() => setSuccess(''), 5000);
  };

  if (loading && contracts.length === 0) {
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
          <ModuleIcon name="contracts" emoji={MODULE_ICONS.contracts} size={36} />
        </div>
        <h1>Kontrakty</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Toolbar */}
      <div className="contracts-toolbar card">
        <div className="toolbar-row">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Szukaj po numerze lub nazwie..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="toolbar-buttons">
            {canImport && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowImportModal(true)}
              >
                📥 Import
              </button>
            )}
            {canCreate && (
              <button
                className="btn btn-wizard"
                onClick={() => setShowWizardModal(true)}
              >
                🧙‍♂️ Kreator
              </button>
            )}
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Dodaj kontrakt
              </button>
            )}
          </div>
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
            <option value="PENDING_CONFIGURATION">⚠️ Do konfiguracji</option>
            <option value="CREATED">Utworzony</option>
            <option value="APPROVED">Zatwierdzony</option>
            <option value="IN_PROGRESS">W realizacji</option>
            <option value="COMPLETED">Zakończony</option>
            <option value="CANCELLED">Anulowany</option>
            <option value="ACTIVE">Aktywny (Symfonia)</option>
            <option value="INACTIVE">Nieaktywny (Symfonia)</option>
          </select>
          
          {user && user.role === 'admin' && (
            <select
              className="filter-select"
              value={filterManager}
              onChange={(e) => {
                setFilterManager(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Wszyscy kierownicy</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                  {m.employeeCode ? ` (${m.employeeCode})` : ''}
                </option>
              ))}
            </select>
          )}

          {user && user.role !== 'admin' && (
            <div className="filter-info">
              📋 Wyświetlam tylko moje kontrakty
            </div>
          )}
          
          <div className="contracts-count">
            Znaleziono: <strong>{totalContracts}</strong> kontraktów
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="contracts-table-container card">
        <table className="contracts-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="sortable">
                ID {getSortIcon('id')}
              </th>
              <th onClick={() => handleSort('contractNumber')} className="sortable">
                Numer {getSortIcon('contractNumber')}
              </th>
              <th onClick={() => handleSort('customName')} className="sortable">
                Nazwa {getSortIcon('customName')}
              </th>
              <th>Status</th>
              <th>Kierownik</th>
              <th onClick={() => handleSort('orderDate')} className="sortable">
                Data zamówienia {getSortIcon('orderDate')}
              </th>
              <th>Podsystemy</th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                Utworzono {getSortIcon('createdAt')}
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Brak kontraktów do wyświetlenia
                </td>
              </tr>
            ) : (
              contracts.map((contract) => (
                <tr key={contract.id}>
                  <td>{contract.id}</td>
                  <td>
                    <code className="contract-number">{contract.contractNumber}</code>
                  </td>
                  <td>
                    <span 
                      className="contract-name clickable"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      {contract.customName}
                    </span>
                  </td>
                  <td>
                    <ContractStatusBadge status={contract.status} />
                  </td>
                  <td>
                    {contract.projectManager 
                      ? `${contract.projectManager.firstName} ${contract.projectManager.lastName}`
                      : contract.managerCode || 'N/A'
                    }
                  </td>
                  <td>
                    {new Date(contract.orderDate).toLocaleDateString('pl-PL')}
                  </td>
                  <td>
                    <span className="subsystems-count">
                      {contract.subsystems?.length || 0}
                    </span>
                  </td>
                  <td>
                    {new Date(contract.createdAt).toLocaleDateString('pl-PL')}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-icon" 
                        title="Podgląd"
                        onClick={() => navigate(`/contracts/${contract.id}`)}
                      >
                        👁️
                      </button>
                      {canUpdate && (
                        <button 
                          className="btn btn-icon" 
                          title="Edytuj"
                          onClick={() => setEditingContract(contract)}
                        >
                          ✏️
                        </button>
                      )}
                      {canApprove && contract.status === 'CREATED' && (
                        <button 
                          className="btn btn-icon btn-success" 
                          title="Zatwierdź"
                          onClick={() => handleApprove(contract.id)}
                        >
                          ✅
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          className="btn btn-icon btn-danger" 
                          title="Usuń"
                          onClick={() => handleDelete(contract.id, contract.contractNumber)}
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

      {/* Modals */}
      {showCreateModal && (
        <ContractCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleContractCreated}
        />
      )}

      {editingContract && (
        <ContractWizardModal
          editMode={true}
          contractToEdit={editingContract}
          onClose={() => setEditingContract(null)}
          onSuccess={handleContractUpdated}
        />
      )}

      {showImportModal && (
        <ContractImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportCompleted}
        />
      )}

      {showWizardModal && (
        <ContractWizardModal
          onClose={() => setShowWizardModal(false)}
          onSuccess={handleContractCreated}
        />
      )}
    </div>
  );
};
