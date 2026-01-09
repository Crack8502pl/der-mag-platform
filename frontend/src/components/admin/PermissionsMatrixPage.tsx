// src/components/admin/PermissionsMatrixPage.tsx
// Permissions matrix visualization page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import type { Role } from '../../types/admin.types';
import './PermissionsMatrixPage.css';

interface PermissionModule {
  name: string;
  displayName: string;
  actions: { key: string; displayName: string }[];
}

// Definicja wszystkich modułów i akcji zgodnie z Role.ts
const PERMISSION_MODULES: PermissionModule[] = [
  {
    name: 'dashboard',
    displayName: 'Dashboard',
    actions: [{ key: 'read', displayName: 'read' }],
  },
  {
    name: 'contracts',
    displayName: 'Kontrakty',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
      { key: 'approve', displayName: 'approve' },
      { key: 'import', displayName: 'import' },
    ],
  },
  {
    name: 'subsystems',
    displayName: 'Podsystemy',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
      { key: 'generateBom', displayName: 'generateBom' },
      { key: 'allocateNetwork', displayName: 'allocateNetwork' },
    ],
  },
  {
    name: 'tasks',
    displayName: 'Zadania',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
      { key: 'assign', displayName: 'assign' },
    ],
  },
  {
    name: 'completion',
    displayName: 'Kompletacja',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'scan', displayName: 'scan' },
      { key: 'assignPallet', displayName: 'assignPallet' },
      { key: 'reportMissing', displayName: 'reportMissing' },
      { key: 'decideContinue', displayName: 'decideContinue' },
      { key: 'complete', displayName: 'complete' },
    ],
  },
  {
    name: 'prefabrication',
    displayName: 'Prefabrykacja',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'receiveOrder', displayName: 'receiveOrder' },
      { key: 'configure', displayName: 'configure' },
      { key: 'verify', displayName: 'verify' },
      { key: 'assignSerial', displayName: 'assignSerial' },
      { key: 'complete', displayName: 'complete' },
    ],
  },
  {
    name: 'network',
    displayName: 'Sieć',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'createPool', displayName: 'createPool' },
      { key: 'updatePool', displayName: 'updatePool' },
      { key: 'deletePool', displayName: 'deletePool' },
      { key: 'allocate', displayName: 'allocate' },
      { key: 'viewMatrix', displayName: 'viewMatrix' },
    ],
  },
  {
    name: 'bom',
    displayName: 'BOM',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
    ],
  },
  {
    name: 'devices',
    displayName: 'Urządzenia',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'verify', displayName: 'verify' },
    ],
  },
  {
    name: 'users',
    displayName: 'Użytkownicy',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
    ],
  },
  {
    name: 'reports',
    displayName: 'Raporty',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'export', displayName: 'export' },
    ],
  },
  {
    name: 'settings',
    displayName: 'Ustawienia',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'update', displayName: 'update' },
    ],
  },
  {
    name: 'photos',
    displayName: 'Zdjęcia',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'approve', displayName: 'approve' },
    ],
  },
  {
    name: 'documents',
    displayName: 'Dokumenty',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'delete', displayName: 'delete' },
    ],
  },
  {
    name: 'notifications',
    displayName: 'Powiadomienia',
    actions: [
      { key: 'receiveAlerts', displayName: 'receiveAlerts' },
      { key: 'sendManual', displayName: 'sendManual' },
      { key: 'configureTriggers', displayName: 'configureTriggers' },
    ],
  },
  {
    name: 'warehouse_stock',
    displayName: 'Magazyn',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
      { key: 'manage_locations', displayName: 'manage_locations' },
      { key: 'adjust_stock', displayName: 'adjust_stock' },
      { key: 'view_history', displayName: 'view_history' },
      { key: 'view_prices', displayName: 'view_prices' },
      { key: 'export', displayName: 'export' },
      { key: 'import', displayName: 'import' },
      { key: 'reserve_stock', displayName: 'reserve_stock' },
      { key: 'release_stock', displayName: 'release_stock' },
      { key: 'auto_assign', displayName: 'auto_assign' },
      { key: 'scan_material', displayName: 'scan_material' },
    ],
  },
  {
    name: 'brigades',
    displayName: 'Brygady',
    actions: [
      { key: 'read', displayName: 'read' },
      { key: 'create', displayName: 'create' },
      { key: 'update', displayName: 'update' },
      { key: 'delete', displayName: 'delete' },
      { key: 'assignMembers', displayName: 'assignMembers' },
      { key: 'viewMembers', displayName: 'viewMembers' },
    ],
  },
];

export const PermissionsMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const rolesData = await adminService.getRoles();
      setRoles(rolesData);
    } catch (err) {
      setError('Nie udało się pobrać ról');
      console.error('Error loading roles:', err);
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
      return null; // undefined/null
    }

    const value = modulePermissions[actionKey];
    if (value === true) return true;
    if (value === false) return false;
    return null; // undefined
  };

  const renderPermissionCell = (value: boolean | null): string => {
    if (value === true) return '✅';
    if (value === false) return '❌';
    return '⬜'; // null/undefined
  };

  if (loading) {
    return (
      <div className="permissions-matrix-page">
        <div className="page-header">
          <button onClick={() => navigate('/admin')} className="back-button">
            ← Powrót
          </button>
          <h1>Macierz uprawnień</h1>
        </div>
        <div className="loading">Ładowanie...</div>
      </div>
    );
  }

  if (error) {
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
          Przegląd uprawnień wszystkich ról w systemie
        </p>
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
      </div>

      <div className="matrix-container">
        <table className="permissions-matrix">
          <thead>
            <tr>
              <th className="sticky-header module-header">Moduł</th>
              <th className="sticky-header action-header">Akcja</th>
              {roles.map((role) => (
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
            {PERMISSION_MODULES.map((module) =>
              module.actions.map((action, actionIndex) => (
                <tr key={`${module.name}-${action.key}`}>
                  {actionIndex === 0 && (
                    <td
                      className="module-name"
                      rowSpan={module.actions.length}
                    >
                      {module.displayName}
                    </td>
                  )}
                  <td className="action-name">{action.displayName}</td>
                  {roles.map((role) => {
                    const value = getPermissionValue(
                      role,
                      module.name,
                      action.key
                    );
                    return (
                      <td
                        key={role.id}
                        className={`permission-cell ${
                          value === true
                            ? 'granted'
                            : value === false
                            ? 'denied'
                            : 'undefined'
                        }`}
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
    </div>
  );
};
