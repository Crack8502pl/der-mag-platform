// src/components/scanner/ScanHistory.tsx
// Component to show scan history

import React from 'react';
import type { ScanResult } from '../../types/completion.types';
import './ScanHistory.css';

interface ScanHistoryProps {
  scans: ScanResult[];
  onRemove?: (index: number) => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({ scans, onRemove }) => {
  if (scans.length === 0) {
    return (
      <div className="scan-history-empty">
        <p>Brak zeskanowanych kodów</p>
      </div>
    );
  }

  return (
    <div className="scan-history">
      <h3 className="scan-history-title">Historia skanów ({scans.length})</h3>
      <div className="scan-history-list">
        {scans.map((scan, index) => (
          <div
            key={index}
            className={`scan-history-item ${scan.success ? 'success' : 'error'}`}
          >
            <div className="scan-history-item-content">
              <div className="scan-history-barcode">
                {scan.success ? '✓' : '✗'} {scan.barcode}
              </div>
              {scan.itemName && (
                <div className="scan-history-item-name">{scan.itemName}</div>
              )}
              <div className="scan-history-time">
                {new Date(scan.timestamp).toLocaleTimeString('pl-PL')}
              </div>
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(index)}
                className="scan-history-remove"
                title="Cofnij"
              >
                ↶
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
