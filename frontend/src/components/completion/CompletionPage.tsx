// src/components/completion/CompletionPage.tsx
// Main completion page - sidebar with task list + central BOM table

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import completionService from '../../services/completion.service';
import type { CompletionOrder, CompletionItem, SerialPatternsConfig } from '../../types/completion.types';
import { SerialScannerModal } from './SerialScannerModal';
import { PartialIssueModal, type PartialIssueMissingItem } from './PartialIssueModal';
import './CompletionPage.css';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED': return '✅';
    case 'IN_PROGRESS': return '⏳';
    case 'CANCELLED': return '❌';
    case 'PARTIAL_PENDING_APPROVAL': return '⚠️';
    case 'PARTIAL_ISSUED': return '🔶';
    default: return '○';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'CREATED': return 'Utworzone';
    case 'IN_PROGRESS': return 'W trakcie';
    case 'WAITING_DECISION': return 'Oczekuje decyzji';
    case 'PARTIAL_PENDING_APPROVAL': return 'Oczekuje akceptacji';
    case 'PARTIAL_ISSUED': return 'Wydane częściowo';
    case 'COMPLETED': return 'Zakończone';
    case 'CANCELLED': return 'Anulowane';
    default: return status;
  }
};

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const CompletionPage: React.FC = () => {
  const { hasPermission } = usePermissions();

  const [orders, setOrders] = useState<CompletionOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CompletionOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned'>('assigned');

  // Tab state for sidebar: active tasks vs completed tasks
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Serial numbers tracked locally per item id
  const [localSerials, setLocalSerials] = useState<Record<number, string[]>>({});
  // Issued quantities tracked locally per item id (non-serialized items)
  const [localIssuedQty, setLocalIssuedQty] = useState<Record<number, number>>({});
  // Scanner modal state
  const [scannerItem, setScannerItem] = useState<CompletionItem | null>(null);
  const [patternsConfig, setPatternsConfig] = useState<SerialPatternsConfig | undefined>(undefined);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [actionMsg, setActionMsg] = useState('');
  // Inline location edit state: itemId -> current edit value
  const [editingLocation, setEditingLocation] = useState<Record<number, string>>({});
  const locationInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // Partial issue modal state
  const [partialIssueModal, setPartialIssueModal] = useState<{ open: boolean; missingItems: PartialIssueMissingItem[] }>({ open: false, missingItems: [] });

  const canScan = hasPermission('completion', 'scan');
  const canComplete = hasPermission('completion', 'complete');

  useEffect(() => {
    loadOrders();
    loadPatterns();
  }, [filter]);

  useEffect(() => {
    // On mobile default to sidebar closed
    if (isMobile()) setSidebarOpen(false);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await completionService.getOrders({ all: filter === 'all' });
      setOrders(response.data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Błąd ładowania zleceń');
    } finally {
      setLoading(false);
    }
  };

  const loadPatterns = async () => {
    try {
      const response = await completionService.getSerialPatterns();
      setPatternsConfig(response.data);
    } catch {
      // Patterns are optional – silently ignore
    }
  };

  const selectOrder = async (order: CompletionOrder) => {
    try {
      setOrderLoading(true);
      setActionMsg('');
      const response = await completionService.getOrder(order.id);
      setSelectedOrder(response.data);
      // Initialize localSerials from the enriched items
      const initialSerials: Record<number, string[]> = {};
      const initialIssuedQty: Record<number, number> = {};
      for (const item of response.data.items) {
        if (item.serialNumbers?.length) {
          initialSerials[item.id] = item.serialNumbers;
        }
        if (item.issuedQuantity != null) {
          initialIssuedQty[item.id] = item.issuedQuantity;
        }
      }
      setLocalSerials(initialSerials);
      setLocalIssuedQty(initialIssuedQty);
      if (isMobile()) setSidebarOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Błąd ładowania zlecenia');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleSaveSerials = useCallback((itemId: number, serials: string[]) => {
    setLocalSerials(prev => ({ ...prev, [itemId]: serials }));
    setScannerItem(null);
  }, []);

  const handleSave = async () => {
    if (!selectedOrder) return;
    setSaveState('saving');
    setActionMsg('');
    try {
      const serializedItems = selectedOrder.items.filter(item => item.requiresSerialNumber || item.isSerialized);
      await Promise.all(
        serializedItems.map(item =>
          completionService.saveItemSerials(
            selectedOrder.id,
            item.id,
            localSerials[item.id] || []
          )
        )
      );
      setSaveState('saved');
      setActionMsg('✅ Postęp zapisany');
      // Reload the order to reflect updated status
      const refreshed = await completionService.getOrder(selectedOrder.id);
      setSelectedOrder(refreshed.data);
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setSaveState('error');
      setActionMsg('❌ ' + (e.response?.data?.message || 'Błąd zapisywania'));
    }
  };

  const handleIssue = async () => {
    if (!selectedOrder) return;

    // First check for shortages in non-serialized items (before confirm!)
    const missingItems: PartialIssueMissingItem[] = selectedOrder.items
      .filter(item => !(item.requiresSerialNumber || item.isSerialized))
      .map(item => {
        const planned = getPlannedQuantity(item);
        const issued = localIssuedQty[item.id] ?? item.issuedQuantity ?? item.scannedQuantity ?? 0;
        return {
          id: item.id,
          name: item.materialName || item.bomItem?.templateItem?.name || '—',
          catalogNumber: item.catalogNumber || item.bomItem?.templateItem?.partNumber || '—',
          planned,
          issued,
          missing: Math.max(0, planned - issued),
        };
      })
      .filter(item => item.missing > 0);

    // If there are shortages - show modal (do NOT show confirm yet)
    if (missingItems.length > 0) {
      setPartialIssueModal({ open: true, missingItems });
      return;
    }

    // Only if there are NO shortages - show confirm and issue
    if (!window.confirm(`Czy na pewno chcesz wydać materiały dla zlecenia ${selectedOrder.taskNumber || `#${selectedOrder.id}`}?`)) return;
    try {
      // Save all serial numbers first
      await handleSave();
      await completionService.completeOrder(selectedOrder.id);
      setActionMsg('✅ Materiały wydane');
      await loadOrders();
      const refreshed = await completionService.getOrder(selectedOrder.id);
      setSelectedOrder(refreshed.data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionMsg('❌ ' + (e.response?.data?.message || 'Błąd wydawania materiałów'));
    }
  };

  const handleRequestPartial = async (notes?: string) => {
    if (!selectedOrder) return;
    setPartialIssueModal({ open: false, missingItems: [] });
    try {
      await completionService.requestPartialIssue(selectedOrder.id, localIssuedQty, notes);
      setActionMsg('⚠️ Proszę czekać na zgodę kierownika');
      await loadOrders();
      const refreshed = await completionService.getOrder(selectedOrder.id);
      setSelectedOrder(refreshed.data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionMsg('❌ ' + (e.response?.data?.message || 'Błąd zgłoszenia częściowego wydania'));
    }
  };

  const handleApprovePartial = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Czy na pewno chcesz zatwierdzić częściowe wydanie dla zlecenia ${selectedOrder.taskNumber || `#${selectedOrder.id}`}?`)) return;
    try {
      await completionService.approvePartialIssue(selectedOrder.id);
      setActionMsg('✅ Częściowe wydanie zatwierdzone');
      await loadOrders();
      const refreshed = await completionService.getOrder(selectedOrder.id);
      setSelectedOrder(refreshed.data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionMsg('❌ ' + (e.response?.data?.message || 'Błąd zatwierdzania'));
    }
  };

  const handleReopenOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Czy na pewno chcesz ponownie otworzyć zlecenie ${selectedOrder.taskNumber || `#${selectedOrder.id}`} do dokończenia?`)) return;
    try {
      await completionService.reopenOrder(selectedOrder.id);
      setActionMsg('🔄 Zlecenie ponownie otwarte');
      await loadOrders();
      const refreshed = await completionService.getOrder(selectedOrder.id);
      setSelectedOrder(refreshed.data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionMsg('❌ ' + (e.response?.data?.message || 'Błąd ponownego otwierania'));
    }
  };

  const handleCancel = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Czy na pewno chcesz anulować zlecenie ${selectedOrder.taskNumber || `#${selectedOrder.id}`}? Tej operacji nie można cofnąć.`)) return;
    try {
      await completionService.cancelOrder(selectedOrder.id);
      setActionMsg('✅ Zlecenie anulowane');
      await loadOrders();
      const refreshed = await completionService.getOrder(selectedOrder.id);
      setSelectedOrder(refreshed.data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionMsg('❌ ' + (e.response?.data?.message || 'Błąd anulowania zlecenia'));
    }
  };

  const getItemStatus = (item: CompletionItem) => {
    const isSerial = item.requiresSerialNumber || item.isSerialized;
    if (isSerial) {
      const serials = localSerials[item.id] || item.serialNumbers || [];
      const planned = getPlannedQuantity(item);
      if (serials.length >= planned && planned > 0) return 'complete';
      if (serials.length > 0) return 'partial';
      return 'pending';
    }
    if (item.status === 'SCANNED') return 'complete';
    if (item.status === 'PARTIAL') return 'partial';
    return 'pending';
  };

  const getPlannedQuantity = (item: CompletionItem): number =>
    Number(item.plannedQuantity ?? item.bomItem?.quantity ?? item.expectedQuantity ?? 0);

  const getStockClass = (item: CompletionItem): string => {
    const stock = item.stockQuantity;
    if (stock == null) return '';
    const planned = getPlannedQuantity(item);
    if (stock === 0) return 'stock-zero';
    if (planned > 0 && stock < planned * 0.5) return 'stock-low';
    if (planned > 0 && stock < planned) return 'stock-partial';
    return 'stock-ok';
  };

  const getIssuedInputClass = (item: CompletionItem): string => {
    const issued = localIssuedQty[item.id] ?? item.scannedQuantity ?? 0;
    const planned = getPlannedQuantity(item);
    if (issued >= planned && planned > 0) return 'complete';
    if (issued > 0 && issued < planned) return 'incomplete';
    return '';
  };

  const handleLocationEdit = (item: CompletionItem) => {
    setEditingLocation(prev => ({ ...prev, [item.id]: item.warehouseLocation ?? '' }));
    setTimeout(() => locationInputRefs.current[item.id]?.focus(), 50);
  };

  const handleLocationSave = async (item: CompletionItem, orderId: number) => {
    const newLocation = editingLocation[item.id] ?? '';
    setEditingLocation(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    if (newLocation === (item.warehouseLocation ?? '')) return;
    try {
      await completionService.updateWarehouseLocation(orderId, item.id, newLocation);
      // Update the local state
      setSelectedOrder(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(i =>
            i.id === item.id ? { ...i, warehouseLocation: newLocation || null } : i
          )
        };
      });
    } catch {
      setActionMsg('❌ Błąd aktualizacji lokalizacji');
    }
  };

  return (
    <div className="completion-page">
      {/* Header */}
      <div className="completion-header">
        <div className="completion-header-left">
          <button
            className="btn btn-secondary sidebar-toggle"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label={sidebarOpen ? 'Ukryj sidebar' : 'Pokaż sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <BackButton />
          <div className="completion-header-title">
            <span className="completion-header-icon">
              <ModuleIcon name="completion" emoji="📦" size={24} alt="Kompletacja" />
            </span>
            <h1>KOMPLETACJA</h1>
          </div>
        </div>
        {selectedOrder && (
          <div className="completion-header-task">
            <span className="completion-task-badge">
              {selectedOrder.taskNumber || `#${selectedOrder.id}`}
            </span>
          </div>
        )}
      </div>

      <div className="completion-layout">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && isMobile() && (
          <div className="completion-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`completion-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-header">
            <h2>📋 LISTA ZADAŃ</h2>
            <div className="sidebar-filter">
              <button
                className={`btn btn-sm${filter === 'assigned' ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setFilter('assigned')}
              >
                Moje
              </button>
              <button
                className={`btn btn-sm${filter === 'all' ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setFilter('all')}
              >
                Wszystkie
              </button>
            </div>
            <div className="completion-tabs">
              <button
                className={`tab-btn${activeTab === 'active' ? ' active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Aktywne
              </button>
              <button
                className={`tab-btn${activeTab === 'completed' ? ' active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Zakończone
              </button>
            </div>
          </div>

          <div className="sidebar-body">
            {loading && <p className="sidebar-loading">Ładowanie...</p>}
            {error && <p className="sidebar-error">{error}</p>}
            {(() => {
              const filteredOrders = orders.filter(order => {
                if (activeTab === 'active') {
                  return ['CREATED', 'IN_PROGRESS', 'WAITING_DECISION', 'WAITING_FOR_MATERIALS', 'PARTIAL_PENDING_APPROVAL'].includes(order.status);
                } else {
                  return ['COMPLETED', 'CANCELLED', 'PARTIAL_ISSUED'].includes(order.status);
                }
              });
              return (
                <>
                  {!loading && !error && filteredOrders.length === 0 && (
                    <p className="sidebar-empty">Brak zleceń kompletacji</p>
                  )}
                  {filteredOrders.map(order => {
                    const pct = order.progress?.completionPercentage ?? 0;
                    const scanned = order.progress?.scannedItems ?? 0;
                    const total = order.progress?.totalItems ?? 0;
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <button
                        key={order.id}
                        className={`sidebar-task-card${isSelected ? ' selected' : ''}`}
                        onClick={() => selectOrder(order)}
                      >
                        <div className="task-card-header">
                          <span className="task-card-number">{order.taskNumber || `#${order.id}`}</span>
                          <span className="task-card-status-icon">{getStatusIcon(order.status)}</span>
                        </div>
                        {order.subsystem?.name && (
                          <div className="task-card-name">{order.subsystem.name}</div>
                        )}
                        <div className="task-card-progress">
                          <div className="task-progress-bar">
                            <div className="task-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="task-progress-label">{scanned}/{total}</span>
                        </div>
                        <div className="task-card-meta">
                          <span className={`task-status-badge status-${order.status.toLowerCase()}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        {(order.status === 'COMPLETED' || order.status === 'PARTIAL_ISSUED') && order.completedAt && (
                          <div className="order-completed-info">
                            <span className="completed-by">
                              ✓ {order.completedBy ? `${order.completedBy.firstName} ${order.completedBy.lastName}` : `${order.assignedTo?.firstName} ${order.assignedTo?.lastName}`}
                            </span>
                            <span className="completed-at">
                              {new Date(order.completedAt).toLocaleDateString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </aside>

        {/* Main content */}
        <main className="completion-main">
          {!selectedOrder && !orderLoading && (
            <div className="completion-empty-state">
              <div className="completion-empty-icon">📋</div>
              <h2>Wybierz zlecenie</h2>
              <p>Kliknij na zlecenie z listy po lewej stronie, aby zobaczyć BOM i zacząć kompletację.</p>
              {!sidebarOpen && (
                <button className="btn btn-primary" onClick={() => setSidebarOpen(true)}>
                  ▶ Otwórz listę zadań
                </button>
              )}
            </div>
          )}

          {orderLoading && (
            <div className="completion-empty-state">
              <p>Ładowanie zlecenia...</p>
            </div>
          )}

          {selectedOrder && !orderLoading && (
            <div className="completion-order-view">
              <div className="order-view-header">
                <div>
                  <h2>📊 BOM – {selectedOrder.taskNumber || `#${selectedOrder.id}`}</h2>
                  {selectedOrder.subsystem?.name && (
                    <p className="order-subsystem-name">{selectedOrder.subsystem.name}</p>
                  )}
                  {selectedOrder.subsystem?.contract && (
                    <div className="order-contract-info">
                      <p className="order-contract-number">
                        <strong>Kontrakt:</strong> <code>{selectedOrder.subsystem.contract.contractNumber}</code>
                      </p>
                      <p className="order-contract-name">
                        <strong>Nazwa:</strong> {selectedOrder.subsystem.contract.customName}
                      </p>
                      <p className="order-contract-manager">
                        <strong>Kierownik:</strong> {
                          selectedOrder.subsystem.contract.projectManager
                            ? `${selectedOrder.subsystem.contract.projectManager.firstName} ${selectedOrder.subsystem.contract.projectManager.lastName}`
                            : selectedOrder.subsystem.contract.managerCode || 'N/A'
                        }
                      </p>
                    </div>
                  )}
                </div>
                <div className="order-progress-summary">
                  <div className="order-progress-bar-wrap">
                    <div
                      className="order-progress-bar-fill"
                      style={{ width: `${selectedOrder.progress?.completionPercentage ?? 0}%` }}
                    />
                  </div>
                  <span className="order-progress-text">
                    {selectedOrder.progress?.scannedItems ?? 0} / {selectedOrder.progress?.totalItems ?? 0} pozycji
                    ({selectedOrder.progress?.completionPercentage ?? 0}%)
                  </span>
                </div>
              </div>

              {/* BOM Table */}
              <div className="bom-table-wrapper">
                <table className="bom-table">
                  <thead>
                    <tr>
                      <th>L.P.</th>
                      <th>Nazwa</th>
                      <th>Nr katalogowy</th>
                      <th>Ilość z BOM</th>
                      <th>Na stanie</th>
                      <th>Ilość wydana</th>
                      <th>Lokalizacja</th>
                      <th>Seryjne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => {
                      const isSerial = item.requiresSerialNumber || item.isSerialized;
                      const serials = localSerials[item.id] || item.serialNumbers || [];
                      const planned = getPlannedQuantity(item);
                      const rowStatus = getItemStatus(item);
                      return (
                        <tr
                          key={item.id}
                          className={`bom-row bom-row-${rowStatus}`}
                        >
                          <td className="bom-lp">{idx + 1}</td>
                          <td className="bom-name">
                            {item.materialName || item.bomItem?.templateItem?.name || '—'}
                          </td>
                          <td className="bom-catalog">
                            {item.catalogNumber || item.bomItem?.templateItem?.partNumber || '—'}
                          </td>
                          <td className="bom-qty-bom">{planned || '—'}</td>
                          <td className={`bom-qty-stock ${getStockClass(item)}`}>
                            {item.stockQuantity != null ? (
                              <>
                                {item.stockQuantity}
                                {item.stockQuantity === 0 ? ' ❌' : item.stockQuantity < planned ? ' ⚠️' : ' ✓'}
                              </>
                            ) : '—'}
                          </td>
                          <td className="bom-qty-issued">
                            {!item.isSerialized && !item.requiresSerialNumber ? (
                              <input
                                type="number"
                                className={`issued-quantity-input ${getIssuedInputClass(item)}`}
                                value={localIssuedQty[item.id] ?? item.scannedQuantity ?? 0}
                                min={0}
                                max={planned}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, planned));
                                  setLocalIssuedQty(prev => ({ ...prev, [item.id]: val }));
                                }}
                                disabled={selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED'}
                              />
                            ) : (
                              <span className="bom-no-serial">—</span>
                            )}
                          </td>
                          <td className="bom-location">
                            {item.id in editingLocation ? (
                              <input
                                ref={el => { locationInputRefs.current[item.id] = el; }}
                                className="location-input"
                                value={editingLocation[item.id]}
                                onChange={e => setEditingLocation(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onBlur={() => handleLocationSave(item, selectedOrder.id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingLocation(prev => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }
                                }}
                                disabled={selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED'}
                              />
                            ) : (
                              <span
                                className={`location-display${item.warehouseStockId ? ' location-editable' : ''}`}
                                onClick={() => item.warehouseStockId ? handleLocationEdit(item) : undefined}
                                title={item.warehouseStockId ? 'Kliknij aby edytować lokalizację' : undefined}
                              >
                                {item.warehouseLocation || '—'}
                                {item.warehouseStockId && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && ' ✏️'}
                              </span>
                            )}
                          </td>
                          <td className="bom-serial">
                            {isSerial ? (
                              <div className="serial-cell">
                                <button
                                  className={`btn btn-sm serial-scan-btn${serials.length >= planned && planned > 0 ? ' complete' : ''}`}
                                  onClick={() => setScannerItem(item)}
                                  disabled={!canScan || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED'}
                                  title={serials.length > 0 ? serials.join(', ') : 'Skanuj numery seryjne'}
                                >
                                  📷 {serials.length}/{planned}
                                </button>
                              </div>
                            ) : (
                              <span className="bom-no-serial">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action message */}
              {actionMsg && (
                <div className={`action-msg${actionMsg.startsWith('❌') ? ' action-msg-error' : ' action-msg-success'}`}>
                  {actionMsg}
                </div>
              )}

              {/* Action buttons */}
              <div className="order-actions">
                <button
                  className="btn btn-primary action-btn"
                  onClick={handleIssue}
                  disabled={selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'PARTIAL_PENDING_APPROVAL' || selectedOrder.status === 'PARTIAL_ISSUED' || !canComplete}
                  title="Wydaj materiały"
                >
                  ✅ Wydaj
                </button>
                <button
                  className="btn btn-secondary action-btn"
                  onClick={handleSave}
                  disabled={saveState === 'saving' || selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'PARTIAL_PENDING_APPROVAL' || selectedOrder.status === 'PARTIAL_ISSUED'}
                  title="Zapisz postęp"
                >
                  {saveState === 'saving' ? '⏳ Zapisuje...' : '💾 Zapisz'}
                </button>
                {selectedOrder.status === 'PARTIAL_PENDING_APPROVAL' && canComplete && (
                  <button
                    className="btn btn-warning action-btn"
                    onClick={handleApprovePartial}
                    title="Zatwierdź częściowe wydanie (kierownik)"
                  >
                    ⚠️ Akceptuj wydanie częściowe
                  </button>
                )}
                {selectedOrder.status === 'PARTIAL_ISSUED' && (
                  <button
                    className="btn btn-secondary action-btn"
                    onClick={handleReopenOrder}
                    title="Ponownie otwórz do dokończenia kompletacji"
                  >
                    🔄 Ponownie otwórz
                  </button>
                )}
                <button
                  className="btn action-btn action-btn-cancel"
                  onClick={handleCancel}
                  disabled={selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CANCELLED' || selectedOrder.status === 'PARTIAL_ISSUED'}
                  title="Anuluj zlecenie"
                >
                  ❌ Anuluj
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Serial Scanner Modal */}
      {scannerItem && (
        <SerialScannerModal
          isOpen={!!scannerItem}
          itemName={scannerItem.materialName || scannerItem.bomItem?.templateItem?.name || ''}
          catalogNumber={scannerItem.catalogNumber || scannerItem.bomItem?.templateItem?.partNumber}
          expectedCount={getPlannedQuantity(scannerItem) || 1}
          initialSerials={localSerials[scannerItem.id] || scannerItem.serialNumbers || []}
          patternsConfig={patternsConfig}
          onSave={(serials) => handleSaveSerials(scannerItem.id, serials)}
          onClose={() => setScannerItem(null)}
        />
      )}

      {/* Partial Issue Modal */}
      {selectedOrder && partialIssueModal.open && (
        <PartialIssueModal
          isOpen={partialIssueModal.open}
          order={selectedOrder}
          missingItems={partialIssueModal.missingItems}
          onCancel={() => setPartialIssueModal({ open: false, missingItems: [] })}
          onRequestPartial={handleRequestPartial}
        />
      )}
    </div>
  );
};
