// src/components/contracts/ContractImportModal.tsx
// Modal for importing contracts

import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const ContractImportModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Proszę wybrać plik do importu');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('accessToken');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/contracts/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Błąd importu kontraktów');
      }
      
      onSuccess(data.data.imported || 0);
    } catch (err: any) {
      setError(err.message || 'Błąd importu kontraktów');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📥 Import Kontraktów</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="file">
              Wybierz plik CSV/Excel
            </label>
            <input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
            {file && <span className="text-muted">Wybrany plik: {file.name}</span>}
          </div>
          
          <div className="import-info">
            <h4>Format importu</h4>
            <p>Plik powinien zawierać następujące kolumny:</p>
            <ul>
              <li><strong>contractNumber</strong> (opcjonalny) - Format: RXXXXXXX_Y</li>
              <li><strong>customName</strong> (wymagany) - Nazwa własna kontraktu</li>
              <li><strong>orderDate</strong> (wymagany) - Data zamówienia (YYYY-MM-DD)</li>
              <li><strong>managerCode</strong> (wymagany) - Kod kierownika (3 znaki)</li>
              <li><strong>projectManagerId</strong> (wymagany) - ID kierownika projektu</li>
              <li><strong>jowiszRef</strong> (opcjonalny) - Referencja Jowisz</li>
            </ul>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              {loading ? 'Importowanie...' : 'Importuj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
