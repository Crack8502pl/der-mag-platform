// src/components/brigades/tabs/BrigadesTab.tsx
// Brigades tab - brigade list with CRUD operations

import React, { useState, useEffect } from 'react';
import { BrigadeCreateModal } from '../modals/BrigadeCreateModal';
import { BrigadeEditModal } from '../BrigadeEditModal';
import { BrigadeMembersModal } from '../BrigadeMembersModal';
import brigadeService from '../../../services/brigade.service';
import type { Brigade } from '../../../types/brigade.types';
import { useAuth } from '../../../hooks/useAuth';

export const BrigadesTab: React.FC = () => {
  const { hasPermission } = useAuth();

  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBrigades, setTotalBrigades] = useState(0);
  const itemsPerPage = 20;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrigade, setEditingBrigade] = useState<Brigade | null>(null);
  const [managingMembers, setManagingMembers] = useState<Brigade | null>(null);

  const canCreate = hasPermission('brigades', 'create');
  const canUpdate = hasPermission('brigades', 'update');
  const canDelete = hasPermission('brigades', 'delete');

  useEffect(() => {
    loadBrigades();
  }, [filterActive, currentPage]);

  useEffect(() => {
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
    loadBrigades();
  };

  const filteredBrigades = brigades.filter((brigade) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      brigade.code.toLowerCase().includes(search) ||
      brigade.name.toLowerCase().includes(search) ||
      brigade.description?.toLowerCase().includes(search)
    );
  });

  const displayedBrigades = (editingBrigade || managingMembers)
    ? filteredBrigades.filter(b => b.id === (editingBrigade?.id ?? managingMembers?.id))
    : filteredBrigades;

  return (
    <div className="brigades-tab-content">
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
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
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
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
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
                    <td className="brigade-description">{brigade.description || '-'}</td>
                    <td>
                      <span className={`status-badge ${brigade.active ? 'active' : 'inactive'}`}>
                        {brigade.active ? '✅ Aktywna' : '❌ Nieaktywna'}
                      </span>
                    </td>
                    <td>
                      <span className="count-badge">
                        {brigade.members?.filter((m) => m.active).length || 0} /{' '}
                        {brigade.members?.length || 0}
                      </span>
                    </td>
                    <td>
                      <span className="count-badge">{brigade.serviceTasks?.length || 0}</span>
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

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Poprzednia
              </button>
              <span className="pagination-info">
                Strona {currentPage} z {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Następna →
              </button>
            </div>
          )}
        </>
      )}

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
        <BrigadeMembersModal brigade={managingMembers} onClose={handleMembersClose} />
      )}
    </div>
  );
};
