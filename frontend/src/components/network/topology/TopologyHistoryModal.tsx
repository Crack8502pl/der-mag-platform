// src/components/network/topology/TopologyHistoryModal.tsx
// Modal for browsing version history and restoring a previous topology snapshot

import React, { useState, useEffect } from 'react';
import networkTopologyService from '../../../services/networkTopology.service';
import type { NetworkTopology } from '../../../types/networkTopology.types';
import '../../../styles/grover-theme.css';

interface TopologyHistoryModalProps {
  contractId: number;
  subsystemIndex: number;
  onRestore: (topology: NetworkTopology) => void;
  onClose: () => void;
}

const PAGE_LIMIT = 10;

export const TopologyHistoryModal: React.FC<TopologyHistoryModalProps> = ({
  contractId,
  subsystemIndex,
  onRestore,
  onClose,
}) => {
  const [history, setHistory] = useState<NetworkTopology[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    networkTopologyService
      .getHistory(contractId, subsystemIndex, page, PAGE_LIMIT)
      .then(result => {
        if (!mounted) return;
        setHistory(result.data);
        setTotal(result.total);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Błąd ładowania historii wersji');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [contractId, subsystemIndex, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <h2>📜 Historia wersji topologii</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', margin: 0 }}>
              Brak historii wersji dla tej topologii
            </p>
          ) : (
            <div>
              {history.map(topo => (
                <div key={topo.id} className="topology-history-item">
                  <div className="topology-history-meta">
                    <span className="topology-history-version">Wersja {topo.version}</span>
                    <span className="topology-history-date">
                      {new Date(topo.createdAt).toLocaleString('pl-PL')}
                    </span>
                  </div>
                  <div className="topology-history-stats">
                    <span>Węzły: {topo.nodes.length}</span>
                    <span>Połączenia: {topo.connections.length}</span>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onRestore(topo)}
                    title={`Przywróć wersję ${topo.version}`}
                  >
                    ↩ Przywróć
                  </button>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="topology-history-pagination">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                  >
                    ← Poprzednia
                  </button>
                  <span className="topology-history-page-info">
                    Strona {page} / {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                  >
                    Następna →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
