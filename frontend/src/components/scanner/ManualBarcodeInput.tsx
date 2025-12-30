// src/components/scanner/ManualBarcodeInput.tsx
// Manual barcode input fallback

import React, { useState } from 'react';
import './ManualBarcodeInput.css';

interface ManualBarcodeInputProps {
  onScan: (barcode: string) => void;
  onCancel: () => void;
}

export const ManualBarcodeInput: React.FC<ManualBarcodeInputProps> = ({
  onScan,
  onCancel,
}) => {
  const [barcode, setBarcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onScan(barcode.trim());
      setBarcode('');
    }
  };

  return (
    <div className="manual-input-overlay">
      <div className="manual-input-modal card">
        <h3>Wpisz kod kreskowy</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Wprowadź kod"
              autoFocus
            />
          </div>
          <div className="manual-input-buttons">
            <button type="submit" className="btn btn-primary" disabled={!barcode.trim()}>
              Zatwierdź
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
