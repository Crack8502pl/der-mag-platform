// src/components/brigades/BrigadeListPage.tsx
// Main brigade list page with CRUD operations and member management

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { BrigadeCreateModal } from './BrigadeCreateModal';
import { BrigadeEditModal } from './BrigadeEditModal';
import { BrigadeMembersModal } from './BrigadeMembersModal';
import brigadeService from '../../services/brigade.service';
import type { Brigade } from '../../types/brigade.types';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/grover-theme.css';
import '../modules/ModulePage.css';
import './BrigadeListPage.css';

export const BrigadeListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBrigades, setTotalBrigades] = useState(0);
  const itemsPerPage = 20;
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null);
  const [managingMembers, setManagingMembers] = useState<Brigade | null>(null);

  // Permission checks
  const canCreate = hasPermission('brigades', 'create');
  const canUpdate = hasPermission('brigades', 'update');
  const canDelete = hasPermission('brigades', 'delete');

  useEffect(() => {
    loadBrigades();
  }, [filterActive, currentPage]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadBrigades();
      } else {
        setCurrentPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadBrigades = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await brigadeService.getAll({
        active: filterActive,
        page: currentPage,
        limit: itemsPerPage,
      });
      
      setBrigades(response.brigades || []);
      setTotalBrigades(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania brygad');
      setBrigades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę brygadę?')) return;
    
    try {
      await brigadeService.delete(id);
      setSuccess('Brygada została usunięta');
      loadBrigades();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania brygady');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setSuccess('Brygada została utworzona');
    loadBrigades();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEditSuccess = () => {
    setEditingBrigade(null);
    setSuccess('Brygada została zaktualizowana');
    loadBrigades();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleMembersClose = () => {
    setManagingMembers(null);
    loadBrigades(); // Reload to get updated member counts
  };

  // Filter brigades by search term (client-side for better UX)
  const filteredBrigades = brigades.filter(brigade => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      brigade.code.toLowerCase().includes(search) ||
      brigade.name.toLowerCase().includes(search) ||
      brigade.description?.toLowerCase().includes(search)
    );
  });

  const activeBrigade = editingBrigade ?? managingMembers;
  const displayedBrigades = activeBrigade
    ? [brigades.find(b => b.id === activeBrigade.id) ?? activeBrigade]
    : filteredBrigades;

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      
      <div className="module-header">
        <div className="module-icon">
          <ModuleIcon name="brigades" emoji={MODULE_ICONS.brigades} size={36} />
        </div>
        <h1>Brygady</h1>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}
      
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="brigades-toolbar card">
        <div className="toolbar-row">
          <input
            type="text"
            placeholder="🔍 Szukaj brygady..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="toolbar-filters">
            <select
              className="filter-select"
              value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setFilterActive(value === 'all' ? undefined : value === 'active');
                setCurrentPage(1);
              }}
            >
              <option value="all">Wszystkie</option>
              <option value="active">Aktywne</option>
              <option value="inactive">Nieaktywne</option>
            </select>
          </div>

          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Nowa Brygada
            </button>
          )}
        </div>

        <div className="brigades-count">
          Znaleziono: <strong>{displayedBrigades.length}</strong> z {totalBrigades} brygad
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Ładowanie brygad...</p>
        </div>
      ) : filteredBrigades.length === 0 ? (
        <div className="empty-state">
          <p>Nie znaleziono brygad</p>
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Utwórz pierwszą brygadę
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="brigades-table-container card">
            <table className="brigades-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Nazwa</th>
                  <th>Opis</th>
                  <th>Status</th>
                  <th>Członkowie</th>
                  <th>Zadania</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {displayedBrigades.map((brigade) => (
                  <tr key={brigade.id}>
                    <td>
                      <strong className="brigade-code">{brigade.code}</strong>
                    </td>
                    <td>{brigade.name}</td>
                    <td className="brigade-description">
                      {brigade.description || '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${brigade.active ? 'active' : 'inactive'}`}>
                        {brigade.active ? '✅ Aktywna' : '❌ Nieaktywna'}
                      </span>
                    </td>
                    <td>
                      <span className="count-badge">
                        {brigade.members?.filter(m => m.active).length || 0} / {brigade.members?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span className="count-badge">
                        {brigade.serviceTasks?.length || 0}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setManagingMembers(brigade)}
                          title="Zarządzaj członkami"
                        >
                          👥
                        </button>
                        {canUpdate && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingBrigade(brigade)}
                            title="Edytuj"
                          >
                            ✏️
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(brigade.id)}
                            title="Usuń"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
              <span className="pagination-info">
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
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <BrigadeCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingBrigade && (
        <BrigadeEditModal
          brigade={editingBrigade}
          onClose={() => setEditingBrigade(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {managingMembers && (
        <BrigadeMembersModal
          brigade={managingMembers}
          onClose={handleMembersClose}
        />
      )}
    </div>
  );
};
