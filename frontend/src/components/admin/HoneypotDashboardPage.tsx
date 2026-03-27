// src/components/admin/HoneypotDashboardPage.tsx
// Panel admina - monitorowanie honeypotów i wykrytych skanowań

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import honeypotService from '../../services/honeypot.service';
import type {
  HoneypotStats,
  SuspiciousIP,
  HoneypotLog,
  ThreatLevel,
} from '../../types/honeypot.types';

// ============================================================
// Stałe
// ============================================================
const THREAT_COLORS: Record<ThreatLevel, { bg: string; color: string; label: string }> = {
  LOW: { bg: '#d4edda', color: '#155724', label: 'Niski' },
  MEDIUM: { bg: '#fff3cd', color: '#856404', label: 'Średni' },
  HIGH: { bg: '#f8d7da', color: '#721c24', label: 'Wysoki' },
  CRITICAL: { bg: '#f5c6cb', color: '#491217', label: 'Krytyczny' },
};

const SCANNER_COLORS: string[] = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
];

// ============================================================
// Pomocnicze komponenty
// ============================================================
const ThreatBadge: React.FC<{ level: ThreatLevel }> = ({ level }) => {
  const style = THREAT_COLORS[level] || THREAT_COLORS.LOW;
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: '0.75rem',
      fontWeight: 600,
      background: style.bg,
      color: style.color,
    }}>
      {style.label}
    </span>
  );
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pl-PL');
};

// ============================================================
// Wykres kołowy - rozkład skanerów (SVG)
// ============================================================
const PieChart: React.FC<{ data: Record<string, number> }> = ({ data }) => {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  if (entries.length === 0) return <p style={{ color: '#999', textAlign: 'center' }}>Brak danych</p>;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  let cumAngle = 0;
  const cx = 80, cy = 80, r = 70;

  const slices = entries.map(([label, value], i) => {
    const angle = (value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(cumAngle);
    const y2 = cy - r * Math.cos(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const color = SCANNER_COLORS[i % SCANNER_COLORS.length];
    return { label, value, x1, y1, x2, y2, largeArc, color, percent: Math.round((value / total) * 100) };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {slices.map((s, i) => (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${s.x1} ${s.y1} A ${r} ${r} 0 ${s.largeArc} 1 ${s.x2} ${s.y2} Z`}
            fill={s.color}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.8rem' }}>
            <span style={{ width: 12, height: 12, background: s.color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>{s.label}</span>
            <span style={{ color: '#666' }}>({s.value} / {s.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Wykres słupkowy - rozkład godzinowy (SVG)
// ============================================================
const BarChart: React.FC<{ data: number[] }> = ({ data }) => {
  const maxVal = Math.max(...data, 1);
  const w = 460, h = 100, barW = Math.floor(w / 24) - 2;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const barH = (v / maxVal) * h;
        const x = i * (Math.floor(w / 24));
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#3498db" rx={2} />
            {i % 4 === 0 && (
              <text x={x + barW / 2} y={h + 14} textAnchor="middle" fontSize={9} fill="#666">
                {String(i).padStart(2, '0')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// Interwał auto-odświeżania (ms)
const AUTO_REFRESH_INTERVAL_MS = 30000;
export const HoneypotDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HoneypotStats | null>(null);
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([]);
  const [logs, setLogs] = useState<HoneypotLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtrowanie logów
  const [threatFilter, setThreatFilter] = useState<ThreatLevel | ''>('');
  const [logPage, setLogPage] = useState(1);
  const LOGS_PER_PAGE = 10;

  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================
  // Ładowanie danych
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, ipsData, logsData] = await Promise.all([
        honeypotService.getStats(30),
        honeypotService.getSuspiciousIPs(5),
        honeypotService.getLogs(200),
      ]);
      setStats(statsData);
      setSuspiciousIPs(ipsData);
      setLogs(logsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Błąd podczas pobierania danych honeypota');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh co 30 sekund
    autoRefreshRef.current = setInterval(loadData, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [loadData]);

  // ============================================================
  // Akcje
  // ============================================================
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      await honeypotService.exportLogs(format, 30);
      showNotification('success', `Eksport ${format.toUpperCase()} zakończony`);
    } catch {
      showNotification('error', 'Błąd podczas eksportu');
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Czy na pewno chcesz usunąć logi starsze niż 90 dni?')) return;
    try {
      const result = await honeypotService.cleanupLogs(90);
      showNotification('success', `Usunięto ${result.deleted} starych logów`);
      await loadData();
    } catch {
      showNotification('error', 'Błąd podczas czyszczenia logów');
    }
  };

  // ============================================================
  // Filtrowane logi z paginacją
  // ============================================================
  const filteredLogs = logs.filter(l => !threatFilter || l.threatLevel === threatFilter);
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const pagedLogs = filteredLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  // Znajdź najczęstszy skaner
  const topScanner = stats
    ? Object.entries(stats.scannerBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0] || '—'
    : '—';

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Nagłówek */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin')}
            style={{ background: 'none', border: '1px solid #ccc', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            ← Powrót
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>🍯 Honeypot Monitor</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{ padding: '8px 16px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            {loading ? '⏳' : '🔄'} Odśwież
          </button>
          <button
            onClick={() => handleExport('json')}
            style={{ padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            ⬇ JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            style={{ padding: '8px 16px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            ⬇ CSV
          </button>
          <button
            onClick={handleCleanup}
            style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            🗑 Wyczyść (90 dni)
          </button>
        </div>
      </div>

      {/* Powiadomienia */}
      {notification && (
        <div style={{
          padding: '10px 16px',
          marginBottom: 16,
          borderRadius: 4,
          background: notification.type === 'success' ? '#d4edda' : '#f8d7da',
          color: notification.type === 'success' ? '#155724' : '#721c24',
          fontWeight: 500,
        }}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.message}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 16px', marginBottom: 16, borderRadius: 4, background: '#f8d7da', color: '#721c24' }}>
          ❌ {error}
        </div>
      )}

      {/* Karty statystyk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Łączne trafienia', value: stats?.totalHits ?? '—', icon: '🎯' },
          { label: 'Unikalne IP', value: stats?.uniqueIPs ?? '—', icon: '🌐' },
          { label: 'Ostatnie 24h', value: stats?.last24h ?? '—', icon: '🕐' },
          { label: 'Najczęstszy skaner', value: topScanner, icon: '🔍' },
        ].map((card, i) => (
          <div key={i} style={{
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>{card.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2c3e50' }}>{card.value}</div>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Wykresy */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Wykres kołowy skanerów */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#2c3e50' }}>🔍 Rozkład skanerów</h3>
          {stats ? (
            <PieChart data={stats.scannerBreakdown} />
          ) : (
            <p style={{ color: '#999', textAlign: 'center' }}>Ładowanie...</p>
          )}
        </div>

        {/* Wykres słupkowy godzinowy */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#2c3e50' }}>📊 Rozkład godzinowy (ostatnie 24h)</h3>
          {stats ? (
            <BarChart data={stats.hourlyDistribution} />
          ) : (
            <p style={{ color: '#999', textAlign: 'center' }}>Ładowanie...</p>
          )}
        </div>
      </div>

      {/* Tabela podejrzanych IP */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#2c3e50' }}>
          🚨 Podejrzane IP ({suspiciousIPs.length})
        </h3>
        {suspiciousIPs.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', margin: 0 }}>Brak podejrzanych IP</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['IP', 'Trafienia', 'Skanery', 'Ostatnio widziany', 'Poziom zagrożenia'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #dee2e6' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suspiciousIPs.map((ip, i) => (
                  <tr key={ip.ip} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{ip.ip}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#e74c3c' }}>{ip.hitCount}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {ip.scanners.length > 0
                        ? ip.scanners.join(', ')
                        : <span style={{ color: '#999' }}>—</span>}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#666' }}>{formatDate(ip.lastSeen)}</td>
                    <td style={{ padding: '8px 12px' }}><ThreatBadge level={ip.threatLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela ostatnich logów */}
      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#2c3e50' }}>
            📋 Ostatnie logi ({filteredLogs.length})
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#666' }}>Filtr poziomu:</label>
            <select
              value={threatFilter}
              onChange={e => { setThreatFilter(e.target.value as ThreatLevel | ''); setLogPage(1); }}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: '0.85rem' }}
            >
              <option value="">Wszystkie</option>
              <option value="LOW">Niski</option>
              <option value="MEDIUM">Średni</option>
              <option value="HIGH">Wysoki</option>
              <option value="CRITICAL">Krytyczny</option>
            </select>
          </div>
        </div>

        {pagedLogs.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center' }}>Brak logów</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['ID', 'IP', 'Metoda', 'Ścieżka', 'Skaner', 'Poziom', 'Data'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#444', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((log, i) => (
                    <tr key={log.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                      <td style={{ padding: '6px 10px', color: '#999' }}>#{log.id}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{log.ip}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                          {log.method}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.8rem' }} title={log.path}>
                        {log.path}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {log.detectedScanner
                          ? <span style={{ background: '#fadbd8', color: '#c0392b', padding: '1px 6px', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600 }}>{log.detectedScanner}</span>
                          : <span style={{ color: '#999' }}>—</span>}
                      </td>
                      <td style={{ padding: '6px 10px' }}><ThreatBadge level={log.threatLevel} /></td>
                      <td style={{ padding: '6px 10px', color: '#666', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginacja */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setLogPage(p => Math.max(1, p - 1))}
                  disabled={logPage <= 1}
                  style={{ padding: '4px 12px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: logPage <= 1 ? '#f0f0f0' : '#fff' }}
                >
                  ‹
                </button>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  {logPage} / {totalPages}
                </span>
                <button
                  onClick={() => setLogPage(p => Math.min(totalPages, p + 1))}
                  disabled={logPage >= totalPages}
                  style={{ padding: '4px 12px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: logPage >= totalPages ? '#f0f0f0' : '#fff' }}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info o auto-refresh */}
      <p style={{ textAlign: 'center', color: '#999', fontSize: '0.8rem', marginTop: 16 }}>
        🔄 Auto-odświeżanie co 30 sekund
      </p>
    </div>
  );
};
