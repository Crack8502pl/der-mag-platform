import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { deviceService, type DeviceDto, type DeviceHistoryEvent } from '../../services/deviceService';
import './DeviceDetailPage.css';

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<DeviceDto | null>(null);
  const [history, setHistory] = useState<DeviceHistoryEvent[]>([]);
  const [configurationText, setConfigurationText] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDevice = async () => {
    if (!id) return;
    const deviceId = Number(id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      setError('Nieprawidłowy identyfikator urządzenia');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [deviceResponse, historyResponse] = await Promise.all([
        deviceService.getDevice(deviceId),
        deviceService.getDeviceHistory(deviceId),
      ]);
      setDevice(deviceResponse);
      setHistory(historyResponse);
      setConfigurationText(JSON.stringify(deviceResponse.configuration || {}, null, 2));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać urządzenia';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevice();
  }, [id]);

  const handleDelete = async () => {
    if (!device) return;
    if (!window.confirm('Czy na pewno usunąć urządzenie?')) return;
    await deviceService.deleteDevice(device.id);
    navigate('/devices');
  };

  const handleEdit = async () => {
    if (!device) return;
    const nextName = window.prompt('Nazwa urządzenia', device.name);
    if (!nextName) return;
    const nextStatus = window.prompt('Status (active|maintenance|inactive|decommissioned)', device.status);
    if (!nextStatus) return;

    await deviceService.updateDevice(device.id, { name: nextName, status: nextStatus });
    await loadDevice();
  };

  const handleSaveConfiguration = async () => {
    if (!device) return;
    try {
      const parsed = JSON.parse(configurationText) as Record<string, unknown>;
      await deviceService.updateDevice(device.id, { configuration: parsed });
      await loadDevice();
    } catch {
      setError('Konfiguracja musi być poprawnym JSON');
    }
  };

  if (loading) {
    return (
      <div className="device-detail-page">
        <BackButton to="/devices" />
        <p>Ładowanie urządzenia...</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="device-detail-page">
        <BackButton to="/devices" />
        <p className="status-text" style={{ color: 'var(--danger)' }}>❌ {error || 'Nie znaleziono urządzenia'}</p>
      </div>
    );
  }

  return (
    <div className="device-detail-page module-page">
      <BackButton to="/devices" />
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="devices" emoji={MODULE_ICONS.devices} size={36} />
        </div>
        <div>
          <h1>{device.name}</h1>
          <p className="page-subtitle">Numer seryjny: {device.serialNumber}</p>
        </div>
      </div>

      <div className="card module-content" style={{ marginBottom: '1rem' }}>
        <h3>Dane ogólne</h3>
        <div className="detail-grid" style={{ display: 'grid', gap: '0.35rem' }}>
          <p><strong>Model:</strong> {device.model || '-'}</p>
          <p><strong>Producent:</strong> {device.manufacturer || '-'}</p>
          <p><strong>Typ:</strong> {device.deviceType || '-'}</p>
          <p><strong>Status:</strong> <span className={`status-badge status-${device.status}`}>{device.status}</span></p>
          <p><strong>Lokalizacja:</strong> {device.location || '-'}</p>
          <p><strong>Notatki:</strong> {device.notes || '-'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={handleEdit}>Edytuj</button>
          <button className="btn btn-ghost" onClick={handleDelete}>Usuń</button>
        </div>
      </div>

      <div className="card module-content" style={{ marginBottom: '1rem' }}>
        <h3>Konfiguracja (JSON)</h3>
        <textarea value={configurationText} onChange={e => setConfigurationText(e.target.value)} rows={10} style={{ width: '100%' }} />
        <div style={{ marginTop: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handleSaveConfiguration}>Zapisz konfigurację</button>
        </div>
      </div>

      <div className="card module-content">
        <h3>Historia serwisowa</h3>
        {history.length === 0 ? <p>Brak historii zdarzeń.</p> : (
          <ul>
            {history.map(event => (
              <li key={event.id}>
                <strong>{new Date(event.timestamp).toLocaleString('pl-PL')}</strong> — {event.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
