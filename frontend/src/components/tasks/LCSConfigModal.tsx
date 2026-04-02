// src/components/tasks/LCSConfigModal.tsx
// Modal for configuring LCS (Lokalne Centrum Sterowania) for SMOK-A and SMOK-B systems

import React, { useState, useEffect } from 'react';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';
import type {
  LCSConfigSmokA,
  LCSConfigSmokB,
  CUIDConfig,
} from '../../types/lcs.types';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/grover-theme.css';
import './LCSConfigModal.css';

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

type SystemType = 'SMOK_A' | 'SMOK_B';

const defaultSmokAConfig = (): LCSConfigSmokA => ({
  obserwowanePrzejazdy: [],
  iloscStanowisk: 1,
  stanowiska: [],
  iloscMonitorow: 1,
  monitory: [],
  funkcjonalnosci: {
    obserwacja: true,
    lacznoscAudio: false,
    zapisObrazu: false,
    zapisAudio: false,
    obslugaLPR: false,
  },
  hasCUID: false,
});

const defaultSmokBConfig = (): LCSConfigSmokB => ({
  obserwowanePrzejazdy: [],
  serwerObrazu: {
    ip: '',
    maxKamer: 4,
    protokol: 'RTSP',
  },
  stacjeOperatorskie: [],
  hasCUID: false,
});

export const LCSConfigModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('tasks', 'update');

  const systemType: SystemType =
    task.metadata?.subsystemType === 'SMOKIP_B' ? 'SMOK_B' : 'SMOK_A';

  const [configA, setConfigA] = useState<LCSConfigSmokA>(defaultSmokAConfig());
  const [configB, setConfigB] = useState<LCSConfigSmokB>(defaultSmokBConfig());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = task.metadata?.configParams?.lcsConfig;
    if (saved) {
      if (systemType === 'SMOK_A') {
        setConfigA({ ...defaultSmokAConfig(), ...saved });
      } else {
        setConfigB({ ...defaultSmokBConfig(), ...saved });
      }
    }
  }, [task.metadata, systemType]);

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError('');
      const lcsConfig = systemType === 'SMOK_A' ? configA : configB;
      await taskService.update(task.taskNumber, {
        metadata: {
          ...task.metadata,
          configParams: {
            ...(task.metadata?.configParams || {}),
            lcsConfig,
          },
        },
        status: 'configured',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zapisywania konfiguracji LCS');
    } finally {
      setSaving(false);
    }
  };

  const updateConfigA = (patch: Partial<LCSConfigSmokA>) => {
    setConfigA(prev => ({ ...prev, ...patch }));
  };

  const updateFunkcjonalnosciA = (key: keyof LCSConfigSmokA['funkcjonalnosci'], val: boolean) => {
    setConfigA(prev => ({
      ...prev,
      funkcjonalnosci: { ...prev.funkcjonalnosci, [key]: val },
    }));
  };

  const updateConfigB = (patch: Partial<LCSConfigSmokB>) => {
    setConfigB(prev => ({ ...prev, ...patch }));
  };

  const togglePrzejazdA = (id: number) => {
    setConfigA(prev => ({
      ...prev,
      obserwowanePrzejazdy: prev.obserwowanePrzejazdy.includes(id)
        ? prev.obserwowanePrzejazdy.filter(x => x !== id)
        : [...prev.obserwowanePrzejazdy, id],
    }));
  };

  const togglePrzejazdB = (id: number) => {
    setConfigB(prev => ({
      ...prev,
      obserwowanePrzejazdy: prev.obserwowanePrzejazdy.includes(id)
        ? prev.obserwowanePrzejazdy.filter(x => x !== id)
        : [...prev.obserwowanePrzejazdy, id],
    }));
  };

  const badgeClass = systemType === 'SMOK_A' ? 'lcs-badge lcs-badge-smok-a' : 'lcs-badge lcs-badge-smok-b';
  const badgeLabel = systemType === 'SMOK_A' ? 'SMOK-A' : 'SMOK-B';

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '760px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>
            🏢 Konfiguracja LCS{' '}
            <span className={badgeClass}>{badgeLabel}</span>
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          {!canEdit && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              🔒 Tryb podglądu – brak uprawnień do edycji
            </div>
          )}

          {systemType === 'SMOK_A' ? (
            <SmokAForm
              config={configA}
              readOnly={!canEdit}
              onUpdateConfig={updateConfigA}
              onToggleFunkcjonalnosc={updateFunkcjonalnosciA}
              onTogglePrzejazd={togglePrzejazdA}
            />
          ) : (
            <SmokBForm
              config={configB}
              readOnly={!canEdit}
              onUpdateConfig={updateConfigB}
              onTogglePrzejazd={togglePrzejazdB}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Zamknij
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisywanie...' : '💾 Zapisz konfigurację'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SMOK-A form                                                          */
/* ------------------------------------------------------------------ */

interface SmokAFormProps {
  config: LCSConfigSmokA;
  readOnly: boolean;
  onUpdateConfig: (patch: Partial<LCSConfigSmokA>) => void;
  onToggleFunkcjonalnosc: (key: keyof LCSConfigSmokA['funkcjonalnosci'], val: boolean) => void;
  onTogglePrzejazd: (id: number) => void;
}

const SmokAForm: React.FC<SmokAFormProps> = ({
  config,
  readOnly,
  onUpdateConfig,
  onToggleFunkcjonalnosc,
  onTogglePrzejazd,
}) => {
  const [newPrzejazdId, setNewPrzejazdId] = React.useState('');

  const handleAddPrzejazd = () => {
    const id = parseInt(newPrzejazdId, 10);
    if (!isNaN(id) && id > 0 && !config.obserwowanePrzejazdy.includes(id)) {
      onTogglePrzejazd(id);
      setNewPrzejazdId('');
    }
  };

  return (
    <>
      {/* Obserwowane przejazdy */}
      <div className="lcs-config-section">
        <h4>🚦 Obserwowane przejazdy</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {config.obserwowanePrzejazdy.length === 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Brak przypisanych przejazdów
            </span>
          )}
          {config.obserwowanePrzejazdy.map(id => (
            <span
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(255,107,53,0.15)',
                border: '1px solid rgba(255,107,53,0.4)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            >
              🚦 ID {id}
              {!readOnly && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 2px', lineHeight: 1 }}
                  onClick={() => onTogglePrzejazd(id)}
                  title="Usuń przejazd"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              value={newPrzejazdId}
              onChange={(e) => setNewPrzejazdId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPrzejazd())}
              placeholder="ID przejazdu"
              style={{ width: '130px' }}
            />
            <button type="button" className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={handleAddPrzejazd}>
              ➕ Dodaj
            </button>
          </div>
        )}
        <small className="form-help" style={{ marginTop: '6px', display: 'block' }}>
          Wpisz ID zadania przejazdu i kliknij „Dodaj"
        </small>
      </div>

      {/* Stanowiska i monitory */}
      <div className="lcs-config-section">
        <h4>📺 Stanowiska i monitory</h4>
        <div className="lcs-grid-2">
          <div className="form-group">
            <label>Ilość stanowisk operatorskich</label>
            <input
              type="number"
              min={1}
              value={config.iloscStanowisk}
              disabled={readOnly}
              onChange={(e) => onUpdateConfig({ iloscStanowisk: Number(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Ilość monitorów</label>
            <input
              type="number"
              min={1}
              value={config.iloscMonitorow}
              disabled={readOnly}
              onChange={(e) => onUpdateConfig({ iloscMonitorow: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Funkcjonalności */}
      <div className="lcs-config-section">
        <h4>⚙️ Funkcjonalności</h4>
        <div className="lcs-checkbox-group">
          {(
            [
              ['obserwacja', '👁️ Obserwacja przejazdów'],
              ['lacznoscAudio', '🎙️ Łączność audio'],
              ['zapisObrazu', '🎥 Zapis obrazu'],
              ['zapisAudio', '🔊 Zapis audio'],
              ['obslugaLPR', '🚘 Obsługa LPR (serwer tablic rejestracyjnych)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="lcs-checkbox-item">
              <input
                type="checkbox"
                checked={config.funkcjonalnosci[key]}
                disabled={readOnly}
                onChange={(e) => onToggleFunkcjonalnosc(key, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* LPR server config */}
        {config.funkcjonalnosci.obslugaLPR && (
          <div className="lcs-sub-section">
            <h5>🖥️ Serwer LPR</h5>
            <div className="lcs-grid-2">
              <div className="form-group">
                <label>Adres IP</label>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  value={config.serwerLPR?.ip || ''}
                  disabled={readOnly}
                  onChange={(e) =>
                    onUpdateConfig({
                      serwerLPR: {
                        ip: e.target.value,
                        port: config.serwerLPR?.port ?? 8080,
                        maxTablicNaMinute: config.serwerLPR?.maxTablicNaMinute ?? 60,
                      },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Port</label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={config.serwerLPR?.port ?? 8080}
                  disabled={readOnly}
                  onChange={(e) =>
                    onUpdateConfig({
                      serwerLPR: {
                        ip: config.serwerLPR?.ip ?? '',
                        port: Number(e.target.value),
                        maxTablicNaMinute: config.serwerLPR?.maxTablicNaMinute ?? 60,
                      },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Max tablic/minutę</label>
                <input
                  type="number"
                  min={1}
                  value={config.serwerLPR?.maxTablicNaMinute ?? 60}
                  disabled={readOnly}
                  onChange={(e) =>
                    onUpdateConfig({
                      serwerLPR: {
                        ip: config.serwerLPR?.ip ?? '',
                        port: config.serwerLPR?.port ?? 8080,
                        maxTablicNaMinute: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CUID */}
      <div className="lcs-config-section">
        <h4>💿 CUID – stanowisko zgrań materiału video</h4>
        <label className="lcs-checkbox-item">
          <input
            type="checkbox"
            checked={config.hasCUID}
            disabled={readOnly}
            onChange={(e) =>
              onUpdateConfig({
                hasCUID: e.target.checked,
                cuidConfig: e.target.checked
                  ? (config.cuidConfig ?? { stanowiskoZgran: '', typNosnika: 'USB', formatWyjsciowy: 'MP4' })
                  : undefined,
              })
            }
          />
          <span>CUID obecny</span>
        </label>

        {config.hasCUID && (
          <div className="lcs-sub-section">
            <CUIDForm
              config={config.cuidConfig ?? { stanowiskoZgran: '', typNosnika: 'USB', formatWyjsciowy: 'MP4' }}
              readOnly={readOnly}
              onChange={(cuidConfig) => onUpdateConfig({ cuidConfig })}
            />
          </div>
        )}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* SMOK-B form                                                          */
/* ------------------------------------------------------------------ */

interface SmokBFormProps {
  config: LCSConfigSmokB;
  readOnly: boolean;
  onUpdateConfig: (patch: Partial<LCSConfigSmokB>) => void;
  onTogglePrzejazd: (id: number) => void;
}

const SmokBForm: React.FC<SmokBFormProps> = ({
  config,
  readOnly,
  onUpdateConfig,
  onTogglePrzejazd,
}) => {
  const [newPrzejazdId, setNewPrzejazdId] = React.useState('');

  const handleAddPrzejazd = () => {
    const id = parseInt(newPrzejazdId, 10);
    if (!isNaN(id) && id > 0 && !config.obserwowanePrzejazdy.includes(id)) {
      onTogglePrzejazd(id);
      setNewPrzejazdId('');
    }
  };

  return (
    <>
      {/* Obserwowane przejazdy */}
      <div className="lcs-config-section">
        <h4>🚦 Obserwowane przejazdy</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {config.obserwowanePrzejazdy.length === 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Brak przypisanych przejazdów
            </span>
          )}
          {config.obserwowanePrzejazdy.map(id => (
            <span
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(72,187,120,0.15)',
                border: '1px solid rgba(72,187,120,0.4)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            >
              🚦 ID {id}
              {!readOnly && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0 2px', lineHeight: 1 }}
                  onClick={() => onTogglePrzejazd(id)}
                  title="Usuń przejazd"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              value={newPrzejazdId}
              onChange={(e) => setNewPrzejazdId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPrzejazd())}
              placeholder="ID przejazdu"
              style={{ width: '130px' }}
            />
            <button type="button" className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={handleAddPrzejazd}>
              ➕ Dodaj
            </button>
          </div>
        )}
        <small className="form-help" style={{ marginTop: '6px', display: 'block' }}>
          Wpisz ID zadania przejazdu i kliknij „Dodaj"
        </small>
      </div>

      <div className="lcs-config-section">
        <h4>🖥️ Serwer odbioru obrazów</h4>
        <div className="lcs-grid-2">
          <div className="form-group">
            <label>Adres IP</label>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={config.serwerObrazu.ip}
              disabled={readOnly}
              onChange={(e) =>
                onUpdateConfig({ serwerObrazu: { ...config.serwerObrazu, ip: e.target.value } })
              }
            />
          </div>
          <div className="form-group">
            <label>Max kamer</label>
            <input
              type="number"
              min={1}
              value={config.serwerObrazu.maxKamer}
              disabled={readOnly}
              onChange={(e) =>
                onUpdateConfig({
                  serwerObrazu: { ...config.serwerObrazu, maxKamer: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Protokół</label>
            <select
              value={config.serwerObrazu.protokol}
              disabled={readOnly}
              onChange={(e) =>
                onUpdateConfig({
                  serwerObrazu: {
                    ...config.serwerObrazu,
                    protokol: e.target.value as 'RTSP' | 'ONVIF',
                  },
                })
              }
            >
              <option value="RTSP">RTSP</option>
              <option value="ONVIF">ONVIF</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stacje operatorskie */}
      <div className="lcs-config-section">
        <h4>📺 Stacje operatorskie</h4>
        {config.stacjeOperatorskie.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Brak skonfigurowanych stacji operatorskich.
          </p>
        )}
        {config.stacjeOperatorskie.map((stacja, idx) => (
          <div key={stacja.id} className="lcs-sub-section">
            <div className="lcs-grid-2">
              <div className="form-group">
                <label>Nazwa stacji</label>
                <input
                  type="text"
                  value={stacja.nazwa}
                  disabled={readOnly}
                  onChange={(e) => {
                    const updated = [...config.stacjeOperatorskie];
                    updated[idx] = { ...stacja, nazwa: e.target.value };
                    onUpdateConfig({ stacjeOperatorskie: updated });
                  }}
                />
              </div>
              <div className="form-group">
                <label>Ilość monitorów</label>
                <input
                  type="number"
                  min={1}
                  value={stacja.iloscMonitorow}
                  disabled={readOnly}
                  onChange={(e) => {
                    const updated = [...config.stacjeOperatorskie];
                    updated[idx] = { ...stacja, iloscMonitorow: Number(e.target.value) };
                    onUpdateConfig({ stacjeOperatorskie: updated });
                  }}
                />
              </div>
            </div>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '4px 10px', marginTop: '8px' }}
                onClick={() => {
                  onUpdateConfig({
                    stacjeOperatorskie: config.stacjeOperatorskie.filter((_, i) => i !== idx),
                  });
                }}
              >
                🗑️ Usuń stację
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: '12px', fontSize: '13px' }}
            onClick={() =>
              onUpdateConfig({
                stacjeOperatorskie: [
                  ...config.stacjeOperatorskie,
                  {
                    id: Date.now(),
                    nazwa: `Stacja ${config.stacjeOperatorskie.length + 1}`,
                    iloscMonitorow: 2,
                    przypisaneKamery: [],
                  },
                ],
              })
            }
          >
            ➕ Dodaj stację operatorską
          </button>
        )}
      </div>

      {/* CUID */}
      <div className="lcs-config-section">
        <h4>💿 CUID – stanowisko zgrań materiału video</h4>
        <label className="lcs-checkbox-item">
          <input
            type="checkbox"
            checked={config.hasCUID}
            disabled={readOnly}
            onChange={(e) =>
              onUpdateConfig({
                hasCUID: e.target.checked,
                cuidConfig: e.target.checked
                  ? (config.cuidConfig ?? { stanowiskoZgran: '', typNosnika: 'USB', formatWyjsciowy: 'MP4' })
                  : undefined,
              })
            }
          />
          <span>CUID obecny</span>
        </label>

        {config.hasCUID && (
          <div className="lcs-sub-section">
            <CUIDForm
              config={config.cuidConfig ?? { stanowiskoZgran: '', typNosnika: 'USB', formatWyjsciowy: 'MP4' }}
              readOnly={readOnly}
              onChange={(cuidConfig) => onUpdateConfig({ cuidConfig })}
            />
          </div>
        )}
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Shared CUID sub-form                                                 */
/* ------------------------------------------------------------------ */

interface CUIDFormProps {
  config: CUIDConfig;
  readOnly: boolean;
  onChange: (cfg: CUIDConfig) => void;
}

const CUIDForm: React.FC<CUIDFormProps> = ({ config, readOnly, onChange }) => (
  <>
    <h5>Konfiguracja CUID</h5>
    <div className="lcs-grid-2">
      <div className="form-group">
        <label>Stanowisko zgrań</label>
        <input
          type="text"
          value={config.stanowiskoZgran}
          disabled={readOnly}
          placeholder="np. CUID-1"
          onChange={(e) => onChange({ ...config, stanowiskoZgran: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label>Typ nośnika</label>
        <select
          value={config.typNosnika}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...config, typNosnika: e.target.value as CUIDConfig['typNosnika'] })
          }
        >
          <option value="USB">USB</option>
          <option value="DVD">DVD</option>
          <option value="HDD">HDD</option>
        </select>
      </div>
      <div className="form-group">
        <label>Format wyjściowy</label>
        <select
          value={config.formatWyjsciowy}
          disabled={readOnly}
          onChange={(e) =>
            onChange({ ...config, formatWyjsciowy: e.target.value as CUIDConfig['formatWyjsciowy'] })
          }
        >
          <option value="MP4">MP4</option>
          <option value="AVI">AVI</option>
          <option value="MKV">MKV</option>
        </select>
      </div>
    </div>
  </>
);
