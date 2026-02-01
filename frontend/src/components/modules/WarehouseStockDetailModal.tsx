// src/components/modules/WarehouseStockDetailModal.tsx
// Modal for displaying warehouse stock material details (read-only)

import React, { useState, useEffect, useCallback } from 'react';
import { warehouseStockService } from '../../services/warehouseStock.service';
import type { WarehouseStock, WarehouseStockHistory, StockOperationType } from '../../types/warehouseStock.types';
import './WarehouseStockPage.css';

interface Props {
  item: WarehouseStock;
  onClose: () => void;
}

export const WarehouseStockDetailModal: React.FC<Props> = ({ item, onClose }) => {
  const [history, setHistory] = useState<WarehouseStockHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const response = await warehouseStockService.getHistory(item.id, 50);
      setHistory(response.data);
    } catch (err) {
      console.error('Błąd ładowania historii:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [item.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getOperationTypeLabel = (type: StockOperationType): string => {
    const labels: Record<StockOperationType, string> = {
      'CREATED': '🆕 Utworzono',
      'UPDATED': '✏️ Zaktualizowano',
      'DELETED': '🗑️ Usunięto',
      'STOCK_IN': '📥 Przyjęcie',
      'STOCK_OUT': '📤 Wydanie',
      'STOCK_ADJUSTMENT': '⚖️ Korekta stanu',
      'RESERVED': '🔒 Zarezerwowano',
      'RESERVATION_RELEASED': '🔓 Zwolniono rezerwację',
      'ASSIGNED_TO_SUBSYSTEM': '🔗 Przypisano do subsystemu',
      'ASSIGNED_TO_TASK': '📋 Przypisano do zadania',
      'MAPPED_TO_BOM': '📦 Zmapowano do BOM',
      'MAPPED_TO_WORKFLOW': '🔄 Zmapowano do workflow',
      'PRICE_UPDATE': '💰 Zmiana ceny',
      'LOCATION_CHANGE': '📍 Zmiana lokalizacji',
      'STATUS_CHANGE': '🔄 Zmiana statusu',
      'IMPORT': '📥 Import'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const InfoRow: React.FC<{ label: string; value: string | number | null | undefined }> = ({ label, value }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{label}:</span>
      <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
        {value !== null && value !== undefined && value !== '' ? value : '-'}
      </span>
    </div>
  );

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content card"
        style={{
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '30px',
          margin: '20px auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                👁️ Szczegóły materiału
              </h2>
              <code style={{ 
                fontSize: '16px', 
                padding: '6px 12px', 
                background: 'var(--bg-secondary)', 
                borderRadius: 'var(--radius-md)',
                color: 'var(--primary-color)',
                fontWeight: '600'
              }}>
                {item.catalogNumber}
              </code>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              ✕
            </button>
          </div>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', margin: 0 }}>
            {item.materialName}
          </h3>
        </div>

        {/* Informacje podstawowe */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Informacje podstawowe
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <InfoRow label="Numer katalogowy" value={item.catalogNumber} />
            <InfoRow label="Nazwa materiału" value={item.materialName} />
            <InfoRow label="Opis" value={item.description} />
            <InfoRow label="Kategoria" value={item.category} />
            <InfoRow label="Podkategoria" value={item.subcategory} />
            <InfoRow label="Typ materiału" value={item.materialType} />
            <InfoRow label="Kategoria urządzenia" value={item.deviceCategory} />
            <InfoRow label="UUID" value={item.uuid} />
          </div>
        </div>

        {/* Stany magazynowe */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📊 Stany magazynowe
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Stan magazynowy</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: '700' }}>{item.quantityInStock}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.unit}</div>
              </div>
              <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Zarezerwowane</div>
                <div style={{ color: 'var(--warning)', fontSize: '28px', fontWeight: '700' }}>{item.quantityReserved}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.unit}</div>
              </div>
              <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Dostępne</div>
                <div style={{ color: 'var(--success)', fontSize: '28px', fontWeight: '700' }}>{item.quantityAvailable}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.unit}</div>
              </div>
            </div>
            <InfoRow label="Min. poziom stanu" value={item.minStockLevel} />
            <InfoRow label="Max. poziom stanu" value={item.maxStockLevel} />
            <InfoRow label="Punkt zamówienia" value={item.reorderPoint} />
            <InfoRow label="Status" value={item.status} />
          </div>
        </div>

        {/* Lokalizacja */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📍 Lokalizacja magazynowa
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <InfoRow label="Lokalizacja magazynowa" value={item.warehouseLocation} />
            <InfoRow label="Strefa składowania" value={item.storageZone} />
          </div>
        </div>

        {/* Dostawca */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🏢 Dostawca i producent
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <InfoRow label="Dostawca" value={item.supplier} />
            <InfoRow label="Numer kat. dostawcy" value={item.supplierCatalogNumber} />
            <InfoRow label="Producent" value={item.manufacturer} />
            <InfoRow label="Numer części (P/N)" value={item.partNumber} />
          </div>
        </div>

        {/* Ceny */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💰 Ceny
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <InfoRow label="Cena jednostkowa" value={item.unitPrice ? `${item.unitPrice} ${item.currency}` : null} />
            <InfoRow label="Cena zakupu" value={item.purchasePrice ? `${item.purchasePrice} ${item.currency}` : null} />
            <InfoRow label="Ostatnia cena zakupu" value={item.lastPurchasePrice ? `${item.lastPurchasePrice} ${item.currency}` : null} />
            <InfoRow label="Cena średnia" value={item.averagePrice ? `${item.averagePrice} ${item.currency}` : null} />
            <InfoRow label="Waluta" value={item.currency} />
            <InfoRow label="Data ostatniego zakupu" value={item.lastPurchaseDate ? formatDate(item.lastPurchaseDate) : null} />
          </div>
        </div>

        {/* Flagi i ustawienia */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚙️ Flagi i ustawienia
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px' }}>{item.isSerialized ? '✅' : '❌'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Numeracja seryjna</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px' }}>{item.isBatchTracked ? '✅' : '❌'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Śledzenie partii</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px' }}>{item.requiresIpAddress ? '✅' : '❌'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Wymaga adresu IP</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px' }}>{item.isActive ? '✅' : '❌'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Aktywny</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px' }}>{item.isHazardous ? '✅' : '❌'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Materiał niebezpieczny</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '20px' }}>{item.requiresCertification ? '✅' : '❌'}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Wymaga certyfikacji</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notatki */}
        {(item.notes || item.internalNotes) && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              color: 'var(--text-primary)', 
              fontSize: '16px', 
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📝 Notatki
            </h3>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              {item.notes && (
                <div style={{ marginBottom: item.internalNotes ? '16px' : '0' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Notatki:</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {item.notes}
                  </div>
                </div>
              )}
              {item.internalNotes && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Notatki wewnętrzne:</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {item.internalNotes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadane */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ℹ️ Metadane
          </h3>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <InfoRow label="Data utworzenia" value={formatDate(item.createdAt)} />
            <InfoRow label="Data aktualizacji" value={formatDate(item.updatedAt)} />
            <InfoRow label="Ostatnia kontrola stanu" value={item.lastStockCheckDate ? formatDate(item.lastStockCheckDate) : null} />
            <InfoRow label="Data ważności" value={item.expiryDate ? formatDate(item.expiryDate) : null} />
          </div>
        </div>

        {/* Historia operacji */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: 'var(--text-primary)', 
            fontSize: '16px', 
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📜 Historia operacji
          </h3>
          
          {loadingHistory ? (
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: '40px', 
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--text-secondary)' }}>Ładowanie historii...</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: '40px', 
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Brak historii operacji</div>
            </div>
          ) : (
            <div style={{ 
              background: 'var(--bg-secondary)', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {history.map((entry, idx) => (
                <div 
                  key={entry.id}
                  style={{
                    padding: '12px',
                    background: 'var(--bg-hover)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: idx < history.length - 1 ? '12px' : '0',
                    borderLeft: '3px solid var(--primary-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
                      {getOperationTypeLabel(entry.operationType)}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {formatDate(entry.performedAt)}
                    </div>
                  </div>
                  
                  {(entry.quantityChange !== null && entry.quantityChange !== undefined) && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                      Zmiana ilości: <span style={{ 
                        color: entry.quantityChange > 0 ? 'var(--success)' : 'var(--error)',
                        fontWeight: '600'
                      }}>
                        {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                      </span>
                      {entry.quantityBefore !== undefined && entry.quantityAfter !== undefined && (
                        <span style={{ color: 'var(--text-muted)' }}>
                          {' '}({entry.quantityBefore} → {entry.quantityAfter})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {entry.referenceType && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                      Referencja: {entry.referenceType} #{entry.referenceId}
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginTop: '8px' }}>
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Przycisk zamknięcia */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              fontSize: '14px'
            }}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
