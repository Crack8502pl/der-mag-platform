/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/CronSchedulerPanel.tsx
// Panel zarządzania harmonogramami CRON — zmiana interwałów bez restartu serwera

import React, { useState, useEffect, useCallback } from 'react';
import cronConfigService, { type CronJobConfig } from '../../services/cronConfig.service';

// ─── Preset intervals ──────────────────────────────────────────────────────────

const INTERVAL_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'co 30 min', value: '*/30 * * * *' },
  { label: 'co 1h', value: '0 * * * *' },
  { label: 'co 2h', value: '0 */2 * * *' },
  { label: 'co 3h', value: '0 */3 * * *' },
  { label: 'co 6h', value: '0 */6 * * *' },
  { label: 'co 12h', value: '0 */12 * * *' },
  { label: 'raz dziennie o 2:00', value: '0 2 * * *' },
  { label: 'raz dziennie o 3:00', value: '0 3 * * *' },
  { label: 'Własny…', value: '__custom__' },
];

function getPresetValue(cronExpression: string): string {
  const preset = INTERVAL_PRESETS.find(p => p.value === cronExpression);
  return preset ? preset.value : '__custom__';
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('pl-PL');
};

// ─── Row state per job ─────────────────────────────────────────────────────────

interface JobRowState {
  cronExpression: string;
  enabled: boolean;
  presetValue: string;
  customCron: string;
  dirty: boolean;
  saving: boolean;
  triggering: boolean;
  toastMessage: string;
  toastType: 'success' | 'error';
}

function makeRowState(job: CronJobConfig): JobRowState {
  const presetValue = getPresetValue(job.cronExpression);
  return {
    cronExpression: job.cronExpression,
    enabled: job.enabled,
    presetValue,
    customCron: presetValue === '__custom__' ? job.cronExpression : '',
    dirty: false,
    saving: false,
    triggering: false,
    toastMessage: '',
    toastType: 'success',
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const CronSchedulerPanel: React.FC = () => {
  const [jobs, setJobs] = useState<CronJobConfig[]>([]);
  const [rowStates, setRowStates] = useState<Record<string, JobRowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await cronConfigService.getAll();
      setJobs(data);
      const states: Record<string, JobRowState> = {};
      for (const job of data) {
        states[job.jobId] = makeRowState(job);
      }
      setRowStates(states);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || err?.message || 'Błąd ładowania harmonogramów');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateRow = (jobId: string, partial: Partial<JobRowState>) => {
    setRowStates(prev => ({
      ...prev,
      [jobId]: { ...prev[jobId], ...partial },
    }));
  };

  const handlePresetChange = (jobId: string, presetValue: string) => {
    const row = rowStates[jobId];
    if (!row) return;
    if (presetValue === '__custom__') {
      updateRow(jobId, { presetValue, dirty: true });
    } else {
      updateRow(jobId, { presetValue, cronExpression: presetValue, customCron: '', dirty: true });
    }
  };

  const handleCustomCronChange = (jobId: string, value: string) => {
    updateRow(jobId, { customCron: value, cronExpression: value, dirty: true });
  };

  const handleEnabledChange = (jobId: string, enabled: boolean) => {
    updateRow(jobId, { enabled, dirty: true });
  };

  const handleSave = async (jobId: string) => {
    const row = rowStates[jobId];
    if (!row) return;
    const cron = row.presetValue === '__custom__' ? row.customCron : row.cronExpression;
    updateRow(jobId, { saving: true, toastMessage: '' });
    try {
      const updated = await cronConfigService.update(jobId, cron, row.enabled);
      setJobs(prev => prev.map(j => j.jobId === jobId ? updated : j));
      updateRow(jobId, { saving: false, dirty: false, toastMessage: '✅ Zapisano', toastType: 'success' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Błąd zapisu';
      updateRow(jobId, { saving: false, toastMessage: `❌ ${msg}`, toastType: 'error' });
    }
    setTimeout(() => updateRow(jobId, { toastMessage: '' }), 4000);
  };

  const handleTrigger = async (jobId: string) => {
    updateRow(jobId, { triggering: true, toastMessage: '' });
    try {
      const res = await cronConfigService.triggerNow(jobId);
      updateRow(jobId, { triggering: false, toastMessage: `✅ ${res.message}`, toastType: 'success' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Błąd uruchomienia';
      updateRow(jobId, { triggering: false, toastMessage: `❌ ${msg}`, toastType: 'error' });
    }
    setTimeout(() => updateRow(jobId, { toastMessage: '' }), 4000);
  };

  if (loading) {
    return <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>⏳ Ładowanie harmonogramów…</div></div>;
  }

  if (loadError) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-error">{loadError}</div>
          <button className="btn btn-secondary btn-sm" onClick={loadJobs}>🔄 Spróbuj ponownie</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">⏰ Harmonogramy CRON</h2>
      </div>
      <div className="card-body">
        {/* Runtime-only warning */}
        <div className="alert" style={{ marginBottom: '1rem', background: 'var(--warning-bg, #fff3cd)', color: 'var(--warning-color, #856404)', border: '1px solid var(--warning-border, #ffc107)', borderRadius: 6, padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
          ⚠️ <strong>Zmiany są runtime-only</strong> — resetują się po restarcie serwera. Aby utrwalić, zaktualizuj zmienne środowiskowe w pliku <code>.env</code>.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Job</th>
                <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Interwał</th>
                <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Własny CRON</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Aktywny</th>
                <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Ostatnie uruchomienie</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const row = rowStates[job.jobId];
                if (!row) return null;
                return (
                  <tr key={job.jobId}>
                    {/* Job label */}
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {job.label}
                      <br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {job.jobId}
                      </span>
                    </td>

                    {/* Interval dropdown */}
                    <td>
                      <select
                        className="form-select"
                        style={{ minWidth: 160 }}
                        value={row.presetValue}
                        onChange={e => handlePresetChange(job.jobId, e.target.value)}
                      >
                        {INTERVAL_PRESETS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Custom CRON input */}
                    <td>
                      {row.presetValue === '__custom__' ? (
                        <input
                          className="form-input"
                          type="text"
                          placeholder="np. */15 * * * *"
                          style={{ minWidth: 140, fontFamily: 'monospace' }}
                          value={row.customCron}
                          onChange={e => handleCustomCronChange(job.jobId, e.target.value)}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          {row.cronExpression}
                        </span>
                      )}
                    </td>

                    {/* Enabled toggle */}
                    <td style={{ textAlign: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={e => handleEnabledChange(job.jobId, e.target.checked)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: row.enabled ? 'var(--success-color, #28a745)' : 'var(--text-muted)' }}>
                          {row.enabled ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    </td>

                    {/* Last run timestamp */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatDate(job.lastRun)}
                    </td>

                    {/* Running badge */}
                    <td style={{ textAlign: 'center' }}>
                      {job.isRunning ? (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', background: '#fff3cd', color: '#856404', fontWeight: 600 }}>
                          ⏳ Trwa…
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', background: 'var(--badge-idle-bg, #e9ecef)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          idle
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={row.triggering || job.isRunning}
                          onClick={() => handleTrigger(job.jobId)}
                          title="Uruchom teraz poza harmonogramem"
                        >
                          {row.triggering ? '⏳' : '▶'} Uruchom teraz
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={!row.dirty || row.saving}
                          onClick={() => handleSave(job.jobId)}
                          title="Zapisz zmiany harmonogramu"
                        >
                          {row.saving ? '⏳' : '💾'} Zapisz
                        </button>
                      </div>
                      {/* Inline toast */}
                      {row.toastMessage && (
                        <div style={{
                          marginTop: 4,
                          fontSize: '0.78rem',
                          color: row.toastType === 'success' ? 'var(--success-color, #28a745)' : 'var(--danger-color, #dc3545)',
                          fontWeight: 500,
                        }}>
                          {row.toastMessage}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadJobs}>
            🔄 Odśwież
          </button>
        </div>
      </div>
    </div>
  );
};

export default CronSchedulerPanel;
