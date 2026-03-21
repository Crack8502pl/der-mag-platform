// src/components/layout/Sidebar.tsx
// Sidebar with role-based menu

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './Sidebar.css';

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  module?: any;
  action?: string;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { hasPermission, hasAnyPermissionInModule, isAdmin } = usePermissions();

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <ModuleIcon name="dashboard" emoji={MODULE_ICONS.dashboard} size={20} />, module: 'dashboard', action: 'read' },
    { label: 'Kontrakty', path: '/contracts', icon: <ModuleIcon name="contracts" emoji={MODULE_ICONS.contracts} size={20} />, module: 'contracts', action: 'read' },
    { label: 'Podsystemy', path: '/subsystems', icon: <ModuleIcon name="subsystems" emoji={MODULE_ICONS.subsystems} size={20} />, module: 'subsystems', action: 'read' },
    { label: 'Zadania', path: '/tasks', icon: <ModuleIcon name="tasks" emoji={MODULE_ICONS.tasks} size={20} />, module: 'tasks', action: 'read' },
    { label: 'Mapa', path: '/map', icon: <ModuleIcon name="map" emoji={MODULE_ICONS.map} size={20} />, module: 'tasks', action: 'read' },
    { label: 'Brygady', path: '/brigades', icon: <ModuleIcon name="brigades" emoji={MODULE_ICONS.brigades} size={20} />, module: 'brigades', action: 'read' },
    { label: 'Kompletacja', path: '/completion', icon: <ModuleIcon name="completion" emoji={MODULE_ICONS.completion} size={20} />, module: 'completion', action: 'read' },
    { label: 'Prefabrykacja', path: '/prefabrication', icon: <ModuleIcon name="prefabrication" emoji={MODULE_ICONS.prefabrication} size={20} />, module: 'prefabrication', action: 'read' },
    { label: 'Sieć/IP', path: '/network', icon: <ModuleIcon name="network" emoji={MODULE_ICONS.network} size={20} />, module: 'network', action: 'read' },
    { label: 'Magazyn', path: '/warehouse-stock', icon: <ModuleIcon name="warehouse" emoji={MODULE_ICONS.warehouse} size={20} />, module: 'warehouse_stock', action: 'read' },
    { label: 'Materiały BOM', path: '/bom', icon: <ModuleIcon name="bom" emoji={MODULE_ICONS.bom} size={20} />, module: 'bom', action: 'read' },
    { label: 'Urządzenia', path: '/devices', icon: <ModuleIcon name="devices" emoji={MODULE_ICONS.devices} size={20} />, module: 'devices', action: 'read' },
    { label: 'Użytkownicy', path: '/admin/users', icon: <ModuleIcon name="users" emoji={MODULE_ICONS.users} size={20} />, module: 'users', action: 'read' },
    { label: 'Raporty', path: '/reports', icon: <ModuleIcon name="reports" emoji={MODULE_ICONS.reports} size={20} />, module: 'reports', action: 'read' },
    { label: 'Dokumenty', path: '/documents', icon: <ModuleIcon name="documents" emoji={MODULE_ICONS.documents} size={20} />, module: 'documents', action: 'read' },
    { label: 'Zdjęcia', path: '/photos', icon: <ModuleIcon name="photos" emoji={MODULE_ICONS.photos} size={20} />, module: 'photos', action: 'read' },
    { label: 'Powiadomienia', path: '/notifications', icon: <ModuleIcon name="notifications" emoji={MODULE_ICONS.notifications} size={20} />, module: 'notifications' },
    { label: 'Ustawienia', path: '/settings', icon: <ModuleIcon name="settings" emoji={MODULE_ICONS.settings} size={20} />, module: 'settings', action: 'read' },
    { label: 'Integracja Symfonia', path: '/admin/integracjaS', icon: <ModuleIcon name="symfonia" emoji="🔗" size={20} />, module: 'all', action: 'access' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canAccessMenuItem = (item: MenuItem): boolean => {
    // Dashboard is always accessible
    if (item.path === '/dashboard') {
      return true;
    }

    // Admin has full access
    if (isAdmin()) {
      return true;
    }

    // Check specific permission
    if (item.module && item.action) {
      return hasPermission(item.module, item.action);
    }

    // Check any permission in module
    if (item.module) {
      return hasAnyPermissionInModule(item.module);
    }

    return false;
  };

  const filteredMenuItems = menuItems.filter(canAccessMenuItem);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">Grover</div>
      </div>

      <nav className="sidebar-nav">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="btn btn-secondary logout-button">
          <span className="sidebar-icon"><ModuleIcon name="logout" emoji={MODULE_ICONS.logout} size={20} /></span>
          <span>Wyloguj</span>
        </button>
      </div>
    </aside>
  );
};
