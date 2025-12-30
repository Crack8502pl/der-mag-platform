// src/components/admin/PortalConfigPage.tsx
// Portal URL configuration page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';

export const PortalConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPortalUrl();
  }, []);

  const loadPortalUrl = async () => {
    try {
      setLoading(true);
      const portalUrl = await adminService.getPortalUrl();
      setUrl(portalUrl);
    } catch (err) {
      setError('Nie udało się pobrać konfiguracji portalu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      setError('Nieprawidłowy format URL');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await adminService.setPortalUrl(url);
      
      setSuccess('Konfiguracja portalu zapisana pomyślnie');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się zapisać konfiguracji');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Ładowanie...</div>;
  }

  return (
    <div className="portal-config-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Powrót
        </button>
        <h1>Konfiguracja portalu</h1>
        <p className="subtitle">Ustaw URL portalu używany w emailach</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="config-card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="url">URL portalu</label>
            <input
              id="url"
              type="url"
              className="form-control"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://dermag.example.com"
              required
            />
            <small className="form-text">
              Ten URL będzie używany w linkach w emailach wysyłanych do użytkowników
            </small>
          </div>

          <div className="preview-section">
            <h3>Podgląd</h3>
            <p>Tak będzie wyglądał link w emailu:</p>
            <div className="preview-box">
              <a href={url || '#'} target="_blank" rel="noopener noreferrer">
                {url || 'http://localhost:3001'}/login
              </a>
            </div>
          </div>

          <div className="form-actions">
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

      <style>{`
        .portal-config-page {
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

        .preview-section {
          margin: 30px 0;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .preview-section h3 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #2c3e50;
          font-size: 16px;
        }

        .preview-box {
          margin-top: 10px;
          padding: 15px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .preview-box a {
          color: #3498db;
          word-break: break-all;
        }

        .form-actions {
          margin-top: 30px;
          text-align: right;
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
      `}</style>
    </div>
  );
};
