// src/components/completion/CompletionScannerPage.tsx
// Main scanner page for completion orders

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '../scanner/BarcodeScanner';
import { ScanHistory } from '../scanner/ScanHistory';
import { CompletionItemList } from './CompletionItemList';
import { DecisionPanel } from './DecisionPanel';
import completionService from '../../services/completion.service';
import type { CompletionOrder, ScanResult, CompletionItemStatus, CompletionDecision } from '../../types/completion.types';
import './CompletionScannerPage.css';

export const CompletionScannerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<CompletionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await completionService.getOrder(parseInt(id!));
      setOrder(response.data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Błąd ładowania zlecenia');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (barcode: string) => {
    if (!order) return;

    try {
      const response = await completionService.scanItem(order.id, { barcode });
      
      // Add to scan history
      const bomItem = response.data.scannedItem.bomItem;
      const templateItem = bomItem?.templateItem;
      const materialName = templateItem?.name || 'Nieznany materiał';
      
      setScanHistory([
        {
          barcode,
          timestamp: new Date(),
          success: true,
          itemName: materialName,
        },
        ...scanHistory,
      ]);

      // Reload order to get updated data
      await loadOrder();

      // Show success message
      alert(`✓ Zeskanowano: ${materialName}`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMsg = error.response?.data?.message || 'Błąd skanowania';
      
      setScanHistory([
        {
          barcode,
          timestamp: new Date(),
          success: false,
        },
        ...scanHistory,
      ]);

      alert(`✗ ${errorMsg}`);
    }
  };

  const handleReportMissing = async (itemId: number, notes: string) => {
    if (!order) return;

    try {
      await completionService.reportMissing(order.id, { itemId, notes });
      await loadOrder();
      alert('✓ Zgłoszono brak pozycji');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(`✗ ${error.response?.data?.message || 'Błąd zgłaszania braku'}`);
    }
  };

  const handleComplete = async () => {
    if (!order) return;

    const missingCount = order.items.filter(
      (item) => item.status === 'MISSING' as CompletionItemStatus
    ).length;

    if (missingCount > 0) {
      setShowDecisionPanel(true);
    } else {
      try {
        await completionService.completeOrder(order.id);
        alert('✓ Kompletacja zakończona pomyślnie');
        navigate('/completion');
      } catch (err) {
        const error = err as { response?: { data?: { message?: string } } };
        alert(`✗ ${error.response?.data?.message || 'Błąd kończenia kompletacji'}`);
      }
    }
  };

  const handleDecision = async (decision: CompletionDecision, notes: string) => {
    if (!order) return;

    try {
      await completionService.makeDecision(order.id, { decision, notes });
      alert('✓ Decyzja zapisana');
      navigate('/completion');
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(`✗ ${error.response?.data?.message || 'Błąd zapisywania decyzji'}`);
    }
  };

  if (loading) {
    return (
      <div className="completion-scanner-loading">
        <div className="spinner"></div>
        <p>Ładowanie zlecenia...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="completion-scanner-error">
        <p>{error || 'Zlecenie nie znalezione'}</p>
        <button onClick={() => navigate('/completion')} className="btn btn-primary">
          Wróć do listy
        </button>
      </div>
    );
  }

  const progress = order.progress!;
  const isComplete = progress.pendingItems === 0 && progress.partialItems === 0;

  return (
    <div className="completion-scanner-page">
      <div className="completion-scanner-header">
        <button onClick={() => navigate('/completion')} className="btn btn-secondary back-btn">
          ← Wróć
        </button>
        <h1>Kompletacja #{order.id}</h1>
        <button
          onClick={() => setScannerEnabled(!scannerEnabled)}
          className={`btn ${scannerEnabled ? 'btn-secondary' : 'btn-primary'}`}
        >
          {scannerEnabled ? '⏸️ Zatrzymaj' : '▶️ Uruchom'} Skaner
        </button>
      </div>

      <div className="completion-progress-bar">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress.completionPercentage}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {progress.scannedItems} / {progress.totalItems} pozycji ({progress.completionPercentage}%)
        </div>
      </div>

      {scannerEnabled && (
        <div className="scanner-section">
          <BarcodeScanner onScan={handleScan} enabled={scannerEnabled} />
        </div>
      )}

      <div className="completion-content">
        <div className="completion-items-section">
          <CompletionItemList
            items={order.items}
            onReportMissing={handleReportMissing}
          />
        </div>

        <div className="scan-history-section">
          <ScanHistory scans={scanHistory} />
        </div>
      </div>

      {isComplete && (
        <div className="completion-complete-section">
          <button onClick={handleComplete} className="btn btn-primary btn-large">
            ✓ Zakończ kompletację
          </button>
        </div>
      )}

      {showDecisionPanel && (
        <DecisionPanel
          onDecision={handleDecision}
          onCancel={() => setShowDecisionPanel(false)}
          missingCount={progress.missingItems}
        />
      )}
    </div>
  );
};
