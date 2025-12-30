// src/components/admin/AdminDashboard.tsx
// Main admin dashboard with navigation

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const adminCards = [
    {
      title: 'Zarządzanie użytkownikami',
      description: 'Twórz, edytuj i zarządzaj użytkownikami systemu',
      icon: '👥',
      path: '/admin/users',
      roles: ['admin'],
    },
    {
      title: 'Konfiguracja SMTP',
      description: 'Skonfiguruj serwer pocztowy do wysyłki emaili',
      icon: '📧',
      path: '/admin/smtp',
      roles: ['admin'],
    },
    {
      title: 'Konfiguracja portalu',
      description: 'Ustaw URL portalu używany w emailach',
      icon: '🌐',
      path: '/admin/portal',
      roles: ['admin'],
    },
    {
      title: 'Zmiana hasła',
      description: 'Zmień swoje hasło administratora',
      icon: '🔒',
      path: '/admin/password',
      roles: ['admin'],
    },
    {
      title: 'BOM Builder',
      description: 'Zarządzaj materiałami i szablonami BOM',
      icon: '📦',
      path: '/admin/bom',
      roles: ['admin', 'bom_editor'],
    },
    {
      title: 'Import materiałów',
      description: 'Importuj materiały z plików CSV/Excel',
      icon: '📥',
      path: '/admin/bom/import',
      roles: ['admin', 'bom_editor'],
    },
  ];

  const userRole = user?.role || '';
  const filteredCards = adminCards.filter(card => 
    card.roles.includes(userRole)
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Panel Administratora</h1>
        <p className="subtitle">Zarządzaj systemem i konfiguracją</p>
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

      <style>{`
        .admin-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 30px;
        }

        .dashboard-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #7f8c8d;
          font-size: 16px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .dashboard-card {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .dashboard-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: #3498db;
        }

        .card-icon {
          font-size: 48px;
          margin-bottom: 15px;
        }

        .dashboard-card h3 {
          color: #2c3e50;
          margin-bottom: 10px;
          font-size: 18px;
        }

        .dashboard-card p {
          color: #7f8c8d;
          font-size: 14px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};
