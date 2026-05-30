/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/SessionsManagementPage.tsx
// Admin panel — monitoring active user sessions

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/admin.service';
import type { AdminSession, SessionStats } from '../../types/sessions.types';

// ============================================================
// Funkcje pomocnicze
// ============================================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Nieznane urządzenie';
  if (/Chrome/.test(ua) && /Windows/.test(ua)) return 'Chrome / Windows';
  if (/Chrome/.test(ua) && /Mac/.test(ua)) return 'Chrome / macOS';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua) && /Mac/.test(ua)) return 'Safari / macOS';
  if (/Mobile/.test(ua)) return 'Przeglądarka mobilna';
  return 'Przeglądarka';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}min temu`;
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// Komponent główny
// ============================================================

export const SessionsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState<AdminSession | null>(null);
  const [logoutInProgress, setLogoutInProgress] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessionsData, statsData] = await Promise.all([
        adminService.getSessions(),
        adminService.getSessionStats(),
      ]);
      setSessions(sessionsData);
      setStats(statsData);
      setError(null);
    } catch (err: any) {
      setError('Nie udało się pobrać danych sesji');
      console.error('Błąd pobierania sesji:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleForceLogout = async (session: AdminSession) => {
    setConfirmLogout(session);
  };

  const confirmForceLogout = async () => {
    if (!confirmLogout) return;
    setLogoutInProgress(confirmLogout.tokenId);
    setConfirmLogout(null);
    try {
      await adminService.forceLogout(confirmLogout.tokenId);
      setSuccessMessage(`Sesja użytkownika ${confirmLogout.firstName} ${confirmLogout.lastName} została zakończona`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError('Nie udało się zakończyć sesji');
    } finally {
      setLogoutInProgress(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Ładowanie sesji...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/admin')}>
          ← Panel admina
        </button>
        <div>
          <h1 style={styles.title}>👥 Aktywne sesje użytkowników</h1>
          <p style={styles.subtitle}>Monitorowanie zalogowanych użytkowników w czasie rzeczywistym</p>
        </div>
        <button style={styles.refreshButton} onClick={fetchData}>
          🔄 Odśwież
        </button>
      </div>

      {/* Alerty */}
      {error && <div style={styles.alertError}>{error}</div>}
      {successMessage && <div style={styles.alertSuccess}>{successMessage}</div>}

      {/* Statystyki */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🟢</div>
            <div>
              <div style={styles.statValue}>{stats.activeSessions}</div>
              <div style={styles.statLabel}>Aktywne sesje</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👤</div>
            <div>
              <div style={styles.statValue}>{stats.loggedTodayCount}</div>
              <div style={styles.statLabel}>Zalogowani dziś</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>
            <div>
              <div style={styles.statValue}>{stats.totalUsersCount}</div>
              <div style={styles.statLabel}>Wszyscy użytkownicy</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>⏱️</div>
            <div>
              <div style={styles.statValue}>{stats.avgSessionMinutes} min</div>
              <div style={styles.statLabel}>Śr. czas sesji</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela sesji */}
      <div style={styles.tableWrapper}>
        {sessions.length === 0 ? (
          <div style={styles.emptyState}>Brak aktywnych sesji</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Użytkownik</th>
                <th style={styles.th}>Rola</th>
                <th style={styles.th}>IP</th>
                <th style={styles.th}>Urządzenie</th>
                <th style={styles.th}>Zalogowany</th>
                <th style={styles.th}>Czas sesji</th>
                <th style={styles.th}>Łączny czas</th>
                <th style={styles.th}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.tokenId} style={session.isCurrentSession ? styles.currentSessionRow : styles.tableRow}>
                  <td style={styles.td}>
                    <span title="Aktywna sesja">🟢</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.userInfo}>
                      <span style={styles.userName}>
                        {session.firstName} {session.lastName}
                      </span>
                      <span style={styles.userLogin}>{session.username}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.roleBadge}>{session.role}</span>
                  </td>
                  <td style={styles.td}>
                    <code style={styles.ipCode}>{session.ipAddress || '—'}</code>
                  </td>
                  <td style={styles.td}>{parseUserAgent(session.userAgent)}</td>
                  <td style={styles.td}>{timeAgo(session.loginAt)}</td>
                  <td style={styles.td}>{formatDuration(session.currentSessionSeconds)}</td>
                  <td style={styles.td}>{formatDuration(session.totalSessionTimeSeconds)}</td>
                  <td style={styles.td}>
                    {session.isCurrentSession ? (
                      <span style={styles.currentSessionLabel}>Twoja sesja</span>
                    ) : (
                      <button
                        style={logoutInProgress === session.tokenId ? styles.btnLogoutDisabled : styles.btnLogout}
                        disabled={logoutInProgress === session.tokenId}
                        onClick={() => handleForceLogout(session)}
                        title="Wyloguj użytkownika"
                      >
                        {logoutInProgress === session.tokenId ? '...' : '🔌 Wyloguj'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={styles.autoRefreshNote}>Auto-odświeżanie co 30 sekund</p>

      {/* Dialog potwierdzenia */}
      {confirmLogout && (
        <div style={styles.modalOverlay} onClick={() => setConfirmLogout(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Potwierdź wylogowanie</h3>
            <p style={styles.modalText}>
              Czy na pewno chcesz wylogować użytkownika{' '}
              <strong>{confirmLogout.firstName} {confirmLogout.lastName}</strong>?
              <br />
              Ta akcja natychmiast zakończy jego sesję.
            </p>
            <div style={styles.modalActions}>
              <button style={styles.btnCancel} onClick={() => setConfirmLogout(null)}>
                Anuluj
              </button>
              <button style={styles.btnConfirmLogout} onClick={confirmForceLogout}>
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Style (CSS-in-JS z użyciem zmiennych CSS)
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    color: 'var(--text-primary)',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  backButton: {
    background: 'none',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  title: {
    margin: '0 0 4px',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
  },
  refreshButton: {
    background: 'var(--accent-color, #3b82f6)',
    border: 'none',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  alertError: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    padding: '10px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  alertSuccess: {
    background: '#f0fdf4',
    border: '1px solid #86efac',
    color: '#15803d',
    padding: '10px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '0.9rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statIcon: {
    fontSize: '1.8rem',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  tableWrapper: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    overflow: 'auto',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  tableHeaderRow: {
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
  },
  tableRow: {
    borderBottom: '1px solid var(--border-color)',
  },
  currentSessionRow: {
    borderBottom: '1px solid var(--border-color)',
    background: 'rgba(59, 130, 246, 0.05)',
  },
  th: {
    padding: '12px 14px',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '12px 14px',
    color: 'var(--text-primary)',
    verticalAlign: 'middle' as const,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  userName: {
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  userLogin: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  roleBadge: {
    background: 'var(--accent-color, #3b82f6)',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize' as const,
  },
  ipCode: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    background: 'var(--bg-primary)',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid var(--border-color)',
  },
  btnLogout: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '5px 12px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  btnLogoutDisabled: {
    background: '#9ca3af',
    color: '#fff',
    border: 'none',
    padding: '5px 12px',
    borderRadius: '5px',
    cursor: 'not-allowed',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  currentSessionLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  autoRefreshNote: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    marginTop: '12px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    margin: '0 0 12px',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  modalText: {
    margin: '0 0 20px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  btnCancel: {
    background: 'none',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '8px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  btnConfirmLogout: {
    background: '#ef4444',
    border: 'none',
    color: '#fff',
    padding: '8px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
};
