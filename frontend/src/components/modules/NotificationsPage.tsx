import React, { useEffect, useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { notificationService, type NotificationItem, type NotificationSettings } from '../../services/notificationService';
import './ModulePage.css';

type NotificationsTab = 'history' | 'settings';

const defaultSettings: NotificationSettings = {
  email: true,
  sms: false,
  modules: {
    contracts: true,
    tasks: true,
    devices: true,
    photos: true,
    documents: true,
    reports: false,
  },
};

export const NotificationsPage: React.FC = () => {
  const [tab, setTab] = useState<NotificationsTab>('history');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({
        page,
        limit: 10,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setNotifications(response.data);
      setTotalPages(response.pagination.totalPages || 1);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      setSettings(await notificationService.getSettings());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
    } else {
      loadSettings();
    }
  }, [tab, page, typeFilter, statusFilter]);

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="notifications" emoji={MODULE_ICONS.notifications} size={36} />
        </div>
        <div>
          <h1>Powiadomienia</h1>
          <p className="page-subtitle">Historia i ustawienia powiadomień</p>
        </div>
      </div>

      <div className="card module-content">
        <div className="module-tabs">
          <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Historia</button>
          <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Ustawienia</button>
        </div>

        {tab === 'history' && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <select value={typeFilter} onChange={e => { setPage(1); setTypeFilter(e.target.value); }}>
                <option value="">Wszystkie typy</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
              <select value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }}>
                <option value="">Wszystkie statusy</option>
                <option value="read">Przeczytane</option>
                <option value="unread">Nieprzeczytane</option>
              </select>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={async () => { await notificationService.markAllAsRead(); await loadHistory(); }}>
                Oznacz wszystkie jako przeczytane
              </button>
            </div>

            {loading ? <p>Ładowanie...</p> : (
              <table className="module-table" aria-label="Lista powiadomień">
                <thead><tr><th>Typ</th><th>Tytuł</th><th>Data</th><th>Status</th><th>Akcje</th></tr></thead>
                <tbody>
                  {notifications.map(notification => (
                    <tr key={notification.id}>
                      <td>{notification.type}</td>
                      <td>{notification.title}</td>
                      <td>{new Date(notification.createdAt).toLocaleString('pl-PL')}</td>
                      <td>{notification.isRead ? 'Przeczytane' : 'Nieprzeczytane'}</td>
                      <td>
                        {!notification.isRead && (
                          <button className="btn btn-ghost" onClick={async () => { await notificationService.markAsRead(notification.id); await loadHistory(); }}>
                            Oznacz jako przeczytane
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Poprzednia</button>
              <span>Strona {page} / {totalPages}</span>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Następna</button>
            </div>
          </>
        )}

        {tab === 'settings' && (
          <>
            {loading ? <p>Ładowanie...</p> : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label><input type="checkbox" checked={settings.email} onChange={e => setSettings(prev => ({ ...prev, email: e.target.checked }))} /> Email</label>
                <label><input type="checkbox" checked={settings.sms} onChange={e => setSettings(prev => ({ ...prev, sms: e.target.checked }))} /> SMS</label>
                {Object.entries(settings.modules).map(([module, enabled]) => (
                  <label key={module}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e => setSettings(prev => ({
                        ...prev,
                        modules: {
                          ...prev.modules,
                          [module]: e.target.checked,
                        },
                      }))}
                    />{' '}
                    {module}
                  </label>
                ))}
                <button className="btn btn-primary" onClick={async () => setSettings(await notificationService.updateSettings(settings))}>
                  Zapisz ustawienia
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
