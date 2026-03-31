// src/components/admin/PermissionDebugTool.tsx
// Admin tool for decoding permission error codes

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { decodePermissionError, type PermissionErrorPayload } from '../../utils/permissionCodec';
import './PermissionDebugTool.css';

export const PermissionDebugTool: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [decoded, setDecoded] = useState<PermissionErrorPayload | null>(null);
  const [error, setError] = useState('');

  const handleDecode = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Wklej kod błędu uprawnień');
      return;
    }
    const result = decodePermissionError(trimmed);
    if (!result) {
      setError('Nieprawidłowy kod – upewnij się, że kod zaczyna się od ERR-PERM-');
      setDecoded(null);
      return;
    }
    setDecoded(result);
    setError('');
  };

  const handleClear = () => {
    setCode('');
    setDecoded(null);
    setError('');
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('pl-PL');

  return (
    <div className="debug-tool-page">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="back-button">
          ← Powrót
        </button>
        <h1>Debuger uprawnień 🔍</h1>
        <p className="subtitle">
          Wklej kod błędu uprawnień otrzymany od użytkownika, aby zobaczyć szczegóły
        </p>
      </div>

      <div className="debug-tool-card">
        <h2 className="debug-section-title">Wprowadź kod błędu</h2>
        <div className="debug-input-row">
          <input
            type="text"
            className="input debug-input"
            placeholder="ERR-PERM-eyJ1c2VySWQiOi..."
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
          />
          <button className="btn btn-primary" onClick={handleDecode}>
            🔓 Odkoduj
          </button>
          {(code || decoded) && (
            <button className="btn btn-secondary" onClick={handleClear}>
              🗑 Wyczyść
            </button>
          )}
        </div>
        {error && <p className="debug-error">{error}</p>}
      </div>

      {decoded && (
        <div className="debug-result-card">
          <h2 className="debug-section-title">Wyniki dekodowania</h2>

          <div className="debug-result-grid">
            <div className="debug-result-item">
              <span className="debug-result-label">Użytkownik</span>
              <span className="debug-result-value">{decoded.username}</span>
            </div>
            <div className="debug-result-item">
              <span className="debug-result-label">ID użytkownika</span>
              <span className="debug-result-value">{decoded.userId}</span>
            </div>
            <div className="debug-result-item">
              <span className="debug-result-label">Rola</span>
              <span className="debug-result-value debug-role-badge">{decoded.roleName}</span>
            </div>
            <div className="debug-result-item">
              <span className="debug-result-label">Wymagany moduł</span>
              <span className="debug-result-value debug-perm-badge">{decoded.requestedModule}</span>
            </div>
            <div className="debug-result-item">
              <span className="debug-result-label">Wymagana akcja</span>
              <span className="debug-result-value debug-perm-badge">{decoded.requestedAction}</span>
            </div>
            <div className="debug-result-item">
              <span className="debug-result-label">Data zdarzenia</span>
              <span className="debug-result-value">{formatDate(decoded.timestamp)}</span>
            </div>
          </div>

          <div className="debug-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/permissions')}
              title="Przejdź do macierzy uprawnień"
            >
              🔑 Napraw uprawnienia
            </button>
            <p className="debug-hint">
              W macierzy uprawnień znajdź rolę <strong>{decoded.roleName}</strong> i dodaj uprawnienie{' '}
              <code>{decoded.requestedModule}.{decoded.requestedAction}</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
