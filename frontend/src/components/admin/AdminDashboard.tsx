// src/components/admin/AdminDashboard.tsx
// Main admin dashboard with navigation

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';

interface AdminCard {
  title: string;
  description: string;
  icon: string;
  path: string | null;
  permission?: { module: string; action: string };
  adminOnly?: boolean;
  action?: string;
  isDangerous?: boolean;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const adminCards: AdminCard[] = [
    {
      title: 'Uprawnienia 🔑',
      description: 'Przegląd matrycy uprawnień wszystkich ról',
      icon: '🔑',
      path: '/admin/permissions',
      adminOnly: true,
    },
    {
      title: 'Konfiguracja SMTP',
      description: 'Skonfiguruj serwer pocztowy do wysyłki emaili',
      icon: '📧',
      path: '/admin/smtp',
      adminOnly: true,
    },
    {
      title: 'Konfiguracja portalu',
      description: 'Ustaw URL portalu używany w emailach',
      icon: '🌐',
      path: '/admin/portal',
      adminOnly: true,
    },
    {
      title: 'Zmiana hasła',
      description: 'Zmień swoje hasło administratora',
      icon: '🔒',
      path: '/admin/password',
      adminOnly: true,
    },
    {
      title: 'BOM Builder',
      description: 'Zarządzaj materiałami i szablonami BOM',
      icon: '📦',
      path: '/admin/bom',
      permission: { module: 'bom', action: 'read' },
    },
    {
      title: 'Import materiałów',
      description: 'Importuj materiały z plików CSV/Excel',
      icon: '📥',
      path: '/admin/bom/import',
      permission: { module: 'bom', action: 'create' },
    },
    {
      title: 'Integracja Symfonia',
      description: 'Eksploruj strukturę bazy MSSQL Symfonia i eksportuj do JSON',
      icon: '🔗',
      path: '/admin/integracjaS',
      adminOnly: true,
    },
    {
      title: 'Seed Database 🌱',
      description: 'Zresetuj i zainicjalizuj bazę danych testowymi danymi',
      icon: '🗄️',
      path: null,
      action: 'seed-database',
      adminOnly: true,
      isDangerous: true,
    },
  ];

  const handleCardClick = (card: AdminCard) => {
    if (card.action === 'seed-database') {
      setIsModalOpen(true);
    } else if (card.path) {
      navigate(card.path);
    }
  };

  const handleSeedDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/admin/seed-database');
      
      if (response.data.success) {
        setNotification({
          type: 'success',
          message: `✅ ${response.data.message}\n\nRole: ${response.data.data.roles}\nTypy zadań: ${response.data.data.taskTypes}\nAdmin: ${response.data.data.adminUser}`
        });
        setIsModalOpen(false);
        // Auto-hide notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: `❌ Błąd: ${error.response?.data?.message || error.message}`
      });
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCards = adminCards.filter(card => {
    if (card.adminOnly) return isAdmin();
    if (card.permission) return hasPermission(card.permission.module as any, card.permission.action);
    return isAdmin(); // fallback
  });

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Powrót
        </button>
        <h1>Panel Administratora</h1>
        <p className="subtitle">Zarządzaj systemem i konfiguracją</p>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`} onClick={() => setNotification(null)}>
          <div className="notification-content">
            {notification.message.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <button className="notification-close" onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      {filteredCards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
          <h2>Brak dostępu</h2>
          <p>Nie masz uprawnień do żadnej funkcji w panelu administratora.</p>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ marginTop: '20px' }}>
            Powrót do Dashboard
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {filteredCards.map((card, index) => (
            <div
              key={card.path || card.action || index}
              className={`dashboard-card ${card.isDangerous ? 'dangerous' : ''}`}
              onClick={() => handleCardClick(card)}
            >
              <div className="card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Ostrzeżenie</h2>
            <p>Ta operacja:</p>
            <ul>
              <li>❌ Usunie WSZYSTKICH użytkowników (oprócz admina)</li>
              <li>❌ Usunie WSZYSTKIE role</li>
              <li>❌ Usunie WSZYSTKIE typy zadań</li>
              <li>✅ Utworzy 10 ról systemowych</li>
              <li>✅ Utworzy 14 typów zadań</li>
              <li>✅ Utworzy konto admin (admin / Admin123!)</li>
            </ul>
            <p><strong>Czy na pewno chcesz kontynuować?</strong></p>
            
            <div className="modal-actions">
              <button 
                className="btn-danger" 
                onClick={handleSeedDatabase}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Seeduję...' : '🌱 Tak, zresetuj bazę'}
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 30px;
        }

        .dashboard-header .back-button {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
          margin-bottom: 15px;
        }

        .dashboard-header .back-button:hover {
          background: #5a6268;
        }

        .dashboard-header h1 {
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .subtitle {
          color: #7f8c8d;
          font-size: 16px;
        }

        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 500px;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 2000;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification.success {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }

        .notification.error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .notification-content {
          flex: 1;
          white-space: pre-line;
          font-size: 14px;
          line-height: 1.5;
        }

        .notification-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: inherit;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
        }

        .notification-close:hover {
          opacity: 1;
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

        .dashboard-card.dangerous {
          border: 2px solid #dc3545;
          background: #fff5f5;
        }

        .dashboard-card.dangerous:hover {
          border-color: #c82333;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-content h2 {
          color: #dc3545;
          margin-bottom: 15px;
        }

        .modal-content ul {
          list-style: none;
          padding: 0;
          margin: 15px 0;
        }

        .modal-content li {
          padding: 8px 0;
          font-size: 14px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
