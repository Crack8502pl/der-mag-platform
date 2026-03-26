// src/components/brigades/tabs/WorkersTab.tsx
// Workers tab - list of users with worker role

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import brigadeService from '../../../services/brigade.service';

interface Worker {
  id: number;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  active: boolean;
  brigade?: {
    id: number;
    code: string;
    name: string;
  } | null;
}

export const WorkersTab: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      setError('');

      // Pobierz pracowników
      const response = await api.get('/users', { params: { role: 'worker', limit: 200 } });
      const data = response.data.data || response.data;
      const users = Array.isArray(data) ? data : data?.users || [];

      // Pobierz wszystkie brygady z członkami
      const brigadesResponse = await brigadeService.getAll({ active: true, limit: 100 });
      const brigades = brigadesResponse.brigades || [];

      // Mapuj pracowników z ich brygadami
      const workersWithBrigades = users.map((user: Worker) => {
        const memberBrigade = brigades.find(b =>
          b.members?.some(m => m.userId === user.id && m.active)
        );
        return {
          ...user,
          brigade: memberBrigade
            ? { id: memberBrigade.id, code: memberBrigade.code, name: memberBrigade.name }
            : null,
        };
      });

      setWorkers(workersWithBrigades);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania pracowników');
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    if (filterStatus === 'active' && !w.active) return false;
    if (filterStatus === 'inactive' && w.active) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      `${w.firstName} ${w.lastName}`.toLowerCase().includes(s) ||
      w.email.toLowerCase().includes(s) ||
      (w.employeeCode || '').toLowerCase().includes(s) ||
      (w.phone || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="brigades-tab-content">
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
            placeholder="🔍 Szukaj pracownika..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="toolbar-filters">
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">Wszyscy</option>
              <option value="active">Aktywni</option>
              <option value="inactive">Nieaktywni</option>
            </select>
          </div>
        </div>
        <div className="brigades-count">
          Znaleziono: <strong>{filteredWorkers.length}</strong> z {workers.length} pracowników
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Ładowanie pracowników...</p>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="empty-state">
          <p>Nie znaleziono pracowników z grupy Workers</p>
        </div>
      ) : (
        <div className="brigades-table-container card">
          <table className="brigades-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Imię i Nazwisko</th>
                <th>Email</th>
                <th>Telefon</th>
                <th>Przypisana brygada</th>
                <th>Urlop zaakceptowany</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((worker) => (
                <tr key={worker.id}>
                  <td>
                    <strong className="brigade-code">{worker.employeeCode || '—'}</strong>
                  </td>
                  <td>
                    {worker.firstName} {worker.lastName}
                  </td>
                  <td>{worker.email}</td>
                  <td>{worker.phone || '—'}</td>
                  <td>
                    {worker.brigade ? (
                      <span className="brigade-code">{worker.brigade.code}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Nieprzypisany</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    {/* TODO: Dane z zewnętrznej bazy */}
                  </td>
                  <td>
                    <span className={`status-badge ${worker.active ? 'active' : 'inactive'}`}>
                      {worker.active ? '✅ Aktywny' : '❌ Nieaktywny'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
