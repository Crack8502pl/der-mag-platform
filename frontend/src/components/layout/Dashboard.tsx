// src/components/layout/Dashboard.tsx
// Main dashboard with module tiles

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import './Dashboard.css';

interface ModuleCard {
  title: string;
  path: string;
  icon: string;
  module?: string;
  action?: string;
  adminOnly?: boolean;
  description: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();

  const moduleCards: ModuleCard[] = [
    { title: 'Kontrakty', path: '/contracts', icon: '📝', module: 'contracts', action: 'read', description: 'Zarządzanie kontraktami' },
    { title: 'Podsystemy', path: '/subsystems', icon: '🔧', module: 'subsystems', action: 'read', description: 'Zarządzanie podsystemami' },
    { title: 'Zadania', path: '/tasks', icon: '📋', module: 'tasks', action: 'read', description: 'Zarządzanie zadaniami' },
    { title: 'Kompletacja', path: '/completion', icon: '📦', module: 'completion', action: 'read', description: 'Skanowanie i kompletacja' },
    { title: 'Prefabrykacja', path: '/prefabrication', icon: '🏭', module: 'prefabrication', action: 'read', description: 'Prefabrykacja urządzeń' },
    { title: 'Sieć/IP', path: '/network', icon: '🌐', module: 'network', action: 'read', description: 'Zarządzanie adresacją IP' },
    { title: 'Magazyn', path: '/warehouse-stock', icon: '🏭📦', module: 'warehouse_stock', action: 'read', description: 'Stany magazynowe' },
    { title: 'Materiały BOM', path: '/bom', icon: '🔩', module: 'bom', action: 'read', description: 'Szablony i materiały' },
    { title: 'Urządzenia', path: '/devices', icon: '📱', module: 'devices', action: 'read', description: 'Rejestracja urządzeń' },
    { title: 'Użytkownicy', path: '/users', icon: '👥', module: 'users', action: 'read', description: 'Zarządzanie użytkownikami' },
    { title: 'Raporty', path: '/reports', icon: '📈', module: 'reports', action: 'read', description: 'Generowanie raportów' },
    { title: 'Dokumenty', path: '/documents', icon: '📄', module: 'documents', action: 'read', description: 'Zarządzanie dokumentami' },
    { title: 'Zdjęcia', path: '/photos', icon: '📷', module: 'photos', action: 'read', description: 'Upload i zatwierdzanie' },
    { title: 'Powiadomienia', path: '/notifications', icon: '🔔', module: 'notifications', action: 'receiveAlerts', description: 'Konfiguracja alertów' },
    { title: 'Ustawienia', path: '/settings', icon: '⚙️', module: 'settings', action: 'read', description: 'Ustawienia konta' },
    { title: 'Panel Admin', path: '/admin', icon: '🛡️', adminOnly: true, description: 'Konfiguracja systemu' },
  ];

  const filteredCards = moduleCards.filter(card => {
    if (card.adminOnly) {
      return isAdmin();
    }
    if (card.module && card.action) {
      return hasPermission(card.module as any, card.action);
    }
    return true;
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Witaj, {user?.firstName} {user?.lastName}</p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>
          Wyloguj
        </button>
      </div>

      <div className="dashboard-grid">
        {filteredCards.map((card) => (
          <div
            key={card.path}
            className="dashboard-card"
            onClick={() => navigate(card.path)}
          >
            <div className="card-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
