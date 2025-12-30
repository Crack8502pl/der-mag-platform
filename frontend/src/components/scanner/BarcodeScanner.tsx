// src/components/scanner/BarcodeScanner.tsx
// Main barcode scanner component

import React, { useEffect, useState } from 'react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { ManualBarcodeInput } from './ManualBarcodeInput';
import './BarcodeScanner.css';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onError,
  enabled = true,
}) => {
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  
  const {
    isScanning,
    startScanning,
    stopScanning,
    error,
    lastScannedCode,
  } = useBarcodeScanner(onScan, onError);

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
    onScan(barcode);
    setShowManualInput(false);
  };

  const toggleTorch = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled } as any]
        });
        setTorchEnabled(!torchEnabled);
      }
    } catch (err) {
      console.warn('Torch not supported on this device');
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
      </div>

      {showManualInput && (
        <ManualBarcodeInput
          onScan={handleManualScan}
          onCancel={() => setShowManualInput(false)}
        />
      )}

      <div className="scanner-help">
        <p>Wyceluj kamerą w kod kreskowy</p>
        <p className="scanner-help-small">Obsługiwane: EAN-13, Code128, QR</p>
      </div>
    </div>
  );
};
