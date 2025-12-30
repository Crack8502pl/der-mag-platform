// src/components/completion/CompletionOrderList.tsx
// List of completion orders

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import completionService from '../../services/completion.service';
import type { CompletionOrder } from '../../types/completion.types';
import './CompletionOrderList.css';

export const CompletionOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [orders, setOrders] = useState<CompletionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'assigned'>('assigned');

  useEffect(() => {
    loadOrders();
  }, [filter]);

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
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="completion-list-empty">
          <p>Brak zleceń kompletacji</p>
        </div>
      ) : (
        <div className="completion-cards">
          {orders.map((order) => (
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
      )}
    </div>
  );
};
