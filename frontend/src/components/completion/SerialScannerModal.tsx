// src/components/completion/SerialScannerModal.tsx
// Modal for scanning serial numbers for serialized items

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SerialPatternsConfig } from '../../types/completion.types';
import './SerialScannerModal.css';

interface SerialScannerModalProps {
  isOpen: boolean;
  itemName: string;
  catalogNumber?: string | null;
  expectedCount: number;
  initialSerials?: string[];
  patternsConfig?: SerialPatternsConfig;
  onSave: (serials: string[]) => void;
  onClose: () => void;
}

export const SerialScannerModal: React.FC<SerialScannerModalProps> = ({
  isOpen,
  itemName,
  catalogNumber,
  expectedCount,
  initialSerials = [],
  patternsConfig,
  onSave,
  onClose
}) => {
  const [serials, setSerials] = useState<string[]>(initialSerials);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSerials(initialSerials);
      setInputValue('');
      setError('');
      setShowExitConfirm(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const applyStripPrefixes = useCallback((value: string): string => {
    if (!patternsConfig?.stripPrefixes?.length) return value;
    let result = value;
    for (const sp of patternsConfig.stripPrefixes) {
      if (sp.prefix && result.startsWith(sp.prefix)) {
        result = result.slice(sp.prefix.length);
        break;
      }
    }
    return result;
  }, [patternsConfig]);

  const validateSerial = useCallback((value: string): string | null => {
    if (!patternsConfig?.patterns?.length) return null;
    for (const pat of patternsConfig.patterns) {
      try {
        const regex = new RegExp(pat.pattern);
        if (regex.test(value)) return null;
      } catch {
        // invalid regex – skip
      }
    }
    return `Numer seryjny "${value}" nie pasuje do żadnego ze wzorców`;
  }, [patternsConfig]);

  const handleAddSerial = () => {
    const raw = inputValue.trim();
    if (!raw) return;

    const processed = applyStripPrefixes(raw);

    if (serials.includes(processed)) {
      setError(`Numer seryjny "${processed}" już został zeskanowany`);
      return;
    }

    const validationError = validateSerial(processed);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (serials.length >= expectedCount) {
      setError(`Osiągnięto maksymalną ilość ${expectedCount} numerów seryjnych`);
      return;
    }

    setSerials(prev => [...prev, processed]);
    setInputValue('');
    setError('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSerial();
    }
  };

  const handleRemove = (index: number) => {
    setSerials(prev => prev.filter((_, i) => i !== index));
    setError('');
  };

  const handleSave = () => {
    onSave(serials);
  };

  const handleClose = () => {
    if (serials.length > 0 && serials.length < expectedCount) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmExit = () => {
    onSave(serials);
    onClose();
  };

  if (!isOpen) return null;

  const progressPct = expectedCount > 0 ? Math.round((serials.length / expectedCount) * 100) : 0;
  const isComplete = serials.length >= expectedCount;

  return (
    <div className="serial-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="serial-modal-dialog">
        <div className="serial-modal-header">
          <div className="serial-modal-title">
            <span className="serial-modal-icon">📷</span>
            <div>
              <h3>Skanowanie numerów seryjnych</h3>
              <p className="serial-modal-subtitle">{itemName}{catalogNumber ? ` · ${catalogNumber}` : ''}</p>
            </div>
          </div>
          <button className="serial-modal-close" onClick={handleClose} aria-label="Zamknij">✕</button>
        </div>

        <div className="serial-modal-progress">
          <div className="serial-progress-bar-wrap">
            <div
              className={`serial-progress-bar-fill${isComplete ? ' complete' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className={`serial-progress-label${isComplete ? ' complete' : ''}`}>
            {serials.length} / {expectedCount}
            {isComplete && ' ✅'}
          </span>
        </div>

        <div className="serial-modal-body">
          <div className="serial-input-row">
            <input
              ref={inputRef}
              type="text"
              className="input serial-input"
              placeholder="Zeskanuj lub wpisz numer seryjny..."
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              disabled={isComplete}
              autoComplete="off"
            />
            <button
              className="btn btn-primary serial-add-btn"
              onClick={handleAddSerial}
              disabled={isComplete || !inputValue.trim()}
            >
              Dodaj
            </button>
          </div>

          {error && <p className="serial-error">{error}</p>}

          {serials.length > 0 && (
            <div className="serial-list">
              <p className="serial-list-label">Zeskanowane numery seryjne:</p>
              <ul>
                {serials.map((sn, idx) => (
                  <li key={idx} className="serial-list-item">
                    <span className="serial-index">{idx + 1}.</span>
                    <span className="serial-value">{sn}</span>
                    <button
                      className="serial-remove-btn"
                      onClick={() => handleRemove(idx)}
                      aria-label={`Usuń ${sn}`}
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isComplete && (
            <div className="serial-complete-msg">
              ✅ Wszystkie numery seryjne zostały zeskanowane
            </div>
          )}
        </div>

        <div className="serial-modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Zapisz ({serials.length})
          </button>
        </div>

        {showExitConfirm && (
          <div className="serial-exit-confirm">
            <div className="serial-exit-confirm-box">
              <p>⚠️ Zeskanowano {serials.length} z {expectedCount} numerów seryjnych. Czy chcesz zapisać częściowo?</p>
              <div className="serial-exit-confirm-btns">
                <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>Wróć do skanowania</button>
                <button className="btn btn-primary" onClick={handleConfirmExit}>Zapisz i wyjdź</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
