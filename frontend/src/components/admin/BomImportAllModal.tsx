import React, { useState } from 'react';
import bomSubsystemTemplateService from '../../services/bomSubsystemTemplate.service';
import type { ImportAllResult } from '../../services/bomSubsystemTemplate.service';

interface BomImportAllModalProps {
  onClose: () => void;
  onSuccess?: (result: ImportAllResult) => void;
}

const BomImportAllModal: React.FC<BomImportAllModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'SKIP' | 'OVERWRITE' | 'MERGE'>('SKIP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportAllResult | null>(null);

  const handleImport = async (): Promise<void> => {
    if (!file) {
      setError('Wybierz plik JSON.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const jsonContent = await file.text();
      const importResult = await bomSubsystemTemplateService.importAllJson(jsonContent, mode);
      setResult(importResult);
      onSuccess?.(importResult);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Błąd importu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="card" style={{ width: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
            📥 Importuj wszystko (JSON)
          </h2>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading} style={{ padding: '6px 12px' }}>
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '12px',
              color: '#ef4444',
              fontSize: '13px'
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '6px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Plik JSON *
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={loading}
          />
          {file && (
            <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>{file.name}</div>
          )}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Tryb importu</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <input type="radio" checked={mode === 'SKIP'} onChange={() => setMode('SKIP')} disabled={loading} />
            Pomiń istniejące (SKIP)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            <input type="radio" checked={mode === 'OVERWRITE'} onChange={() => setMode('OVERWRITE')} disabled={loading} />
            Nadpisz istniejące (OVERWRITE)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <input type="radio" checked={mode === 'MERGE'} onChange={() => setMode('MERGE')} disabled={loading} />
            Scal (MERGE)
          </label>
        </div>

        {result && (
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '12px 14px',
              marginBottom: '16px',
              background: 'var(--background-secondary)'
            }}
          >
            <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
              Zaimportowano: {result.templatesImported} szablonów, {result.rulesImported} reguł, {result.recordersImported} rejestratorów, {result.disksImported} dysków. Pominięto: {result.skipped}.
            </div>
            {result.errors.length > 0 && (
              <ul style={{ margin: '10px 0 0', paddingLeft: '18px', color: '#ef4444', fontSize: '12px' }}>
                {result.errors.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Zamknij
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={loading || !file}>
            {loading ? '⏳ Importowanie...' : 'Importuj'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BomImportAllModal;
