// src/components/completion/CompletionOrderList.tsx
// List of completion orders

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import completionService from '../../services/completion.service';
import type { CompletionOrder } from '../../types/completion.types';
import './CompletionOrderList.css';

const PAGE_SIZE = 10;

function formatOrderCount(count: number): string {
  if (count === 1) return '1 zlecenie';
  if (count >= 2 && count <= 4) return `${count} zlecenia`;
  return `${count} zleceń`;
}

export const CompletionOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [orders, setOrders] = useState<CompletionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'assigned'>('assigned');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    loadOrders();
  }, [filter, statusFilter, sortBy, sortOrder]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await completionService.getOrders({
        all: filter === 'all',
      });
      setOrders(response.data);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Błąd ładowania zleceń');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'CREATED':
        return 'badge-gray';
      case 'IN_PROGRESS':
        return 'badge-blue';
      case 'WAITING_FOR_MATERIALS':
        return 'badge-yellow';
      case 'WAITING_DECISION':
        return 'badge-yellow';
      case 'COMPLETED':
        return 'badge-green';
      case 'CANCELLED':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'CREATED':
        return 'Utworzone';
      case 'IN_PROGRESS':
        return 'W trakcie';
      case 'WAITING_FOR_MATERIALS':
        return 'Oczekuje materiałów';
      case 'WAITING_DECISION':
        return 'Oczekuje decyzji';
      case 'COMPLETED':
        return 'Zakończone';
      case 'CANCELLED':
        return 'Anulowane';
      default:
        return status;
    }
  };

  const handleSort = (field: 'createdAt' | 'status') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortIcon = (field: 'createdAt' | 'status') => {
    if (sortBy !== field) return ' ↕';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  // Client-side filtering and sorting
  const filteredOrders = orders
    .filter(o => !statusFilter || o.status === statusFilter)
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const pagedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="completion-list-loading">
        <div className="spinner"></div>
        <p>Ładowanie zleceń...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="completion-list-error alert alert-error">
        {error}
      </div>
    );
  }

  return (
    <div className="completion-order-list">
      <div className="completion-list-header">
        <h2>Zlecenia kompletacji</h2>
        <div className="completion-filters">
          <button
            onClick={() => setFilter('assigned')}
            className={`btn ${filter === 'assigned' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Moje zlecenia
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Wszystkie
          </button>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="completion-filter-select"
          >
            <option value="">Wszystkie statusy</option>
            <option value="CREATED">Utworzone</option>
            <option value="IN_PROGRESS">W trakcie</option>
            <option value="WAITING_FOR_MATERIALS">Oczekuje materiałów</option>
            <option value="WAITING_DECISION">Oczekuje decyzji</option>
            <option value="COMPLETED">Zakończone</option>
            <option value="CANCELLED">Anulowane</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="completion-list-empty">
          <p>Brak zleceń kompletacji</p>
        </div>
      ) : (
        <>
          <div className="completion-sort-bar">
            <span className="completion-sort-label">Sortuj:</span>
            <button
              className={`btn btn-xs ${sortBy === 'createdAt' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSort('createdAt')}
            >
              Data{sortIcon('createdAt')}
            </button>
            <button
              className={`btn btn-xs ${sortBy === 'status' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleSort('status')}
            >
              Status{sortIcon('status')}
            </button>
            <span className="completion-count">
              {formatOrderCount(filteredOrders.length)}
            </span>
          </div>

          <div className="completion-cards">
            {pagedOrders.map((order) => (
              <div
                key={order.id}
                className="completion-card card"
                onClick={() => {
                  if (hasPermission('completion', 'scan')) {
                    navigate(`/completion/${order.id}/scanner`);
                  } else {
                    navigate(`/completion/${order.id}`);
                  }
                }}
              >
                <div className="completion-card-header">
                  <h3>Zlecenie #{order.id}</h3>
                  <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {order.subsystem && (
                  <div className="completion-card-detail">
                    <strong>Podsystem:</strong> {order.subsystem.name}
                  </div>
                )}

                {order.assignedTo && (
                  <div className="completion-card-detail">
                    <strong>Przypisane do:</strong> {order.assignedTo.firstName}{' '}
                    {order.assignedTo.lastName}
                  </div>
                )}

                {order.progress && (
                  <div className="completion-progress">
                    <div className="completion-progress-bar">
                      <div
                        className="completion-progress-fill"
                        style={{ width: `${order.progress.completionPercentage}%` }}
                      ></div>
                    </div>
                    <div className="completion-progress-text">
                      {order.progress.scannedItems} / {order.progress.totalItems} pozycji
                      {order.progress.missingItems > 0 &&
                        ` (${order.progress.missingItems} brakujące)`}
                    </div>
                  </div>
                )}

                <div className="completion-card-footer">
                  <span className="completion-date">
                    Utworzone: {new Date(order.createdAt).toLocaleDateString('pl-PL')}
                  </span>
                  {hasPermission('completion', 'scan') && order.status !== 'COMPLETED' && (
                    <span className="completion-action">📱 Skanuj →</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="completion-pagination">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Poprzednia
              </button>
              <span className="pagination-info">
                Strona {page} z {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Następna →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
