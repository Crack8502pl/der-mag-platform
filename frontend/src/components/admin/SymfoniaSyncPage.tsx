// src/components/admin/SymfoniaSyncPage.tsx
// Admin panel for Symfonia synchronization: Magazyn (Warehouse) and Kontrakty (Contracts)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import symfoniaSyncService, { type SyncResult, type SyncStatus, type SyncHistory, type SyncProgress } from '../../services/symfoniaSync.service';
import { ModuleIcon } from '../common/ModuleIcon';

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pl-PL');
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const statusBadge = (status: 'success' | 'partial' | 'failed'): React.ReactNode => {
  const map = {
    success: { label: '✅ Sukces', color: '#155724', bg: '#d4edda' },
    partial: { label: '⚠️ Częściowy', color: '#856404', bg: '#fff3cd' },
    failed: { label: '❌ Błąd', color: '#721c24', bg: '#f8d7da' },
  };
  const s = map[status] || map.failed;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', background: s.bg, color: s.color, fontWeight: 600 }}>
      {s.label}
    </span>
  );
};

interface SyncSectionProps {
  title: string;
  description: React.ReactNode;
  progressEventUrl: string;
  onFullSync: () => Promise<SyncResult>;
  onQuickSync: () => Promise<SyncResult>;
  onLoadStatus: () => Promise<SyncStatus>;
  onLoadHistory: (limit: number) => Promise<SyncHistory[]>;
  cronLabel?: string;
}

const SyncSection: React.FC<SyncSectionProps> = ({
  title,
  description,
  progressEventUrl,
  onFullSync,
  onQuickSync,
  onLoadStatus,
  onLoadHistory,
  cronLabel,
}) => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [history, setHistory] = useState<SyncHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [syncLoading, setSyncLoading] = useState<'full' | 'quick' | null>(null);
  const [syncError, setSyncError] = useState('');
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const onLoadStatusRef = useRef(onLoadStatus);
  const onLoadHistoryRef = useRef(onLoadHistory);
  useEffect(() => { onLoadStatusRef.current = onLoadStatus; }, [onLoadStatus]);
  useEffect(() => { onLoadHistoryRef.current = onLoadHistory; }, [onLoadHistory]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const data = await onLoadStatusRef.current();
      setStatus(data);
    } catch (err: any) {
      console.error('Error loading sync status:', err);
      setStatusError(err?.response?.data?.message || 'Błąd podczas pobierania statusu');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await onLoadHistoryRef.current(10);
      setHistory(data);
    } catch (err: any) {
      console.error('Error loading sync history:', err);
      setHistoryError(err?.response?.data?.message || 'Błąd podczas pobierania historii');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Only run on mount; callbacks are stable via refs to avoid re-render polling loop
  }, []);

  const handleFullSync = async () => {
    setSyncLoading('full');
    setSyncError('');
    setLastResult(null);
    setSyncProgress({ phase: 'fetching', current: 0, total: 0, percentage: 0, message: 'Pobieranie danych z Symfonii...' });

    const eventSource = new EventSource(`/api${progressEventUrl}`);
    eventSource.onmessage = (event) => {
      try {
        const progress: SyncProgress = JSON.parse(event.data);
        setSyncProgress(progress);
      } catch (err) {
        console.warn('Failed to parse progress update:', err);
      }
    };

    try {
      const result = await onFullSync();
      setLastResult(result);
      setSyncProgress({
        phase: 'completed',
        current: result.stats.totalProcessed,
        total: result.stats.totalProcessed,
        percentage: 100,
        message: 'Synchronizacja zakończona!',
      });
      await loadStatus();
      await loadHistory();
    } catch (err: any) {
      setSyncError(err?.response?.data?.message || err?.message || 'Błąd synchronizacji');
      setSyncProgress(null);
    } finally {
      eventSource.close();
      setSyncLoading(null);
    }
  };

  const handleQuickSync = async () => {
    setSyncLoading('quick');
    setSyncError('');
    setLastResult(null);
    setSyncProgress(null);
    try {
      const result = await onQuickSync();
      setLastResult(result);
      await loadStatus();
      await loadHistory();
    } catch (err: any) {
      setSyncError(err?.response?.data?.message || err?.message || 'Błąd synchronizacji');
    } finally {
      setSyncLoading(null);
    }
  };

  const isLoading = syncLoading !== null;

  return (
    <div>
      {/* Sync Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">{title} — Akcje synchronizacji</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleFullSync}
              disabled={isLoading}
              title="Pełna synchronizacja — tworzy i aktualizuje wszystkie rekordy"
            >
              {syncLoading === 'full' ? '⏳ Synchronizuję...' : '🔄 Pełna synchronizacja'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleQuickSync}
              disabled={isLoading}
              title="Szybka synchronizacja — aktualizuje tylko statusy"
            >
              {syncLoading === 'quick' ? '⏳ Synchronizuję...' : '⚡ Szybka synchronizacja'}
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {description}
          </p>
          {syncError && (
            <div className="alert alert-error" style={{ marginTop: '1rem' }}>
              ❌ {syncError}
            </div>
          )}
          {syncProgress && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ height: 8, background: 'var(--border-color, #dee2e6)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${syncProgress.percentage}%`,
                    background: syncProgress.phase === 'completed' ? '#28a745' : '#007bff',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginBottom: 0 }}>
                {syncProgress.message}
                {syncProgress.total > 0 && ` (${syncProgress.current}/${syncProgress.total} — ${syncProgress.percentage}%)`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              Wynik ostatniej synchronizacji
              {lastResult.success ? ' ✅' : ' ⚠️'}
            </h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { label: 'Typ', value: lastResult.syncType === 'full' ? 'Pełna' : 'Szybka' },
                { label: 'Czas trwania', value: formatDuration(lastResult.duration) },
                { label: 'Przetworzono', value: lastResult.stats.totalProcessed },
                { label: 'Utworzono', value: lastResult.stats.created },
                { label: 'Zaktualizowano', value: lastResult.stats.updated },
                { label: 'Pominięto', value: lastResult.stats.skipped },
                { label: 'Błędy', value: lastResult.stats.errors },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '0.75rem', background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            {lastResult.errors && lastResult.errors.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Błędy ({lastResult.errors.length}):</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.8rem' }}>
                  {lastResult.errors.map((e, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                      {e.catalogNumber && <strong>{e.catalogNumber}: </strong>}
                      {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Status synchronizacji</h2>
          <button className="btn btn-secondary btn-sm" onClick={loadStatus} disabled={statusLoading}>
            {statusLoading ? 'Odświeżanie...' : '↻ Odśwież'}
          </button>
        </div>
        <div className="card-body">
          {statusError && <p className="alert alert-error">{statusError}</p>}
          {status ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ostatnia pełna synchronizacja</div>
                <div style={{ fontWeight: 600 }}>{formatDate(status.lastFullSync)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ostatnia szybka synchronizacja</div>
                <div style={{ fontWeight: 600 }}>{formatDate(status.lastQuickSync)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Następna automatyczna</div>
                <div style={{ fontWeight: 600 }}>{formatDate(status.nextScheduledSync)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Status</div>
                <div style={{ fontWeight: 600 }}>
                  {status.isRunning ? (
                    <span style={{ color: '#0c5460' }}>⏳ Trwa synchronizacja...</span>
                  ) : (
                    <span style={{ color: '#155724' }}>✅ Gotowy</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{cronLabel || 'CRON (auto)'}</div>
                <div style={{ fontWeight: 600 }}>
                  {status.cronEnabled ? (
                    <span style={{ color: '#155724' }}>✅ Aktywny</span>
                  ) : (
                    <span style={{ color: '#721c24' }}>❌ Wyłączony</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            !statusLoading && <p style={{ color: 'var(--text-muted)' }}>Brak danych</p>
          )}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="card-title">Historia synchronizacji</h2>
          <button className="btn btn-secondary btn-sm" onClick={loadHistory} disabled={historyLoading}>
            {historyLoading ? 'Ładowanie...' : '↻ Odśwież'}
          </button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {historyError && <p className="alert alert-error" style={{ margin: '1rem' }}>{historyError}</p>}
          {history.length === 0 && !historyLoading ? (
            <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>Brak historii synchronizacji</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Typ</th>
                    <th>Wywołane przez</th>
                    <th>Rozpoczęto</th>
                    <th>Status</th>
                    <th>Przetworzono</th>
                    <th>Utworzono</th>
                    <th>Zaktualizowano</th>
                    <th>Błędy</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{h.id}</td>
                      <td>{h.syncType === 'full' ? '🔄 Pełna' : '⚡ Szybka'}</td>
                      <td>{h.triggeredBy === 'admin' ? '👤 Admin' : '🤖 CRON'}</td>
                      <td>{formatDate(h.startedAt)}</td>
                      <td>{statusBadge(h.status)}</td>
                      <td>{h.stats.totalProcessed ?? '—'}</td>
                      <td>{h.stats.created ?? '—'}</td>
                      <td>{h.stats.updated ?? '—'}</td>
                      <td>{h.stats.errors ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type TabId = 'warehouse' | 'contracts';

export const SymfoniaSyncPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('warehouse');

  const tabStyle = (tab: TabId): React.CSSProperties => ({
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #007bff' : '3px solid transparent',
    background: 'none',
    color: activeTab === tab ? '#007bff' : 'var(--text-muted)',
    transition: 'color 0.15s, border-color 0.15s',
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
          ← Powrót
        </button>
        <h1 className="page-title">
          <ModuleIcon name="sync" emoji="🔄" size={28} />
          Synchronizacja Symfonia
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Dane przepływają jednokierunkowo: <strong>Symfonia MSSQL → PostgreSQL</strong> (tylko odczyt z Symfonii)
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color, #dee2e6)', marginBottom: '1.5rem', gap: 0 }}>
        <button style={tabStyle('warehouse')} onClick={() => setActiveTab('warehouse')}>
          📦 Magazyn
        </button>
        <button style={tabStyle('contracts')} onClick={() => setActiveTab('contracts')}>
          📋 Kontrakty
        </button>
      </div>

      {/* Warehouse tab */}
      {activeTab === 'warehouse' && (
        <SyncSection
          title="Magazyn"
          description={
            <>
              🔄 <strong>Pełna synchronizacja</strong> — pobiera kartotekę towarów (TW), stany (SM) i ruchy (MZ). Tworzy/aktualizuje wszystkie rekordy.<br />
              ⚡ <strong>Szybka synchronizacja</strong> — aktualizuje tylko ilości stanów magazynowych. Uruchamiana też automatycznie co godzinę przez CRON.
            </>
          }
          progressEventUrl="/admin/symfonia-sync/progress"
          onFullSync={() => symfoniaSyncService.fullSync()}
          onQuickSync={() => symfoniaSyncService.quickSync()}
          onLoadStatus={() => symfoniaSyncService.getStatus()}
          onLoadHistory={(limit) => symfoniaSyncService.getHistory(limit)}
          cronLabel="CRON (auto co 1h)"
        />
      )}

      {/* Contracts tab */}
      {activeTab === 'contracts' && (
        <SyncSection
          title="Kontrakty"
          description={
            <>
              🔄 <strong>Pełna synchronizacja</strong> — pobiera kontrakty z tabeli [SSCommon].[STElements] (ElementKindId=128). Tworzy/aktualizuje wszystkie rekordy w tabeli contracts. Sprawdza zmiany kierowników. Uruchamiana automatycznie co 3 godziny przez CRON.<br />
              ⚡ <strong>Szybka synchronizacja</strong> — aktualizuje statusy i kierowników kontraktów. Uruchamiana automatycznie co godzinę przez CRON.
            </>
          }
          progressEventUrl="/admin/symfonia-sync/contracts/progress"
          onFullSync={() => symfoniaSyncService.contractsFullSync()}
          onQuickSync={() => symfoniaSyncService.contractsQuickSync()}
          onLoadStatus={() => symfoniaSyncService.getContractsStatus()}
          onLoadHistory={(limit) => symfoniaSyncService.getContractsHistory(limit)}
          cronLabel="CRON (pełna co 3h, kierownicy co 1h)"
        />
      )}
    </div>
  );
};
