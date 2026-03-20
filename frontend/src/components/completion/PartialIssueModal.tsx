// src/components/completion/PartialIssueModal.tsx
// Modal for requesting partial issue when there are material shortages

import React, { useState } from 'react';
import type { CompletionOrder } from '../../types/completion.types';

export interface PartialIssueMissingItem {
  id: number;
  name: string;
  catalogNumber: string;
  planned: number;
  issued: number;
  missing: number;
}

interface PartialIssueModalProps {
  isOpen: boolean;
  order: CompletionOrder;
  missingItems: PartialIssueMissingItem[];
  onCancel: () => void;
  onRequestPartial: (notes?: string) => void;
}

export const PartialIssueModal: React.FC<PartialIssueModalProps> = ({
  isOpen,
  order,
  missingItems,
  onCancel,
  onRequestPartial,
}) => {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content partial-issue-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partial-issue-modal-title"
      >
        <div className="modal-header">
          <h2 id="partial-issue-modal-title">⚠️ Wykryto braki materiałowe</h2>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Zamknij">×</button>
        </div>

        <div className="modal-body">
          <p className="partial-issue-description">
            Zlecenie <strong>{order.taskNumber || `#${order.id}`}</strong> zawiera braki materiałowe.
            Wybierz akcję:
          </p>

          <h3 className="partial-issue-missing-title">Brakujące pozycje ({missingItems.length}):</h3>
          <div className="partial-issue-missing-list">
            <table className="partial-issue-table">
              <thead>
                <tr>
                  <th>Materiał</th>
                  <th>Nr katalogowy</th>
                  <th className="text-center">Wymagane</th>
                  <th className="text-center">Wydano</th>
                  <th className="text-center">Brakuje</th>
                </tr>
              </thead>
              <tbody>
                {missingItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="catalog-number">{item.catalogNumber}</td>
                    <td className="text-center">{item.planned}</td>
                    <td className="text-center">{item.issued}</td>
                    <td className="text-center missing-qty">−{item.missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="partial-issue-notes">
            <label htmlFor="partial-issue-notes-input" className="partial-issue-notes-label">
              📝 Notatki (opcjonalne):
            </label>
            <textarea
              id="partial-issue-notes-input"
              className="partial-issue-notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Dodaj szczegóły (np. powód braku materiałów)..."
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer partial-issue-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            title="Wróć do edycji i popraw ilości"
          >
            ✏️ Popraw
          </button>
          <button
            className="btn btn-warning"
            onClick={() => onRequestPartial(notes.trim() || undefined)}
            title="Wyślij prośbę o akceptację do kierownika"
          >
            📤 Wyślij zapytanie o wydanie częściowe
          </button>
        </div>
      </div>
    </div>
  );
};
