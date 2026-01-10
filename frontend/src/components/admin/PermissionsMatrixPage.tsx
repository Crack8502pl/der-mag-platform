// src/components/admin/PermissionsMatrixPage.tsx
// Permissions matrix visualization page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import type { Role } from '../../types/admin.types';
import { AddRoleModal } from './AddRoleModal';
import './PermissionsMatrixPage.css';

interface PermissionModule {
  name: string;
  displayName: string;
  actions: string[];
}

export const PermissionsMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [editedRoles, setEditedRoles] = useState<Role[]>([]);
  const [permissionsSchema, setPermissionsSchema] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [sortBy, setSortBy] = useState<'module' | 'role'>('module');
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, schemaData] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissionsSchema(),
      ]);
      setRoles(rolesData);
      setEditedRoles(JSON.parse(JSON.stringify(rolesData)));
      setPermissionsSchema(schemaData);
    } catch (err) {
      setError('Nie udało się pobrać danych');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionValue = (role: Role, moduleName: string, actionKey: string): boolean | null => {
    // Admin ma wszystkie uprawnienia
    if (role.permissions?.all === true) {
      return true;
    }

    const modulePermissions = role.permissions?.[moduleName];
    if (!modulePermissions) {
      return null;
    }

    const value = modulePermissions[actionKey];
    if (value === true) return true;
    if (value === false) return false;
    return null;
  };

  const togglePermission = (roleId: number, moduleName: string, actionKey: string) => {
    if (!editMode) return;

    setEditedRoles((prevRoles) => {
      return prevRoles.map((role) => {
        if (role.id !== roleId) return role;

        // Don't allow editing admin permissions
        if (role.name === 'admin') return role;

        const currentValue = getPermissionValue(role, moduleName, actionKey);
        let newValue: boolean;

        // Cycle: null -> true -> false -> null
        if (currentValue === null) {
          newValue = true;
        } else if (currentValue === true) {
          newValue = false;
        } else {
          newValue = true; // We'll remove it by not setting it
        }

        const newPermissions = { ...role.permissions };
        if (!newPermissions[moduleName]) {
          newPermissions[moduleName] = {};
        }

        if (newValue === false || currentValue === false) {
          // Remove the permission if cycling back to null
          if (currentValue === false) {
            delete newPermissions[moduleName][actionKey];
          } else {
            newPermissions[moduleName][actionKey] = newValue;
          }
        } else {
          newPermissions[moduleName][actionKey] = newValue;
        }

        // Track changed cell
        const cellKey = `${roleId}-${moduleName}-${actionKey}`;
        setChangedCells((prev) => {
          const newSet = new Set(prev);
          const originalValue = getPermissionValue(
            roles.find((r) => r.id === roleId)!,
            moduleName,
            actionKey
          );
          const editedValue = newPermissions[moduleName]?.[actionKey];

          if (originalValue !== editedValue) {
            newSet.add(cellKey);
          } else {
            newSet.delete(cellKey);
          }
          return newSet;
        });

        return { ...role, permissions: newPermissions };
      });
    });
  };

  const isCellChanged = (roleId: number, moduleName: string, actionKey: string): boolean => {
    const cellKey = `${roleId}-${moduleName}-${actionKey}`;
    return changedCells.has(cellKey);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setError('');

      // Find changed roles
      const changedRoles = editedRoles.filter((editedRole) => {
        const originalRole = roles.find((r) => r.id === editedRole.id);
        return (
          originalRole &&
          JSON.stringify(originalRole.permissions) !==
            JSON.stringify(editedRole.permissions)
        );
      });

      // Update each changed role
      for (const role of changedRoles) {
        await adminService.updateRole(role.id, {
          permissions: role.permissions,
        });
      }

      // Reload data
      await loadData();
      setEditMode(false);
      setChangedCells(new Set());
      alert('Zmiany zostały zapisane pomyślnie!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas zapisywania zmian');
      console.error('Error saving changes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedRoles(JSON.parse(JSON.stringify(roles)));
    setEditMode(false);
    setChangedCells(new Set());
  };

  const handleAddRole = async (roleData: { name: string; description: string; permissions: any }) => {
    try {
      setSaving(true);
      setError('');
      await adminService.createRole(roleData);
      await loadData();
      setShowAddRoleModal(false);
      alert('Nowa rola została utworzona!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas tworzenia roli');
      console.error('Error creating role:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderPermissionCell = (value: boolean | null): string => {
    if (value === true) return '✅';
    if (value === false) return '❌';
    return '⬜';
  };

  // Filter modules
  const filteredModules = filterModule
    ? permissionsSchema.filter((m) => m.name === filterModule)
    : permissionsSchema;

  // Filter roles
  const displayRoles = editMode ? editedRoles : roles;
  const filteredRoles = filterRole
    ? displayRoles.filter((r) => r.id === parseInt(filterRole))
    : displayRoles;

  if (loading) {
    return (
      <div className="permissions-matrix-page">
        <div className="page-header">
          <button onClick={() => navigate('/admin')} className="back-button">
            ← Powrót
          </button>
          <h1>Macierz uprawnień</h1>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error && !editMode) {
    return (
      <div className="permissions-matrix-page">
        <div className="page-header">
          <button onClick={() => navigate('/admin')} className="back-button">
            ← Powrót
          </button>
          <h1>Macierz uprawnień</h1>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="permissions-matrix-page">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="back-button">
          ← Powrót
        </button>
        <h1>Macierz uprawnień 🔑</h1>
        <p className="subtitle">
          {editMode
            ? 'Tryb edycji - kliknij w komórkę aby zmienić uprawnienie'
            : 'Przegląd uprawnień wszystkich ról w systemie'}
        </p>
      </div>

      {error && editMode && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="matrix-header">
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === 'module' ? 'active' : ''}`}
            onClick={() => setSortBy('module')}
          >
            📋 Sortuj po module
          </button>
          <button
            className={`sort-btn ${sortBy === 'role' ? 'active' : ''}`}
            onClick={() => setSortBy('role')}
          >
            👤 Sortuj po roli
          </button>
        </div>

        <div className="matrix-actions">
          {editMode ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                ❌ Anuluj
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveChanges}
                disabled={saving || changedCells.size === 0}
              >
                {saving ? 'Zapisywanie...' : `💾 Zapisz zmiany (${changedCells.size})`}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddRoleModal(true)}
              >
                ➕ Dodaj rolę
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setEditMode(true)}
              >
                ✏️ Edytuj
              </button>
            </>
          )}
        </div>
      </div>

      <div className="filters-section">
        <div className="filters">
          <div className="filter-group">
            <label>Filtruj po module:</label>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
              <option value="">Wszystkie moduły</option>
              {permissionsSchema.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Filtruj po roli:</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="">Wszystkie role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id.toString()}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-icon">✅</span>
          <span>Uprawnienie przyznane (true)</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon">❌</span>
          <span>Uprawnienie zabronione (false)</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon">⬜</span>
          <span>Brak wpisu (undefined/null)</span>
        </div>
        {editMode && (
          <div className="legend-item">
            <span className="legend-icon" style={{ background: '#fff3cd', padding: '0 8px' }}>
              ⚠️
            </span>
            <span>Zmienione (niezapisane)</span>
          </div>
        )}
      </div>

      <div className="matrix-container">
        <table className="permissions-matrix">
          <thead>
            <tr>
              <th className="sticky-header module-header">Moduł</th>
              <th className="sticky-header action-header">Akcja</th>
              {filteredRoles.map((role) => (
                <th key={role.id} className="sticky-header role-header">
                  <div className="role-name">{role.name}</div>
                  {role.permissions?.all && (
                    <div className="admin-badge">ADMIN</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredModules.map((module) =>
              module.actions.map((action, actionIndex) => (
                <tr key={`${module.name}-${action}`}>
                  {actionIndex === 0 && (
                    <td
                      className="module-name"
                      rowSpan={module.actions.length}
                    >
                      {module.displayName}
                    </td>
                  )}
                  <td className="action-name">{action}</td>
                  {filteredRoles.map((role) => {
                    const value = getPermissionValue(role, module.name, action);
                    const isChanged = isCellChanged(role.id, module.name, action);
                    const isEditable = editMode && role.name !== 'admin';

                    return (
                      <td
                        key={role.id}
                        className={`permission-cell ${
                          value === true
                            ? 'granted'
                            : value === false
                            ? 'denied'
                            : 'undefined'
                        } ${isEditable ? 'editable' : ''} ${
                          isChanged ? 'changed' : ''
                        }`}
                        onClick={() =>
                          isEditable && togglePermission(role.id, module.name, action)
                        }
                      >
                        {renderPermissionCell(value)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddRoleModal
        isOpen={showAddRoleModal}
        onClose={() => setShowAddRoleModal(false)}
        onSave={handleAddRole}
        permissionsSchema={permissionsSchema}
      />
    </div>
  );
};
