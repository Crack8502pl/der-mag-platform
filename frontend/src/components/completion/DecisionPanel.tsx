// src/components/completion/DecisionPanel.tsx
// Panel for making decisions on partial completions

import React, { useState } from 'react';
import { CompletionDecision } from '../../types/completion.types';
import './DecisionPanel.css';

interface DecisionPanelProps {
  onDecision: (decision: CompletionDecision, notes: string) => void;
  onCancel: () => void;
  missingCount: number;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  onDecision,
  onCancel,
  missingCount,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<CompletionDecision | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (selectedDecision) {
      onDecision(selectedDecision, notes);
    }
  };

  return (
    <div className="decision-panel-overlay">
      <div className="decision-panel card">
        <h2>Decyzja o kompletacji</h2>
        <p className="decision-warning">
          ⚠️ Brakuje {missingCount} pozycji. Wybierz działanie:
        </p>

        <div className="decision-options">
          <div
            className={`decision-option ${
              selectedDecision === CompletionDecision.CONTINUE_PARTIAL ? 'selected' : ''
            }`}
            onClick={() => setSelectedDecision(CompletionDecision.CONTINUE_PARTIAL)}
          >
            <div className="decision-option-header">
              <input
                type="radio"
                name="decision"
                checked={selectedDecision === CompletionDecision.CONTINUE_PARTIAL}
                onChange={() => setSelectedDecision(CompletionDecision.CONTINUE_PARTIAL)}
              />
              <strong>Kontynuuj z brakami</strong>
            </div>
            <p className="decision-option-desc">
              Zakończ kompletację mimo brakujących pozycji. System oznaczy zlecenie jako
              częściowo skompletowane.
            </p>
          </div>

          <div
            className={`decision-option ${
              selectedDecision === CompletionDecision.WAIT_FOR_COMPLETE ? 'selected' : ''
            }`}
            onClick={() => setSelectedDecision(CompletionDecision.WAIT_FOR_COMPLETE)}
          >
            <div className="decision-option-header">
              <input
                type="radio"
                name="decision"
                checked={selectedDecision === CompletionDecision.WAIT_FOR_COMPLETE}
                onChange={() => setSelectedDecision(CompletionDecision.WAIT_FOR_COMPLETE)}
              />
              <strong>Poczekaj na materiały</strong>
            </div>
            <p className="decision-option-desc">
              Wstrzymaj kompletację i poczekaj na uzupełnienie brakujących materiałów.
            </p>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Notatki (opcjonalne)</label>
          <textarea
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dodaj szczegóły decyzji..."
            rows={4}
          />
        </div>

        <div className="decision-buttons">
          <button
            onClick={handleSubmit}
            disabled={!selectedDecision}
            className="btn btn-primary"
          >
            Zatwierdź decyzję
          </button>
          <button onClick={onCancel} className="btn btn-secondary">
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};
