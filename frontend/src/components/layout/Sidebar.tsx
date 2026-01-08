// src/components/layout/Sidebar.tsx
// Sidebar with role-based menu

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import './Sidebar.css';

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  module?: any;
  action?: string;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { hasPermission, hasAnyPermissionInModule, isAdmin } = usePermissions();

  const menuItems: MenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊', module: 'dashboard', action: 'read' },
    { label: 'Kontrakty', path: '/contracts', icon: '📝', module: 'contracts', action: 'read' },
    { label: 'Podsystemy', path: '/subsystems', icon: '🔧', module: 'subsystems', action: 'read' },
    { label: 'Zadania', path: '/tasks', icon: '📋', module: 'tasks', action: 'read' },
    { label: 'Kompletacja', path: '/completion', icon: '📦', module: 'completion', action: 'read' },
    { label: 'Prefabrykacja', path: '/prefabrication', icon: '🏭', module: 'prefabrication', action: 'read' },
    { label: 'Sieć/IP', path: '/network', icon: '🌐', module: 'network', action: 'read' },
    { label: 'Magazyn', path: '/warehouse-stock', icon: '🏭📦', module: 'warehouse_stock', action: 'read' },
    { label: 'Materiały BOM', path: '/bom', icon: '🔩', module: 'bom', action: 'read' },
    { label: 'Urządzenia', path: '/devices', icon: '📱', module: 'devices', action: 'read' },
    { label: 'Użytkownicy', path: '/admin/users', icon: '👥', module: 'users', action: 'read' },
    { label: 'Raporty', path: '/reports', icon: '📈', module: 'reports', action: 'read' },
    { label: 'Dokumenty', path: '/documents', icon: '📄', module: 'documents', action: 'read' },
    { label: 'Zdjęcia', path: '/photos', icon: '📷', module: 'photos', action: 'read' },
    { label: 'Powiadomienia', path: '/notifications', icon: '🔔', module: 'notifications' },
    { label: 'Ustawienia', path: '/settings', icon: '⚙️', module: 'settings', action: 'read' },
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
          <span className="sidebar-icon">🚪</span>
          <span>Wyloguj</span>
        </button>
      </div>
    </aside>
  );
};
