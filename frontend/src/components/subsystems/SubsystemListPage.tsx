// src/components/subsystems/SubsystemListPage.tsx
// Component for listing subsystems with filters and documentation

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { subsystemService } from '../../services/subsystem.service';
import type { Subsystem } from '../../services/subsystem.service';
import { SubsystemDocumentationModal } from './SubsystemDocumentationModal';
import './SubsystemListPage.css';

// System type icons mapping
const SYSTEM_ICONS: Record<string, string> = {
  SMOKIP_A: '🔵',
  SMOKIP_B: '🟢',
  SKD: '🔐',
  SSWIN: '🚨',
  CCTV: '📹',
  SMW: '📺',
  SDIP: '📢',
  SUG: '🔥',
  SSP: '🚒',
  LAN: '🌐',
  OTK: '📡',
  ZASILANIE: '⚡'
};

// System type names
const SYSTEM_NAMES: Record<string, string> = {
  SMOKIP_A: 'SMOK-A',
  SMOKIP_B: 'SMOK-B',
  SKD: 'System Kontroli Dostępu',
  SSWIN: 'System Sygnalizacji Włamania',
  CCTV: 'Telewizja Przemysłowa',
  SMW: 'System Monitoringu Wizyjnego',
  SDIP: 'Dynamiczna Informacja Pasażerska',
  SUG: 'Stałe Urządzenia Gaśnicze',
  SSP: 'System Stwierdzenia Pożaru',
  LAN: 'Okablowanie LAN',
  OTK: 'Okablowanie OTK',
  ZASILANIE: 'Zasilanie'
};

export const SubsystemListPage: React.FC = () => {
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [systemTypeFilter, setSystemTypeFilter] = useState('');
  const [projectManagerFilter, setProjectManagerFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 30;
  
  // Documentation modal
  const [selectedSubsystem, setSelectedSubsystem] = useState<Subsystem | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  useEffect(() => {
    loadSubsystems();
  }, [systemTypeFilter, projectManagerFilter, searchQuery, sortBy, sortOrder, page]);

  const loadSubsystems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subsystemService.getList({
        systemType: systemTypeFilter || undefined,
        projectManager: projectManagerFilter || undefined,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        page,
        limit
      });
      setSubsystems(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas ładowania podsystemów');
      console.error('Error loading subsystems:', err);
    } finally {
      setLoading(false);
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

  const handleDocumentClick = (subsystem: Subsystem) => {
    setSelectedSubsystem(subsystem);
    setShowDocModal(true);
  };

  const handleCloseModal = () => {
    setShowDocModal(false);
    setSelectedSubsystem(null);
    // Reload to update document count
    loadSubsystems();
  };

  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return '';
    return sortOrder === 'ASC' ? ' ↑' : ' ↓';
  };

  return (
    <div className="subsystem-list-page">
      <BackButton to="/dashboard" />
      
      <div className="page-header">
        <div className="module-icon">🔧</div>
        <h1>Podsystemy</h1>
      </div>

      {/* Filters */}
      <div className="filters-section card">
        <div className="filter-group">
          <label>Typ systemu:</label>
          <select 
            value={systemTypeFilter} 
            onChange={(e) => {
              setSystemTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Wszystkie</option>
            {Object.keys(SYSTEM_ICONS).map(type => (
              <option key={type} value={type}>
                {SYSTEM_ICONS[type]} {SYSTEM_NAMES[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Menedżer projektu:</label>
          <input 
            type="text" 
            value={projectManagerFilter}
            onChange={(e) => {
              setProjectManagerFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filtruj po menedżerze..."
          />
        </div>

        <div className="filter-group">
          <label>Wyszukaj:</label>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Numer podsystemu lub kontraktu..."
          />
        </div>

        <button 
          className="btn-secondary"
          onClick={() => {
            setSystemTypeFilter('');
            setProjectManagerFilter('');
            setSearchQuery('');
            setPage(1);
          }}
        >
          Wyczyść filtry
        </button>
      </div>

      {/* Results */}
      <div className="results-section card">
        {loading && <div className="loading">Ładowanie podsystemów...</div>}
        
        {error && <div className="error-message">{error}</div>}
        
        {!loading && !error && subsystems.length === 0 && (
          <div className="no-results">
            Nie znaleziono podsystemów spełniających kryteria.
          </div>
        )}

        {!loading && !error && subsystems.length > 0 && (
          <>
            <div className="subsystems-table-wrapper">
              <table className="subsystems-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('subsystemNumber')}>
                      Numer{getSortIndicator('subsystemNumber')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('systemType')}>
                      Typ systemu{getSortIndicator('systemType')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('quantity')}>
                      Ilość{getSortIndicator('quantity')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('status')}>
                      Status{getSortIndicator('status')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('contractNumber')}>
                      Kontrakt{getSortIndicator('contractNumber')}
                    </th>
                    <th className="sortable" onClick={() => handleSort('projectManager')}>
                      Menedżer{getSortIndicator('projectManager')}
                    </th>
                    <th>Dokumentacja</th>
                  </tr>
                </thead>
                <tbody>
                  {subsystems.map((subsystem) => (
                    <tr key={subsystem.id}>
                      <td className="subsystem-number">
                        {subsystem.subsystemNumber}
                      </td>
                      <td className="system-type">
                        <div className="system-type-content">
                          <span className="system-icon">
                            {SYSTEM_ICONS[subsystem.systemType] || '❓'}
                          </span>
                          <span className="system-name">
                            {SYSTEM_NAMES[subsystem.systemType] || subsystem.systemType}
                          </span>
                        </div>
                      </td>
                      <td className="quantity">{subsystem.quantity}</td>
                      <td className="status">
                        <span className={`status-badge status-${subsystem.status.toLowerCase()}`}>
                          {subsystem.status}
                        </span>
                      </td>
                      <td className="contract-number">
                        {subsystem.contract?.contractNumber || 'N/A'}
                      </td>
                      <td className="project-manager">
                        {subsystem.contract?.projectManager 
                          ? (typeof subsystem.contract.projectManager === 'string'
                              ? subsystem.contract.projectManager
                              : `${subsystem.contract.projectManager.firstName} ${subsystem.contract.projectManager.lastName}`)
                          : 'N/A'
                        }
                      </td>
                      <td className="documents">
                        <button
                          className="btn-documents"
                          onClick={() => handleDocumentClick(subsystem)}
                          title="Otwórz dokumentację"
                        >
                          📄 ({subsystem.documentCount || 0})
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                className="btn-secondary"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                ← Poprzednia
              </button>
              <span className="page-info">
                Strona {page} z {totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Następna →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Documentation Modal */}
      {showDocModal && selectedSubsystem && (
        <SubsystemDocumentationModal
          subsystem={selectedSubsystem}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
