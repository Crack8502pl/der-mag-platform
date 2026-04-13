// src/components/devices/DeviceDetailPage.tsx
// Device detail page - PR#17

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import deviceService from '../../services/device.service';
import type { DeviceDetails } from '../../services/device.service';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import './DeviceDetailPage.css';

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeviceDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const deviceId = Number(id);
      if (!Number.isInteger(deviceId) || deviceId <= 0) {
        setDevice(null);
        setError('Nieprawidłowy identyfikator urządzenia');
        setLoading(false);
        return;
      }
      const data = await deviceService.getDeviceById(deviceId);
      setDevice(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Błąd podczas pobierania szczegółów urządzenia');
      console.error('Error fetching device details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchDeviceDetails();
    }
  }, [id, fetchDeviceDetails]);

  const getInventoryStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'in_stock': 'W magazynie',
      'reserved': 'Zarezerwowane',
      'installed': 'Zainstalowane',
      'faulty': 'Uszkodzone',
      'returned': 'Zwrócone',
      'decommissioned': 'Wycofane'
    };
    return statusMap[status] || status;
  };

  const getInventoryStatusBadgeClass = (status: string): string => {
    const statusMap: Record<string, string> = {
      'in_stock': 'status-in-stock',
      'reserved': 'status-reserved',
      'installed': 'status-installed',
      'faulty': 'status-faulty',
      'returned': 'status-returned',
      'decommissioned': 'status-decommissioned'
    };
    return statusMap[status] || 'status-default';
  };

  const getAssetTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'PRZEJAZD': 'Przejazd',
      'LCS': 'LCS',
      'CUID': 'CUID',
      'NASTAWNIA': 'Nastawnia',
      'SKP': 'SKP'
    };
    return typeMap[type] || type;
  };

  const getAssetStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'planned': 'Planowany',
      'installed': 'Zainstalowany',
      'active': 'Aktywny',
      'in_service': 'W serwisie',
      'faulty': 'Uszkodzony',
      'inactive': 'Nieaktywny',
      'decommissioned': 'Wycofany'
    };
    return statusMap[status] || status;
  };

  const getAssetStatusBadgeClass = (status: string): string => {
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

  if (loading) {
    return (
      <div className="device-detail-page">
        <BackButton to="/devices" />
        <div className="loading-state">
          <p>⏳ Ładowanie szczegółów urządzenia...</p>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="device-detail-page">
        <BackButton to="/devices" />
        <div className="error-state">
          <p>❌ {error || 'Urządzenie nie znalezione'}</p>
          <button onClick={fetchDeviceDetails}>Spróbuj ponownie</button>
        </div>
      </div>
    );
  }

  return (
    <div className="device-detail-page">
      <BackButton to="/devices" />

      {/* Header */}
      <div className="device-header">
        <div className="header-left">
          <ModuleIcon name="devices" emoji={MODULE_ICONS.devices} size={48} />
          <div className="header-info">
            <div className="device-type">📦 Urządzenie</div>
            <h1>{device.deviceModel || device.deviceType}</h1>
            <div className="device-meta">
              <span className="device-serial">S/N: {device.serialNumber}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <span className={`status-badge ${getInventoryStatusBadgeClass(device.inventoryStatus || 'in_stock')}`}>
            {getInventoryStatusLabel(device.inventoryStatus || 'in_stock')}
          </span>
        </div>
      </div>

      {/* Technical Data Section */}
      <div className="detail-section">
        <h2>📋 Dane techniczne</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Typ urządzenia:</span>
            <span className="detail-value">{device.deviceType}</span>
          </div>
          {device.deviceModel && (
            <div className="detail-item">
              <span className="detail-label">Model:</span>
              <span className="detail-value">{device.deviceModel}</span>
            </div>
          )}
          {device.manufacturer && (
            <div className="detail-item">
              <span className="detail-label">Producent:</span>
              <span className="detail-value">{device.manufacturer}</span>
            </div>
          )}
          {device.catalogNumber && (
            <div className="detail-item">
              <span className="detail-label">Numer katalogowy:</span>
              <span className="detail-value">{device.catalogNumber}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Status magazynowy:</span>
            <span className="detail-value">
              <span className={`status-badge ${getInventoryStatusBadgeClass(device.inventoryStatus || 'in_stock')}`}>
                {getInventoryStatusLabel(device.inventoryStatus || 'in_stock')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Installed in Asset Section */}
      {device.installedAsset ? (
        <div className="detail-section">
          <h2>🏗️ Zainstalowane w obiekcie</h2>
          <div className="installed-asset-card">
            <div className="asset-card-header">
              <div className="asset-number-wrapper">
                <code className="asset-number">{device.installedAsset.assetNumber}</code>
                <span className={`status-badge ${getAssetStatusBadgeClass(device.installedAsset.status)}`}>
                  {getAssetStatusLabel(device.installedAsset.status)}
                </span>
              </div>
            </div>
            <h3 className="asset-name">{device.installedAsset.name}</h3>
            <div className="asset-details-grid">
              <div className="asset-detail-row">
                <span className="asset-detail-label">Typ obiektu:</span>
                <span className="asset-detail-value">
                  {getAssetTypeLabel(device.installedAsset.assetType)}
                  {device.installedAsset.category && ` ${device.installedAsset.category}`}
                </span>
              </div>
              {device.installedAsset.actualInstallationDate && (
                <div className="asset-detail-row">
                  <span className="asset-detail-label">Data instalacji:</span>
                  <span className="asset-detail-value">
                    {new Date(device.installedAsset.actualInstallationDate).toLocaleDateString('pl-PL')}
                  </span>
                </div>
              )}
              {(device.installedAsset.liniaKolejowa || device.installedAsset.miejscowosc) && (
                <div className="asset-detail-row">
                  <span className="asset-detail-label">Lokalizacja:</span>
                  <span className="asset-detail-value">
                    {device.installedAsset.liniaKolejowa && device.installedAsset.kilometraz
                      ? `${device.installedAsset.liniaKolejowa} km ${device.installedAsset.kilometraz}`
                      : device.installedAsset.liniaKolejowa || ''}
                    {device.installedAsset.miejscowosc && (
                      <> ({device.installedAsset.miejscowosc})</>
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="asset-actions">
              <button
                className="btn-primary"
                onClick={() => navigate(`/assets/${device.installedAsset?.id}`)}
              >
                👁️ Zobacz szczegóły obiektu
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="detail-section">
          <h2>🏗️ Status instalacji</h2>
          <div className="empty-state-asset">
            <div className="empty-icon">📦</div>
            <p className="empty-title">Urządzenie w magazynie</p>
            <p className="empty-subtitle">
              To urządzenie nie jest jeszcze zainstalowane w obiekcie.
              <br />
              Po instalacji tutaj pojawi się link do obiektu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
