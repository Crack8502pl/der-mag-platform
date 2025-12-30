// src/hooks/useBarcodeScanner.ts
// Hook for barcode scanning functionality

import { useState, useEffect, useCallback, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseBarcodeScanner {
  isScanning: boolean;
  startScanning: (videoElementId: string) => Promise<void>;
  stopScanning: () => Promise<void>;
  error: string | null;
  lastScannedCode: string | null;
}

export const useBarcodeScanner = (
  onScan: (barcode: string) => void,
  onError?: (error: string) => void
): UseBarcodeScanner => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const playBeep = useCallback(() => {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      console.warn('Failed to play beep sound:', err);
    }
  }, []);

  const vibrate = useCallback(() => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (err) {
      console.warn('Failed to vibrate:', err);
    }
  }, []);

  const startScanning = useCallback(async (videoElementId: string) => {
    try {
      setError(null);
      
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }

      const scanner = new Html5Qrcode(videoElementId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Debounce scans (prevent duplicate scans)
          const now = Date.now();
          if (now - lastScanTimeRef.current < 2000) {
            return;
          }
          lastScanTimeRef.current = now;

          setLastScannedCode(decodedText);
          playBeep();
          vibrate();
          onScan(decodedText);
        },
        (errorMessage) => {
          // Scanning errors are normal when nothing is in frame
          // We only log them in debug mode
          if (import.meta.env.DEV) {
            console.debug('Scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
    } catch (err) {
      const errorMsg = err?.message || 'Nie udało się uruchomić skanera';
      setError(errorMsg);
      setIsScanning(false);
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [onScan, onError, playBeep, vibrate]);

  const stopScanning = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return {
    isScanning,
    startScanning,
    stopScanning,
    error,
    lastScannedCode,
  };
};
