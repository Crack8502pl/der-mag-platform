/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/UserManagementPage.tsx
// User management page - create, edit, deactivate users

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import type { User, CreateUserDto, Role } from '../../types/admin.types';

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [automationModalUser, setAutomationModalUser] = useState<User | null>(null);
  const [automationReason, setAutomationReason] = useState('');
  const [automationSaving, setAutomationSaving] = useState(false);
  
  const [newUser, setNewUser] = useState<CreateUserDto>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    roleId: 3, // default to technician
    phone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setError('Nie udało się pobrać danych');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      const result = await adminService.createUser(newUser);
      
      setSuccess(`Użytkownik utworzony! OTP: ${result.otp} (zapisz to hasło - zostanie wysłane na email)`);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        roleId: 3,
        phone: '',
      });
      
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się utworzyć użytkownika');
      console.error(err);
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    if (!confirm(`Czy na pewno chcesz zresetować hasło użytkownika ${username}?`)) {
      return;
    }

    try {
      const result = await adminService.resetUserPassword(userId);
      alert(`Hasło zresetowane! Nowe OTP: ${result.otp}\n\nZostało wysłane na email użytkownika.`);
      await loadData();
    } catch (err: any) {
      alert('Nie udało się zresetować hasła: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.active) {
        await adminService.deactivateUser(user.id);
        setSuccess(`Użytkownik ${user.username} został dezaktywowany`);
      } else {
        await adminService.activateUser(user.id);
        setSuccess(`Użytkownik ${user.username} został aktywowany`);
      }
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zmienić statusu użytkownika');
    }
  };

  const handleOpenPauseModal = (user: User) => {
    setAutomationModalUser(user);
    setAutomationReason(user.emailAutomationPauseReason || '');
  };

  const handleClosePauseModal = () => {
    setAutomationModalUser(null);
    setAutomationReason('');
    setAutomationSaving(false);
  };

  const handleUpdateEmailAutomation = async (user: User, paused: boolean, reason?: string) => {
    try {
      setAutomationSaving(true);
      setError('');
      setSuccess('');

      await adminService.updateUserEmailAutomation(user.id, {
        paused,
        reason: paused ? reason?.trim() : undefined,
      });

      setSuccess(
        paused
          ? `Automat e-mail został wstrzymany dla ${user.username}.`
          : `Automat e-mail został wznowiony dla ${user.username}.`,
      );
      handleClosePauseModal();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zaktualizować automatu e-mail');
      setAutomationSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Ładowanie...</div>;
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Zarządzanie użytkownikami</h1>
        <p className="subtitle">Twórz, edytuj i zarządzaj użytkownikami systemu</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Szukaj użytkownika..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Nowy użytkownik
        </button>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Użytkownik</th>
              <th>Email</th>
              <th>Rola</th>
              <th>Status</th>
              <th>Automat e-mail</th>
              <th>Ostatnie logowanie</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <br />
                    <small>@{user.username}</small>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className="badge">{user.role?.name || 'N/A'}</span>
                </td>
                <td>
                  <span className={`status ${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? 'Aktywny' : 'Nieaktywny'}
                  </span>
                  {user.forcePasswordChange && (
                    <span className="badge badge-warning">Wymaga zmiany hasła</span>
                  )}
                </td>
                <td>
                  <span className={`status ${user.emailAutomationPaused ? 'inactive' : 'active'}`}>
                    {user.emailAutomationPaused ? 'Wstrzymany' : 'Aktywny'}
                  </span>
                  {user.emailAutomationPauseReason && (
                    <div className="meta-text" title={user.emailAutomationPauseReason}>
                      {user.emailAutomationPauseReason.length > 48
                        ? `${user.emailAutomationPauseReason.slice(0, 48)}…`
                        : user.emailAutomationPauseReason}
                    </div>
                  )}
                </td>
                <td>
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('pl-PL') : 'Nigdy'}
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => handleResetPassword(user.id, user.username)}
                    >
                      Reset hasła
                    </button>
                    <button
                      className={`btn-small ${user.active ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.active ? 'Dezaktywuj' : 'Aktywuj'}
                    </button>
                    <button
                      className={`btn-small ${user.emailAutomationPaused ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => {
                        if (user.emailAutomationPaused) {
                          void handleUpdateEmailAutomation(user, false);
                          return;
                        }
                        handleOpenPauseModal(user);
                      }}
                    >
                      {user.emailAutomationPaused ? 'Wznów automat' : 'Wstrzymaj automat'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nowy użytkownik</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Login *</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  className="form-control"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Imię *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Nazwisko *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Telefon</label>
                <input
                  type="tel"
                  className="form-control"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Rola *</label>
                <select
                  className="form-control"
                  value={newUser.roleId}
                  onChange={(e) => setNewUser({ ...newUser, roleId: parseInt(e.target.value) })}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Anuluj
                </button>
                <button type="submit" className="btn btn-primary">
                  Utwórz użytkownika
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {automationModalUser && (
        <div className="modal-overlay" onClick={handleClosePauseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Wstrzymaj automat e-mail</h2>
            <p className="modal-description">
              Wprowadź opcjonalny powód wstrzymania dla użytkownika <strong>{automationModalUser.username}</strong>.
            </p>
            <div className="form-group">
              <label htmlFor="automation-reason">Powód wstrzymania</label>
              <textarea
                id="automation-reason"
                className="form-control"
                rows={4}
                maxLength={500}
                value={automationReason}
                onChange={(e) => setAutomationReason(e.target.value)}
                placeholder="Np. urlop, testy, tymczasowe wyłączenie"
              />
              <small className="helper-text">{automationReason.length}/500 znaków</small>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleClosePauseModal} disabled={automationSaving}>
                Anuluj
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleUpdateEmailAutomation(automationModalUser, true, automationReason)}
                disabled={automationSaving}
              >
                {automationSaving ? 'Zapisywanie...' : 'Wstrzymaj automat'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .user-management-page {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #7f8c8d;
        }

        .back-button {
          background: none;
          border: none;
          color: #3498db;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 10px;
          padding: 5px 10px;
        }

        .back-button:hover {
          background: #f0f0f0;
          border-radius: 4px;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 10px;
        }

        .search-input {
          flex: 1;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .users-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f5f5f5;
          padding: 15px;
          text-align: left;
          font-weight: 600;
          color: #2c3e50;
          border-bottom: 2px solid #e0e0e0;
        }

        td {
          padding: 15px;
          border-bottom: 1px solid #f0f0f0;
        }

        .user-info strong {
          color: #2c3e50;
        }

        .user-info small {
          color: #7f8c8d;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          background: #e0e0e0;
          color: #2c3e50;
        }

        .badge-warning {
          background: #fff3cd;
          color: #856404;
          margin-left: 5px;
        }

        .meta-text {
          margin-top: 6px;
          font-size: 12px;
          color: var(--text-secondary);
          max-width: 220px;
        }

        .status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status.active {
          background: #d4edda;
          color: #155724;
        }

        .status.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .actions {
          display: flex;
          gap: 5px;
        }

        .btn, .btn-small {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover {
          background: #2980b9;
        }

        .btn-secondary {
          background: #95a5a6;
          color: white;
        }

        .btn-secondary:hover {
          background: #7f8c8d;
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
        }

        .btn-danger:hover {
          background: #c0392b;
        }

        .btn-success {
          background: #27ae60;
          color: white;
        }

        .btn-success:hover {
          background: #229954;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #2c3e50;
        }

        .modal-description {
          margin: 0 0 16px;
          color: var(--text-secondary);
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }

        .form-control {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-control:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        textarea.form-control {
          resize: vertical;
        }

        .helper-text {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .alert {
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .alert-success {
          background: #efe;
          border: 1px solid #cfc;
          color: #3c3;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #7f8c8d;
        }
      `}</style>
    </div>
  );
};
