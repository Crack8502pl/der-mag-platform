// src/components/assets/AssetDetailPage.tsx
// Asset detail page - PR#10

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import assetService from '../../services/asset.service';
import type { Asset } from '../../services/asset.service';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './AssetDetailPage.css';

interface AssetDetails extends Asset {
  contract?: { id: number; contractNumber: string; name: string };
  subsystem?: { id: number; name: string; subsystemType: string };
  devices?: Array<{
    id: number;
    serialNumber: string;
    materialName: string;
    catalogNumber?: string;
    status: string;
  }>;
  tasks?: Array<{
    id: number;
    taskNumber: string;
    name: string;
    status: string;
    taskRole: string;
    scheduledStartDate?: string;
    actualStartDate?: string;
    actualCompletionDate?: string;
  }>;
  statusHistory?: Array<{
    id: number;
    oldStatus: string;
    newStatus: string;
    reason?: string;
    changedAt: string;
    changedBy: { firstName: string; lastName: string };
  }>;
}

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const fetchAssetDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await assetService.getAssetDetails(Number(id));
      setAsset(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd podczas pobierania szczegółów obiektu');
      console.error('Error fetching asset details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAssetDetails();
    }
  }, [id, fetchAssetDetails]);

  const getStatusBadgeClass = (status: string): string => {
    const statusMap: Record<string, string> = {
      'planned': 'status-planned',
      'installed': 'status-installed',
      'active': 'status-active',
      'in_service': 'status-in-service',
      'faulty': 'status-faulty',
      'inactive': 'status-inactive',
      'decommissioned': 'status-decommissioned'
    };
    return statusMap[status] || 'status-default';
  };

  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      'planned': '📅 Planowany',
      'installed': '📦 Zainstalowany',
      'active': '✅ Aktywny',
      'in_service': '🔧 W serwisie',
      'faulty': '⚠️ Uszkodzony',
      'inactive': '⏸️ Nieaktywny',
      'decommissioned': '🚫 Zlikwidowany'
    };
    return statusLabels[status] || status;
  };

  const getAssetTypeLabel = (type: string): string => {
    const typeLabels: Record<string, string> = {
      'PRZEJAZD': '🚦 Przejazd',
      'SKP': '🎛️ SKP',
      'NASTAWNIA': '🏢 Nastawnia',
      'LCS': '📡 LCS',
      'CUID': '💻 CUID'
    };
    return typeLabels[type] || type;
  };

  const getTaskRoleLabel = (role: string): string => {
    const roleLabels: Record<string, string> = {
      'installation': '🔨 Instalacja',
      'warranty_service': '🛡️ Serwis gwarancyjny',
      'repair': '🔧 Naprawa',
      'maintenance': '⚙️ Konserwacja',
      'decommission': '🗑️ Demontaż'
    };
    return roleLabels[role] || role;
  };

  const getTaskStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      'created': '📝 Utworzone',
      'in_progress': '🔄 W realizacji',
      'completed': '✅ Zakończone',
      'cancelled': '❌ Anulowane'
    };
    return statusLabels[status] || status;
  };

  const calculateWarrantyDaysLeft = (expiryDate: string): number => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const openGoogleMaps = () => {
    if (asset?.gpsLatitude && asset?.gpsLongitude) {
      const url = `https://www.google.com/maps?q=${asset.gpsLatitude},${asset.gpsLongitude}`;
      window.open(url, '_blank');
    }
  };

  const handleCreateServiceTask = () => {
    // Navigate to create service task (will be implemented in PR#11)
    alert('Funkcja tworzenia zadania serwisowego będzie dostępna w PR#11');
  };

  if (loading) {
    return (
      <div className="asset-detail-page">
        <BackButton to="/assets" />
        <div className="loading-state">
          <p>⏳ Ładowanie szczegółów obiektu...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="asset-detail-page">
        <BackButton to="/assets" />
        <div className="error-state">
          <p>❌ {error || 'Obiekt nie znaleziony'}</p>
          <button onClick={fetchAssetDetails}>Spróbuj ponownie</button>
        </div>
      </div>
    );
  }

  const displayedHistory = showFullHistory
    ? asset.statusHistory
    : asset.statusHistory?.slice(0, 3);

  const warrantyDaysLeft = asset.warrantyExpiryDate
    ? calculateWarrantyDaysLeft(asset.warrantyExpiryDate)
    : null;

  return (
    <div className="asset-detail-page">
      <BackButton to="/assets" />

      {/* Header */}
      <div className="asset-header">
        <div className="header-left">
          <ModuleIcon name="assets" emoji={MODULE_ICONS.assets} size={48} />
          <div className="header-info">
            <div className="asset-type">{getAssetTypeLabel(asset.assetType)}</div>
            <h1>{asset.name}</h1>
            <div className="asset-meta">
              <span className="asset-number">#{asset.assetNumber}</span>
              {asset.category && <span className="asset-category">{asset.category}</span>}
            </div>
          </div>
        </div>
        <div className="header-right">
          <span className={`status-badge ${getStatusBadgeClass(asset.status)}`}>
            {getStatusLabel(asset.status)}
          </span>
        </div>
      </div>

      {/* Location Section */}
      <div className="detail-section">
        <h2>📍 Lokalizacja</h2>
        <div className="detail-grid">
          {asset.liniaKolejowa && (
            <div className="detail-item">
              <span className="detail-label">Linia kolejowa:</span>
              <span className="detail-value">{asset.liniaKolejowa}</span>
            </div>
          )}
          {asset.kilometraz && (
            <div className="detail-item">
              <span className="detail-label">Kilometraż:</span>
              <span className="detail-value">{asset.kilometraz}</span>
            </div>
          )}
          {asset.miejscowosc && (
            <div className="detail-item">
              <span className="detail-label">Miejscowość:</span>
              <span className="detail-value">{asset.miejscowosc}</span>
            </div>
          )}
          {asset.gpsLatitude && asset.gpsLongitude && (
            <div className="detail-item">
              <span className="detail-label">GPS:</span>
              <span className="detail-value">
                {asset.gpsLatitude.toFixed(6)}, {asset.gpsLongitude.toFixed(6)}
                <button className="btn-link" onClick={openGoogleMaps}>
                  📍 Pokaż na mapie
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Technical Data Section */}
      <div className="detail-section">
        <h2>📋 Dane techniczne</h2>
        <div className="detail-grid">
          {asset.contract && (
            <div className="detail-item">
              <span className="detail-label">Kontrakt:</span>
              <span className="detail-value">
                <button
                  className="btn-link"
                  onClick={() => navigate(`/contracts/${asset.contract?.id}`)}
                >
                  {asset.contract.contractNumber} - {asset.contract.name}
                </button>
              </span>
            </div>
          )}
          {asset.subsystem && (
            <div className="detail-item">
              <span className="detail-label">Podsystem:</span>
              <span className="detail-value">
                {asset.subsystem.subsystemType} - {asset.subsystem.name}
              </span>
            </div>
          )}
          {asset.actualInstallationDate && (
            <div className="detail-item">
              <span className="detail-label">Data instalacji:</span>
              <span className="detail-value">
                {new Date(asset.actualInstallationDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
          {asset.warrantyExpiryDate && (
            <div className="detail-item">
              <span className="detail-label">Gwarancja do:</span>
              <span className="detail-value">
                {new Date(asset.warrantyExpiryDate).toLocaleDateString('pl-PL')}
                {warrantyDaysLeft !== null && (
                  <span className={warrantyDaysLeft < 30 ? 'warranty-warning' : 'warranty-ok'}>
                    {' '}({warrantyDaysLeft > 0 ? `⏰ ${warrantyDaysLeft} dni` : '⚠️ Wygasła'})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Service Section */}
      {asset.lastServiceDate && (
        <div className="detail-section">
          <h2>🔧 Serwis</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Ostatni serwis:</span>
              <span className="detail-value">
                {new Date(asset.lastServiceDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
          </div>
          <button className="btn-primary" onClick={handleCreateServiceTask}>
            📅 Zaplanuj serwis
          </button>
        </div>
      )}

      {/* BOM Section */}
      {asset.devices && asset.devices.length > 0 && (
        <div className="detail-section">
          <h2>🛠️ Zainstalowane urządzenia ({asset.devices.length})</h2>
          <div className="devices-list">
            {asset.devices.map(device => (
              <div key={device.id} className="device-item">
                <div className="device-info">
                  <div className="device-name">{device.materialName}</div>
                  {device.catalogNumber && (
                    <div className="device-catalog">📦 {device.catalogNumber}</div>
                  )}
                  <div className="device-serial">S/N: {device.serialNumber}</div>
                </div>
                <button
                  className="btn-link"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  🔗 Zobacz urządzenie
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks History Section */}
      {asset.tasks && asset.tasks.length > 0 && (
        <div className="detail-section">
          <h2>📝 Historia zadań ({asset.tasks.length})</h2>
          <div className="tasks-list">
            {asset.tasks.map(task => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <div className="task-number">{task.taskNumber}</div>
                  <div className="task-status">{getTaskStatusLabel(task.status)}</div>
                </div>
                <div className="task-name">{task.name}</div>
                <div className="task-meta">
                  {getTaskRoleLabel(task.taskRole)}
                  {task.actualCompletionDate && (
                    <span> • 📅 {new Date(task.actualCompletionDate).toLocaleDateString('pl-PL')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleCreateServiceTask}>
            + Utwórz nowe zadanie dla obiektu
          </button>
        </div>
      )}

      {/* Status History Section */}
      {asset.statusHistory && asset.statusHistory.length > 0 && (
        <div className="detail-section">
          <h2>📊 Historia statusów</h2>
          <div className="status-history">
            {displayedHistory?.map(entry => (
              <div key={entry.id} className="history-entry">
                <div className="history-date">
                  {new Date(entry.changedAt).toLocaleString('pl-PL')}
                </div>
                <div className="history-change">
                  <span className="old-status">{getStatusLabel(entry.oldStatus)}</span>
                  <span className="arrow">→</span>
                  <span className="new-status">{getStatusLabel(entry.newStatus)}</span>
                </div>
                {entry.reason && <div className="history-reason">{entry.reason}</div>}
                <div className="history-user">
                  👤 {entry.changedBy.firstName} {entry.changedBy.lastName}
                </div>
              </div>
            ))}
          </div>
          {asset.statusHistory.length > 3 && !showFullHistory && (
            <button
              className="btn-link"
              onClick={() => setShowFullHistory(true)}
            >
              Zobacz pełną historię ({asset.statusHistory.length} wpisów)
            </button>
          )}
          {showFullHistory && (
            <button
              className="btn-link"
              onClick={() => setShowFullHistory(false)}
            >
              Zwiń historię
            </button>
          )}
        </div>
      )}

      {/* Notes Section */}
      {asset.notes && (
        <div className="detail-section">
          <h2>📝 Notatki</h2>
          <div className="notes-content">{asset.notes}</div>
        </div>
      )}
    </div>
  );
};

