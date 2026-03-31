// src/components/completion/SerialScannerModal.tsx
// Modal for scanning serial numbers for serialized items

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SerialPatternsConfig } from '../../types/completion.types';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import './SerialScannerModal.css';

const SERIAL_SCANNER_VIDEO_ID = 'serial-scanner-video';

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
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep a ref to the latest serials array so the camera callback always
  // validates against current state (avoids stale-closure duplicates).
  const serialsRef = useRef<string[]>(serials);
  useEffect(() => { serialsRef.current = serials; }, [serials]);

  // Check camera availability on mount
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices()
      .then(devices => {
        const hasCamera = devices.some(d => d.kind === 'videoinput');
        setCameraAvailable(hasCamera);
        if (!hasCamera) setScanMode('manual');
      })
      .catch(() => {
        setCameraAvailable(false);
        setScanMode('manual');
      });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSerials(initialSerials);
      setInputValue('');
      setError('');
      setShowExitConfirm(false);
      // Decide which mode to start in
      const targetMode: 'camera' | 'manual' = cameraAvailable ? 'camera' : 'manual';
      setScanMode(targetMode);
      if (targetMode === 'manual') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, initialSerials, cameraAvailable]);

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

  const addSerial = useCallback((raw: string) => {
    const processed = applyStripPrefixes(raw.trim());
    if (!processed) return;

    // Use the ref to get the current serials without being a closure dependency.
    // This ensures the camera callback always validates against the latest list.
    const currentSerials = serialsRef.current;

    if (currentSerials.includes(processed)) {
      setError(`Numer seryjny "${processed}" już został zeskanowany`);
      return;
    }

    const validationError = validateSerial(processed);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (currentSerials.length >= expectedCount) {
      setError(`Osiągnięto maksymalną ilość ${expectedCount} numerów seryjnych`);
      return;
    }

    setSerials(prev => [...prev, processed]);
    setError('');
  }, [applyStripPrefixes, validateSerial, expectedCount]);

  // Camera scan handler
  const handleCameraScan = useCallback((barcode: string) => {
    addSerial(barcode);
  }, [addSerial]);

  const handleCameraError = useCallback((err: string) => {
    console.warn('Serial scanner camera error:', err);
    // If camera fails, fall back to manual mode
    setCameraAvailable(false);
    setScanMode('manual');
  }, []);

  const {
    isScanning,
    startScanning,
    stopScanning,
    error: cameraError,
  } = useBarcodeScanner(handleCameraScan, handleCameraError);

  // Start/stop scanner based on mode and modal open state
  useEffect(() => {
    if (!isOpen) {
      if (isScanning) stopScanning();
      return;
    }
    if (scanMode === 'camera' && cameraAvailable && !isScanning) {
      // Small delay to let the DOM render the video element
      const timer = setTimeout(() => {
        startScanning(SERIAL_SCANNER_VIDEO_ID);
      }, 200);
      return () => clearTimeout(timer);
    }
    if (scanMode !== 'camera' && isScanning) {
      stopScanning();
    }
  }, [isOpen, scanMode, cameraAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSerial = () => {
    const raw = inputValue.trim();
    if (!raw) return;
    addSerial(raw);
    setInputValue('');
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

  const handleSwitchToManual = () => {
    setScanMode('manual');
    setTimeout(() => inputRef.current?.focus(), 100);
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

        {/* Mode toggle */}
        <div className="scan-mode-toggle">
          <button
            className={`scan-mode-btn${scanMode === 'camera' ? ' active' : ''}`}
            onClick={() => setScanMode('camera')}
            disabled={!cameraAvailable || isComplete}
            title={cameraAvailable ? 'Skanuj kamerą' : 'Kamera niedostępna'}
          >
            📷 Kamera
          </button>
          <button
            className={`scan-mode-btn${scanMode === 'manual' ? ' active' : ''}`}
            onClick={handleSwitchToManual}
            disabled={isComplete}
          >
            ⌨️ Ręcznie
          </button>
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
          {scanMode === 'camera' && !isComplete ? (
            <div className="serial-camera-container">
              <div id={SERIAL_SCANNER_VIDEO_ID} className="serial-scanner-video" />
              {isScanning && (
                <div className="serial-scanner-viewfinder">
                  <div className="viewfinder-corner tl" />
                  <div className="viewfinder-corner tr" />
                  <div className="viewfinder-corner bl" />
                  <div className="viewfinder-corner br" />
                </div>
              )}
              {cameraError && (
                <div className="serial-camera-error">
                  <p>{cameraError}</p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => startScanning(SERIAL_SCANNER_VIDEO_ID)}
                  >
                    Spróbuj ponownie
                  </button>
                </div>
              )}
              {!isScanning && !cameraError && (
                <div className="serial-camera-loading">
                  <div className="spinner" />
                  <p>Uruchamianie kamery...</p>
                </div>
              )}
              <p className="serial-camera-hint">
                Wyceluj kamerą w kod kreskowy lub numer seryjny
              </p>
            </div>
          ) : (
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
          )}

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
