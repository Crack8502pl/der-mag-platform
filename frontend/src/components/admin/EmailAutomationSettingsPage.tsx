import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';

type ToastState = {
  type: 'success' | 'error';
  message: string;
  retry?: () => void;
} | null;

export const EmailAutomationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const statusLabel = useMemo(() => (enabled ? 'Włączone' : 'Wyłączone'), [enabled]);

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminService.getEmailAutomationSettings();
      setEnabled(response.enabled);
    } catch (error) {
      console.error(error);
      setToast({
        type: 'error',
        message: 'Nie udało się pobrać ustawień automatycznych e-maili.',
        retry: () => void loadSettings(),
      });
    } finally {
      setLoading(false);
    }
  };

  const persistToggle = async (nextEnabled: boolean) => {
    setUpdating(true);
    const previousEnabled = enabled;
    setEnabled(nextEnabled);

    try {
      await adminService.updateEmailAutomationSettings(nextEnabled);
      setToast({
        type: 'success',
        message: `Automatyczne e-maile: ${nextEnabled ? 'włączone' : 'wyłączone'}.`,
      });
    } catch (error) {
      console.error(error);
      setEnabled(previousEnabled);
      setToast({
        type: 'error',
        message: 'Nie udało się zapisać ustawienia. Możesz spróbować ponownie.',
        retry: () => void persistToggle(nextEnabled),
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="email-automation-page-loading">Ładowanie...</div>;
  }

  return (
    <div className="email-automation-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Automatyczne e-maile</h1>
        <p className="subtitle">Globalny przełącznik sterujący automatyczną wysyłką wiadomości systemowych.</p>
      </div>

      {toast && (
        <div className={`email-automation-toast ${toast.type}`} role="status">
          <span>{toast.message}</span>
          <div className="email-automation-toast-actions">
            {toast.retry && (
              <button type="button" className="btn btn-secondary" onClick={toast.retry}>
                Ponów
              </button>
            )}
            <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Zamknij powiadomienie">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="email-automation-card">
        <div className="email-automation-card-header">
          <div>
            <h2>Przełącznik globalny</h2>
            <p>Jeśli wyłączysz tę opcję, żaden automatyczny e-mail nie zostanie wysłany.</p>
          </div>
          <span className={`status-badge ${enabled ? 'enabled' : 'disabled'}`}>{statusLabel}</span>
        </div>

        <button
          type="button"
          className={`toggle-button ${enabled ? 'enabled' : 'disabled'}`}
          onClick={() => void persistToggle(!enabled)}
          disabled={updating}
          aria-pressed={enabled}
        >
          <span className="toggle-track">
            <span className="toggle-thumb" />
          </span>
          <span className="toggle-text">
            {updating ? 'Zapisywanie...' : enabled ? 'Wyłącz automat' : 'Włącz automat'}
          </span>
        </button>

        <div className="email-automation-help">
          <strong>Kolejność decyzji:</strong> globalny przełącznik → blokada użytkownika.
        </div>
      </div>

      <div className="email-automation-card">
        <h2>Per użytkownik</h2>
        <p>
          Wstrzymanie dla pojedynczego konta znajdziesz w sekcji użytkowników administratora.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/admin/users')}>
          Przejdź do użytkowników
        </button>
      </div>

      <style>{`
        .email-automation-page,
        .email-automation-page-loading {
          padding: 20px;
          max-width: 860px;
          margin: 0 auto;
          color: var(--text-primary);
        }

        .email-automation-page-loading {
          text-align: center;
          color: var(--text-secondary);
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0 0 8px;
          color: var(--text-primary);
        }

        .subtitle {
          color: var(--text-secondary);
        }

        .back-button {
          background: transparent;
          border: none;
          color: var(--primary-color);
          cursor: pointer;
          padding: 6px 10px;
          margin-bottom: 12px;
          border-radius: var(--radius-sm);
        }

        .back-button:hover {
          background: var(--bg-hover);
        }

        .email-automation-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: var(--shadow-md);
        }

        .email-automation-card-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .email-automation-card h2 {
          margin: 0 0 8px;
        }

        .email-automation-card p {
          margin: 0;
          color: var(--text-secondary);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .status-badge.enabled {
          color: var(--success);
          background: var(--success-light);
          border-color: var(--success);
        }

        .status-badge.disabled {
          color: var(--danger);
          background: var(--danger-light);
          border-color: var(--danger);
        }

        .toggle-button {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .toggle-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: var(--primary-color);
        }

        .toggle-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .toggle-track {
          width: 48px;
          height: 28px;
          border-radius: 999px;
          background: var(--border-color);
          position: relative;
          transition: background 0.2s ease;
        }

        .toggle-button.enabled .toggle-track {
          background: var(--success);
        }

        .toggle-button.disabled .toggle-track {
          background: var(--danger);
        }

        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 4px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s ease;
        }

        .toggle-button.enabled .toggle-thumb {
          transform: translateX(18px);
        }

        .toggle-text {
          font-weight: 600;
        }

        .email-automation-help {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .email-automation-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2000;
          max-width: 420px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          padding: 14px 16px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid transparent;
        }

        .email-automation-toast.success {
          background: var(--success-light);
          color: var(--success);
          border-color: var(--success);
        }

        .email-automation-toast.error {
          background: var(--danger-light);
          color: var(--danger);
          border-color: var(--danger);
        }

        .email-automation-toast-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          cursor: pointer;
        }

        .btn-primary {
          background: var(--primary-color);
          color: #fff;
          border-color: transparent;
        }

        .btn-secondary {
          background: var(--bg-card);
          color: inherit;
        }

        .toast-close {
          border: none;
          background: transparent;
          color: inherit;
          font-size: 22px;
          cursor: pointer;
          line-height: 1;
        }

        @media (max-width: 768px) {
          .email-automation-card-header {
            flex-direction: column;
          }

          .email-automation-toast {
            left: 12px;
            right: 12px;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
};
