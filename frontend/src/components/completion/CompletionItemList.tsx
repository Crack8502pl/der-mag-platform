// src/components/completion/CompletionItemList.tsx
// List of completion items with status indicators

import React, { useState } from 'react';
import type { CompletionItem, CompletionItemStatus } from '../../types/completion.types';
import './CompletionItemList.css';

interface CompletionItemListProps {
  items: CompletionItem[];
  onReportMissing: (itemId: number, notes: string) => void;
}

export const CompletionItemList: React.FC<CompletionItemListProps> = ({
  items,
  onReportMissing,
}) => {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [missingNotes, setMissingNotes] = useState('');

  const getStatusClass = (status: CompletionItemStatus): string => {
    switch (status) {
      case 'SCANNED':
        return 'status-scanned';
      case 'MISSING':
        return 'status-missing';
      case 'PARTIAL':
        return 'status-partial';
      default:
        return 'status-pending';
    }
  };

  const getStatusLabel = (status: CompletionItemStatus): string => {
    switch (status) {
      case 'SCANNED':
        return '✓ Zeskanowane';
      case 'MISSING':
        return '✗ Brak';
      case 'PARTIAL':
        return '⚠ Częściowe';
      default:
        return '○ Oczekuje';
    }
  };

  const handleReportMissing = (itemId: number) => {
    onReportMissing(itemId, missingNotes);
    setSelectedItem(null);
    setMissingNotes('');
  };

  return (
    <div className="completion-item-list">
      <h3>Pozycje do skompletowania</h3>
      <div className="item-list">
        {items.map((item) => {
          const bomItem = item.bomItem;
          const materialStock = bomItem?.materialStock;
          const expectedQty = bomItem?.quantity || 0;

          return (
            <div key={item.id} className={`item-card ${getStatusClass(item.status)}`}>
              <div className="item-header">
                <div className="item-name">
                  {materialStock?.name || 'Nieznany materiał'}
                </div>
                <div className={`item-status ${getStatusClass(item.status)}`}>
                  {getStatusLabel(item.status)}
                </div>
              </div>

              <div className="item-details">
                {materialStock?.barcode && (
                  <div className="item-detail">
                    <span className="item-detail-label">Kod:</span>
                    <span className="item-detail-value">{materialStock.barcode}</span>
                  </div>
                )}
                {materialStock?.ean && (
                  <div className="item-detail">
                    <span className="item-detail-label">EAN:</span>
                    <span className="item-detail-value">{materialStock.ean}</span>
                  </div>
                )}
                <div className="item-detail">
                  <span className="item-detail-label">Ilość:</span>
                  <span className="item-detail-value">
                    {item.scannedQuantity} / {expectedQty} {materialStock?.unit || 'szt'}
                  </span>
                </div>
              </div>

              {item.status === 'PENDING' && (
                <div className="item-actions">
                  <button
                    onClick={() => setSelectedItem(item.id)}
                    className="btn btn-secondary btn-small"
                  >
                    Zgłoś brak
                  </button>
                </div>
              )}

              {item.notes && (
                <div className="item-notes">
                  <strong>Notatki:</strong> {item.notes}
                </div>
              )}

              {selectedItem === item.id && (
                <div className="missing-form">
                  <textarea
                    className="input"
                    value={missingNotes}
                    onChange={(e) => setMissingNotes(e.target.value)}
                    placeholder="Opcjonalna notatka..."
                    rows={3}
                  />
                  <div className="missing-form-buttons">
                    <button
                      onClick={() => handleReportMissing(item.id)}
                      className="btn btn-primary btn-small"
                    >
                      Potwierdź brak
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        setMissingNotes('');
                      }}
                      className="btn btn-secondary btn-small"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
