// src/components/users/UserListPage.tsx
// Comprehensive user management page with list, filters, and actions

import React, { useState, useEffect } from 'react';
import { BackButton } from '../common/BackButton';
import { UserCreateModal } from './UserCreateModal';
import { UserEditModal } from './UserEditModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { DeactivateUserModal } from './DeactivateUserModal';
import { UserStatusBadge } from './UserStatusBadge';
import axios from 'axios';
import { FALLBACK_ROLES } from '../../constants/roles';
import './UserListPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  active: boolean;
  roleId: number;
  role: {
    id: number;
    name: string;
    description: string;
  };
  lastLogin?: string;
  createdAt: string;
  forcePasswordChange: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 30;
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [searchTerm, filterRole, filterStatus, sortBy, sortOrder, currentPage]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setError('Brak tokenu autoryzacji. Zaloguj się ponownie.');
        setLoading(false);
        return;
      }
      
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder
      };
      
      if (searchTerm) params.search = searchTerm;
      if (filterRole) params.role = filterRole;
      if (filterStatus) params.status = filterStatus;
      
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      // Obsługa różnych formatów odpowiedzi (backward compatibility)
      const responseData = response.data.data || response.data;
      const users = responseData.users || [];
      const pagination = responseData.pagination || { totalPages: 1, total: 0 };
      
      if (!Array.isArray(users)) {
        throw new Error('Nieprawidłowy format odpowiedzi serwera');
      }
      
      setUsers(users);
      setTotalPages(pagination.totalPages);
      setTotalUsers(pagination.total);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Błąd pobierania użytkowników';
      setError(errorMessage);
      console.error('Error loading users:', err);
      
      // Ustaw puste dane w przypadku błędu
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/admin/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Bezpieczne pobieranie ról z różnych formatów odpowiedzi
      // Handle different response formats for backward compatibility
      const rolesData = response.data?.data || response.data || [];
      
      if (!Array.isArray(rolesData)) {
        console.warn('Nieprawidłowy format ról, używam fallback');
        throw new Error('Invalid roles format');
      }
      
      setRoles(rolesData);
    } catch (err) {
      console.error('Błąd pobierania ról:', err);
      
      // Fallback - podstawowe role gdy endpoint nie działa
      setRoles(FALLBACK_ROLES);
    }
  };

  const handleUserCreated = () => {
    setShowCreateModal(false);
    setSuccess('Użytkownik został utworzony pomyślnie');
    loadUsers();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    setSuccess('Użytkownik został zaktualizowany');
    loadUsers();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handlePasswordReset = () => {
    setResetPasswordUser(null);
    setSuccess('Hasło zostało zresetowane');
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleUserDeactivated = () => {
    setDeactivateUser(null);
    setSuccess('Status użytkownika został zmieniony');
    loadUsers();
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleActivateUser = async (userId: number) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE_URL}/users/${userId}/activate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Użytkownik został aktywowany');
      loadUsers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd aktywacji użytkownika');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${username}? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Użytkownik został usunięty');
      loadUsers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd usuwania użytkownika');
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

  if (loading && users.length === 0) {
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
        <div className="module-icon">👥</div>
        <h1>Zarządzanie użytkownikami</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters and search */}
      <div className="user-list-toolbar card">
        <div className="toolbar-row">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Szukaj po imieniu, nazwisku, email, loginie..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Dodaj użytkownika
          </button>
        </div>
        
        <div className="toolbar-filters">
          <select
            className="filter-select"
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie role</option>
            {Array.isArray(roles) && roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
          
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Wszystkie statusy</option>
            <option value="active">Aktywni</option>
            <option value="inactive">Nieaktywni</option>
          </select>
          
          <div className="user-count">
            Znaleziono: <strong>{totalUsers}</strong> użytkowników
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="users-table-container card">
        <table className="users-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} className="sortable">
                ID {getSortIcon('id')}
              </th>
              <th onClick={() => handleSort('firstName')} className="sortable">
                Imię i nazwisko {getSortIcon('firstName')}
              </th>
              <th onClick={() => handleSort('email')} className="sortable">
                Email {getSortIcon('email')}
              </th>
              <th onClick={() => handleSort('username')} className="sortable">
                Login {getSortIcon('username')}
              </th>
              <th>Rola</th>
              <th>Status</th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                Data utworzenia {getSortIcon('createdAt')}
              </th>
              <th onClick={() => handleSort('lastLogin')} className="sortable">
                Ostatnie logowanie {getSortIcon('lastLogin')}
              </th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Brak użytkowników do wyświetlenia
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    <div className="user-name">
                      <strong>{user.firstName} {user.lastName}</strong>
                      {user.phone && <small>{user.phone}</small>}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <code>{user.username}</code>
                  </td>
                  <td>
                    <span className="role-badge">{user.role?.name || 'N/A'}</span>
                  </td>
                  <td>
                    <UserStatusBadge user={user} />
                  </td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString('pl-PL')}
                  </td>
                  <td>
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString('pl-PL')
                      : 'Nigdy'}
                  </td>
                  <td>
                    <div className="actions-dropdown">
                      <button className="btn-icon" title="Akcje">⋮</button>
                      <div className="dropdown-menu">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="dropdown-item"
                        >
                          ✏️ Edytuj
                        </button>
                        <button
                          onClick={() => setResetPasswordUser(user)}
                          className="dropdown-item"
                        >
                          🔑 Resetuj hasło
                        </button>
                        {user.active ? (
                          <button
                            onClick={() => setDeactivateUser(user)}
                            className="dropdown-item danger"
                          >
                            🚫 Dezaktywuj
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateUser(user.id)}
                            className="dropdown-item success"
                          >
                            ✅ Aktywuj
                          </button>
                        )}
                        <hr className="dropdown-divider" />
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="dropdown-item danger"
                        >
                          🗑️ Usuń
                        </button>
                      </div>
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
        <UserCreateModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleUserCreated}
        />
      )}

      {editingUser && (
        <UserEditModal
          user={editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdated}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={handlePasswordReset}
        />
      )}

      {deactivateUser && (
        <DeactivateUserModal
          user={deactivateUser}
          onClose={() => setDeactivateUser(null)}
          onSuccess={handleUserDeactivated}
        />
      )}
    </div>
  );
};
