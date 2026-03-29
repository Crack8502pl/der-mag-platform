// src/components/contracts/PoleSearchModal.tsx
// Modal wyszukiwania słupów w magazynie dla kreatora wysyłki SMOKIP_B

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface WarehouseItem {
  id: number;
  catalogNumber: string;
  materialName: string;
  quantityInStock: number;
  unit: string;
}

interface PoleSearchModalProps {
  onSelect: (item: WarehouseItem) => void;
  onClose: () => void;
}

export const PoleSearchModal: React.FC<PoleSearchModalProps> = ({ onSelect, onClose }) => {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<WarehouseItem | null>(null);

  useEffect(() => {
    loadPoles();
  }, []);

  const loadPoles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/warehouse-stock', {
        params: { search: 'słup', limit: 100 },
      });
      const data = response.data?.data || response.data?.items || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania produktów z magazynu');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content pole-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pole-search-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="pole-search-title">🔍 Wyszukaj słup w magazynie</h3>
          <button className="modal-close" onClick={onClose} aria-label="Zamknij">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {loading && <div className="loading">Ładowanie produktów...</div>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="empty-state">
              <p>Brak produktów zaczynających się od "słup" w magazynie</p>
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="pole-search-results">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`pole-search-item${selected?.id === item.id ? ' selected' : ''}`}
                  onClick={() => setSelected(item)}
                >
                  <div>
                    <div className="pole-search-item-name">{item.materialName}</div>
                    <div className="pole-search-item-catalog">
                      {item.catalogNumber} · Stan: {item.quantityInStock} {item.unit}
                    </div>
                  </div>
                  {selected?.id === item.id && <span>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selected}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
