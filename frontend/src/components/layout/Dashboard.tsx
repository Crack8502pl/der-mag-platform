// src/components/layout/Dashboard.tsx
// Simple dashboard placeholder

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { Sidebar } from './Sidebar';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="user-info">
            <span className="user-name">{user?.firstName} {user?.lastName}</span>
            <span className="user-role">{user?.role}</span>
            {isAdmin() && <span className="admin-badge">Admin</span>}
          </div>
        </div>
        <div className="dashboard-content card">
          <h2>Witaj w platformie Grover!</h2>
          <p>
            Jesteś zalogowany jako: <strong>{user?.username}</strong>
          </p>
          <p>
            Twoja rola: <strong>{user?.role}</strong>
          </p>
          <div className="dashboard-info">
            <p>
              Ta platforma zarządza zadaniami infrastrukturalnymi z systemem
              granularnych uprawnień opartych na rolach (RBAC).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
