import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { deviceService, type CreateDeviceDto, type DeviceDto } from '../../services/deviceService';
import { DeviceFormModal } from '../devices/DeviceFormModal';
import './ModulePage.css';

const PAGE_SIZE = 10;

const statusLabel: Record<string, string> = {
  active: 'Aktywne',
  maintenance: 'Serwis',
  inactive: 'Nieaktywne',
  decommissioned: 'Wycofane',
};

export const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<DeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceDto | null>(null);

  const typeOptions = useMemo(() => Array.from(new Set(devices.map(d => d.deviceType).filter(Boolean))), [devices]);

  const loadDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await deviceService.getDevices({ search, status, deviceType, page, limit: PAGE_SIZE });
      setDevices(response.data);
      setTotalPages(response.pagination.totalPages || 1);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać urządzeń';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [page, search, status, deviceType]);

  const saveDevice = async (data: CreateDeviceDto) => {
    if (editingDevice) {
      await deviceService.updateDevice(editingDevice.id, data);
    } else {
      await deviceService.createDevice(data);
    }
    await loadDevices();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Czy na pewno usunąć urządzenie?')) return;
    await deviceService.deleteDevice(id);
    await loadDevices();
  };

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="devices" emoji={MODULE_ICONS.devices} size={36} />
        </div>
        <div>
          <h1>Urządzenia</h1>
          <p className="page-subtitle">Rejestr i zarządzanie urządzeniami</p>
        </div>
      </div>

      <div className="card module-content">
        <div className="module-toolbar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            placeholder="Szukaj urządzenia..."
            value={search}
            onChange={e => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            value={status}
            onChange={e => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Status: wszystkie</option>
            <option value="active">Aktywne</option>
            <option value="maintenance">Serwis</option>
            <option value="inactive">Nieaktywne</option>
            <option value="decommissioned">Wycofane</option>
          </select>
          <select
            value={deviceType}
            onChange={e => {
              setPage(1);
              setDeviceType(e.target.value);
            }}
          >
            <option value="">Typ: wszystkie</option>
            {typeOptions.map(option => (
              <option key={option} value={option || ''}>{option}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setEditingDevice(null);
              setShowModal(true);
            }}
          >
            Dodaj urządzenie
          </button>
        </div>

        {error && <p className="status-text" style={{ color: 'var(--danger)' }}>❌ {error}</p>}
        {loading ? (
          <p>Ładowanie urządzeń...</p>
        ) : (
          <table className="module-table" aria-label="Tabela urządzeń">
            <thead>
              <tr>
                <th>Numer seryjny</th>
                <th>Nazwa</th>
                <th>Model</th>
                <th>Producent</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Lokalizacja</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={8}>Brak urządzeń</td>
                </tr>
              ) : (
                devices.map(device => (
                  <tr key={device.id}>
                    <td>{device.serialNumber}</td>
                    <td>{device.name}</td>
                    <td>{device.model || '-'}</td>
                    <td>{device.manufacturer || '-'}</td>
                    <td>{device.deviceType || '-'}</td>
                    <td>
                      <span className={`status-badge status-${device.status}`}>{statusLabel[device.status] || device.status}</span>
                    </td>
                    <td>{device.location || '-'}</td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link to={`/devices/${device.id}`}>Szczegóły</Link>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditingDevice(device);
                          setShowModal(true);
                        }}
                      >
                        Edytuj
                      </button>
                      <button className="btn btn-ghost" onClick={() => handleDelete(device.id)}>Usuń</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Poprzednia
          </button>
          <span>Strona {page} / {totalPages}</span>
          <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Następna
          </button>
        </div>
      </div>

      <DeviceFormModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={saveDevice} initialDevice={editingDevice} />
    </div>
  );
};
