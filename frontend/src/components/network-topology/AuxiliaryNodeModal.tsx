// src/components/network-topology/AuxiliaryNodeModal.tsx
// Modal for adding an auxiliary node to the network topology canvas

import React, { useState, useEffect } from 'react';
import './AuxiliaryNodeModal.css';

interface AuxiliaryNodeResult {
  label: string;
  km: number;
  isActive: boolean;
}

interface AuxiliaryNodeModalProps {
  onClose: () => void;
  onConfirm: (result: AuxiliaryNodeResult) => void;
}

export const AuxiliaryNodeModal: React.FC<AuxiliaryNodeModalProps> = ({ onClose, onConfirm }) => {
  const [label, setLabel] = useState('');
  const [km, setKm] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [labelError, setLabelError] = useState('');
  const [kmError, setKmError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    let valid = true;

    if (!label.trim()) {
      setLabelError('Nazwa jest wymagana');
      valid = false;
    }

    const parsedKm = parseFloat(km);
    if (!km || isNaN(parsedKm) || parsedKm <= 0) {
      setKmError('Kilometraż musi być większy niż 0');
      valid = false;
    }

    if (!valid) return;

    onConfirm({
      label: label.trim(),
      km: parsedKm,
      isActive,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="auxiliary-modal-overlay" onClick={onClose}>
      <div
        className="auxiliary-modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="auxiliary-modal-header">
          <h2>🔧 Dodaj obiekt pomocniczy</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <div className="auxiliary-modal-form">
          {/* Label */}
          <div className="form-group">
            <label>
              Nazwa <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="np. Mufa łączeniowa"
              value={label}
              autoFocus
              onChange={e => {
                setLabel(e.target.value);
                if (labelError) setLabelError('');
              }}
            />
            {labelError && <span className="error-text">{labelError}</span>}
          </div>

          {/* Kilometraż */}
          <div className="form-group">
            <label>
              Kilometraż <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="number"
              placeholder="np. 12.5"
              value={km}
              min="0"
              step="0.1"
              onChange={e => {
                setKm(e.target.value);
                if (kmError) setKmError('');
              }}
            />
            {kmError && <span className="error-text">{kmError}</span>}
          </div>

          {/* Active checkbox */}
          <div className="form-group">
            <div className="auxiliary-checkbox-row">
              <input
                type="checkbox"
                id="auxiliary-active"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              <label htmlFor="auxiliary-active">Aktywny</label>
            </div>
            <p className="auxiliary-helper-text">
              Aktywny = zawiera urządzenia sieciowe. Pasywny = punkt połączenia bez urządzeń.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="auxiliary-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Dodaj obiekt
          </button>
        </div>
      </div>
    </div>
  );
};
