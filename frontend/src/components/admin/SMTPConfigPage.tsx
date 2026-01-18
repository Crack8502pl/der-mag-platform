// src/components/admin/SMTPConfigPage.tsx
// SMTP configuration page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import type { SmtpConfig } from '../../types/admin.types';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export const SMTPConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromName: 'Grover Platform',
    fromEmail: 'noreply@dermag.pl',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  
  // Queue management state
  const [queueStats, setQueueStats] = useState<QueueStats>({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [clearingQueue, setClearingQueue] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadConfig();
    loadQueueStats();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const smtpConfig = await adminService.getSmtpConfig();
      setConfig(smtpConfig);
    } catch (err) {
      setError('Nie udało się pobrać konfiguracji SMTP');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadQueueStats = async () => {
    try {
      setLoadingStats(true);
      const stats = await adminService.getQueueStats();
      setQueueStats(stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk kolejki:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setTestResult('');
      
      await adminService.setSmtpConfig(config);
      
      setSuccess('Konfiguracja SMTP zapisana pomyślnie');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zapisać konfiguracji');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult('');
      
      const result = await adminService.testSmtpConnection();
      
      if (result.success) {
        setTestResult(`✓ ${result.message}`);
      } else {
        setTestResult(`✗ ${result.message}`);
      }
    } catch (err: any) {
      setTestResult(`✗ Błąd: ${err.response?.data?.message || err.message}`);
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshStats = async () => {
    await loadQueueStats();
  };

  const handleClearQueue = () => {
    setShowClearConfirm(true);
  };

  const confirmClearQueue = async () => {
    try {
      setClearingQueue(true);
      await adminService.clearEmailQueue();
      setSuccess('Kolejka emaili została wyczyszczona');
      setShowClearConfirm(false);
      await loadQueueStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się wyczyścić kolejki');
      console.error(err);
    } finally {
      setClearingQueue(false);
    }
  };

  if (loading) {
    return <div className="loading">Ładowanie...</div>;
  }

  return (
    <div className="smtp-config-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Konfiguracja SMTP</h1>
        <p className="subtitle">Skonfiguruj serwer pocztowy do wysyłki emaili</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="config-card">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="host">Host SMTP *</label>
              <input
                id="host"
                type="text"
                className="form-control"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="port">Port *</label>
              <input
                id="port"
                type="number"
                className="form-control"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={config.secure}
                onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
              />
              {' '}Użyj SSL/TLS (zazwyczaj dla portu 465)
            </label>
            <small className="form-text">
              Dla portu 587 zostaw odznaczone (używa STARTTLS)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="user">Użytkownik SMTP *</label>
            <input
              id="user"
              type="text"
              className="form-control"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              placeholder="user@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło SMTP</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="Zostaw puste aby nie zmieniać"
            />
            <small className="form-text">
              Hasło jest szyfrowane algorytmem AES-256-GCM
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="fromName">Nazwa nadawcy *</label>
            <input
              id="fromName"
              type="text"
              className="form-control"
              value={config.fromName}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fromEmail">Email nadawcy *</label>
            <input
              id="fromEmail"
              type="email"
              className="form-control"
              value={config.fromEmail}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              placeholder="noreply@example.com"
              required
            />
          </div>

          {testResult && (
            <div className={`test-result ${testResult.startsWith('✓') ? 'success' : 'error'}`}>
              {testResult}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testing || !config.host || !config.user}
            >
              {testing ? 'Testowanie...' : 'Testuj połączenie'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Zapisywanie...' : 'Zapisz konfigurację'}
            </button>
          </div>
        </form>
      </div>

      {/* Queue Management Section */}
      <div className="queue-management-card">
        <h2>📬 Zarządzanie kolejką emaili</h2>
        
        {/* Queue Statistics */}
        <div className="queue-stats">
          <div className="stat-box">
            <span className="stat-label">Oczekujące:</span>
            <span className="stat-value">{queueStats.waiting}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">W trakcie:</span>
            <span className="stat-value">{queueStats.active}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Nieudane:</span>
            <span className="stat-value danger">{queueStats.failed}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Opóźnione:</span>
            <span className="stat-value">{queueStats.delayed}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="queue-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleRefreshStats}
            disabled={loadingStats}
          >
            🔄 {loadingStats ? 'Ładowanie...' : 'Odśwież statystyki'}
          </button>
          
          <button 
            className="btn btn-danger"
            onClick={handleClearQueue}
            disabled={clearingQueue}
          >
            🗑️ {clearingQueue ? 'Czyszczenie...' : 'Wyczyść kolejkę'}
          </button>
        </div>
        
        {/* Confirmation Dialog */}
        {showClearConfirm && (
          <div className="confirm-dialog">
            <p>⚠️ Czy na pewno chcesz wyczyścić kolejkę emaili? Ta operacja usunie wszystkie oczekujące emaile.</p>
            <div className="confirm-actions">
              <button onClick={confirmClearQueue} className="btn btn-danger">
                Tak, wyczyść
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary">
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .smtp-config-page {
          padding: 20px;
          max-width: 800px;
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

        .config-card {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 15px;
        }

        .form-group {
          margin-bottom: 20px;
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

        .form-text {
          display: block;
          margin-top: 5px;
          color: #7f8c8d;
          font-size: 12px;
        }

        .test-result {
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: 500;
        }

        .test-result.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .test-result.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .form-actions {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2980b9;
        }

        .btn-secondary {
          background: #95a5a6;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #7f8c8d;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

        .queue-management-card {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-top: 30px;
        }

        .queue-management-card h2 {
          margin: 0 0 25px 0;
          color: #2c3e50;
          font-size: 20px;
        }

        .queue-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-box {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .stat-label {
          display: block;
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #3498db;
        }

        .stat-value.danger {
          color: #e74c3c;
        }

        .queue-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .btn-danger {
          background: #e74c3c;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c0392b;
        }

        .confirm-dialog {
          margin-top: 20px;
          padding: 20px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
        }

        .confirm-dialog p {
          margin: 0 0 15px 0;
          color: #856404;
          font-size: 14px;
          line-height: 1.6;
        }

        .confirm-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .queue-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .queue-actions {
            flex-direction: column;
          }

          .queue-actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
