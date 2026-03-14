// src/components/scanner/BarcodeScanner.tsx
// Main barcode scanner component

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import './BarcodeScanner.css';

const SCAN_HISTORY_LIMIT = 10;

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

interface ScanHistoryEntry {
  code: string;
  timestamp: Date;
}

function playBeep(success: boolean): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: typeof AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(success ? 1046 : 440, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not supported - silently ignore
  }
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onError,
  enabled = true,
}) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const handleScanWithFeedback = useCallback((barcode: string) => {
    playBeep(true);
    setScanHistory(prev => {
      const entry: ScanHistoryEntry = { code: barcode, timestamp: new Date() };
      return [entry, ...prev].slice(0, SCAN_HISTORY_LIMIT);
    });
    lastScannedRef.current = barcode;
    onScan(barcode);
  }, [onScan]);

  const handleErrorWithFeedback = useCallback((error: string) => {
    playBeep(false);
    onError?.(error);
  }, [onError]);

  const {
    isScanning,
    startScanning,
    stopScanning,
    error,
    lastScannedCode,
  } = useBarcodeScanner(handleScanWithFeedback, handleErrorWithFeedback);

  useEffect(() => {
    if (enabled && !isScanning) {
      startScanning('scanner-video');
    } else if (!enabled && isScanning) {
      stopScanning();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const handleManualScan = (barcode: string) => {
    handleScanWithFeedback(barcode);
    setShowManualInput(false);
  };

  const toggleTorch = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet]
        });
        setTorchEnabled(!torchEnabled);
      }
    } catch {
      // Torch not supported on this device
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-video-container">
        <div id="scanner-video" className="scanner-video"></div>
        {isScanning && (
          <div className="scanner-viewfinder">
            <div className="viewfinder-corner tl"></div>
            <div className="viewfinder-corner tr"></div>
            <div className="viewfinder-corner bl"></div>
            <div className="viewfinder-corner br"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="scanner-error">
          <p>{error}</p>
          <button onClick={() => startScanning('scanner-video')} className="btn btn-primary">
            Spróbuj ponownie
          </button>
        </div>
      )}

      {lastScannedCode && (
        <div className="last-scan">
          <span className="last-scan-label">Ostatnio zeskanowane:</span>
          <span className="last-scan-code">{lastScannedCode}</span>
        </div>
      )}

      <div className="scanner-controls">
        <button
          onClick={toggleTorch}
          className="btn btn-secondary scanner-btn"
          title="Latarka"
        >
          🔦 Latarka
        </button>
        <button
          onClick={() => setShowManualInput(true)}
          className="btn btn-secondary scanner-btn"
        >
          ⌨️ Wpisz ręcznie
        </button>
        {scanHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="btn btn-secondary scanner-btn"
            title="Historia skanowań"
          >
            📋 Historia ({scanHistory.length})
          </button>
        )}
      </div>

      {showHistory && scanHistory.length > 0 && (
        <div className="scanner-history">
          <div className="scanner-history-header">
            <h4>Ostatnie skany</h4>
            <button
              className="btn btn-xs btn-secondary"
              onClick={() => setScanHistory([])}
            >
              Wyczyść
            </button>
          </div>
          <ul className="scanner-history-list">
            {scanHistory.map((entry, idx) => (
              <li key={idx} className="scanner-history-item">
                <span className="scanner-history-code">{entry.code}</span>
                <span className="scanner-history-time">
                  {entry.timestamp.toLocaleTimeString('pl-PL')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showManualInput && (
        <ManualBarcodeInput
          onScan={handleManualScan}
          onCancel={() => setShowManualInput(false)}
        />
      )}

      <div className="scanner-help">
        <p>Wyceluj kamerą w kod kreskowy</p>
        <p className="scanner-help-small">Obsługiwane: EAN-13, EAN-8, Code128, QR, Data Matrix</p>
      </div>
    </div>
  );
};
