// src/components/tasks/NastawniConfigModal.tsx
// Modal for configuring Nastawnia (signalling box): standalone or subordinate to LCS

import React, { useState, useEffect } from 'react';
import taskService from '../../services/task.service';
import type { Task } from '../../types/task.types';
import type {
  NastawniaSamodzielnaConfig,
  NastawniaPodleglaConfig,
} from '../../types/nastawnia.types';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/grover-theme.css';
import './NastawniConfigModal.css';

interface Props {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

type NastawniTyp = 'SAMODZIELNA' | 'PODLEGLA';

const defaultSamodzielna = (): NastawniaSamodzielnaConfig => ({
  obserwowanePrzejazdy: [],
  iloscStanowisk: 1,
  iloscMonitorow: 1,
  funkcjonalnosci: {
    obserwacja: true,
    lacznoscAudio: false,
    zapisObrazu: false,
    zapisAudio: false,
    obslugaLPR: false,
  },
  serwerLokalny: { ip: '', typ: 'NVR' },
  telefonSystemowy: { numerWewnetrzny: '', typ: 'SIP' },
  systemPodtrzymania: { typ: 'UPS', czasPodtrzymania: 60 },
  switchTransmisji: { typ: 'ZARZADZALNY', iloscPortow: 8, iloscPortowSFP: 2 },
});

const defaultPodlegla = (): NastawniaPodleglaConfig => ({
  nadrzedneLCSId: 0,
  serwerWyswietlania: { ip: '', maxMonitorow: 2 },
  stacjaOperatorska: { iloscMonitorow: 1, przypisaneKamery: [] },
  telefonSystemowy: { numerWewnetrzny: '', typ: 'SIP' },
  infrastruktura: {
    systemPodtrzymania: { typ: 'UPS', mocVA: 1000 },
    switchTransmisji: { model: '', iloscPortow: 8 },
  },
});

export const NastawniConfigModal: React.FC<Props> = ({ task, onClose, onSuccess }) => {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('tasks', 'update');

  // Determine type from saved metadata, fallback to SAMODZIELNA
  const savedConfig = task.metadata?.configParams?.nastawniConfig;
  const [typ, setTyp] = useState<NastawniTyp>(
    savedConfig?.typ ?? (task.metadata?.configParams?.nastawniaSamodzielna === false ? 'PODLEGLA' : 'SAMODZIELNA')
  );

  const [configS, setConfigS] = useState<NastawniaSamodzielnaConfig>(defaultSamodzielna());
  const [configP, setConfigP] = useState<NastawniaPodleglaConfig>(defaultPodlegla());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (savedConfig) {
      if (savedConfig.typ === 'SAMODZIELNA' && savedConfig.data) {
        setConfigS({ ...defaultSamodzielna(), ...savedConfig.data });
      } else if (savedConfig.typ === 'PODLEGLA' && savedConfig.data) {
        setConfigP({ ...defaultPodlegla(), ...savedConfig.data });
      }
    }
  }, [task.metadata]);

  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError('');
      const data = typ === 'SAMODZIELNA' ? configS : configP;
      await taskService.update(task.taskNumber, {
        metadata: {
          ...task.metadata,
          configParams: {
            ...(task.metadata?.configParams || {}),
            nastawniConfig: { typ, data },
            nastawniaSamodzielna: typ === 'SAMODZIELNA',
          },
        },
        status: 'configured',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd zapisywania konfiguracji Nastawni');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '760px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>🏗️ Konfiguracja Nastawni</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          {error && <div className="alert alert-error">{error}</div>}

          {!canEdit && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              🔒 Tryb podglądu – brak uprawnień do edycji
            </div>
          )}

          {/* Type selector */}
          <div className="nastawnia-type-selector">
            <div
              className={`nastawnia-type-card${typ === 'SAMODZIELNA' ? ' active' : ''}`}
              onClick={() => canEdit && setTyp('SAMODZIELNA')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && canEdit && setTyp('SAMODZIELNA')}
            >
              <div className="type-icon">🏛️</div>
              <div className="type-label">Nastawnia samodzielna</div>
              <div className="type-desc">Pełna funkcjonalność – brak LCS nad nią</div>
            </div>
            <div
              className={`nastawnia-type-card${typ === 'PODLEGLA' ? ' active' : ''}`}
              onClick={() => canEdit && setTyp('PODLEGLA')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && canEdit && setTyp('PODLEGLA')}
            >
              <div className="type-icon">🔗</div>
              <div className="type-label">Nastawnia podległa LCS</div>
              <div className="type-desc">Ograniczona funkcjonalność – lokalny serwer wyświetlania</div>
            </div>
          </div>

          {typ === 'SAMODZIELNA' ? (
            <SamodzielnaForm
              config={configS}
              readOnly={!canEdit}
              onChange={setConfigS}
            />
          ) : (
            <PodleglaForm
              config={configP}
              readOnly={!canEdit}
              onChange={setConfigP}
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
/* Samodzielna form                                                      */
/* ------------------------------------------------------------------ */

interface SamodzielnaFormProps {
  config: NastawniaSamodzielnaConfig;
  readOnly: boolean;
  onChange: (cfg: NastawniaSamodzielnaConfig) => void;
}

const SamodzielnaForm: React.FC<SamodzielnaFormProps> = ({ config, readOnly, onChange }) => {
  const update = (patch: Partial<NastawniaSamodzielnaConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <>
      {/* Stanowiska i monitory */}
      <div className="nastawnia-config-section">
        <h4>📺 Stanowiska i monitory</h4>
        <div className="nastawnia-grid-2">
          <div className="form-group">
            <label>Ilość stanowisk operatorskich</label>
            <input
              type="number"
              min={1}
              value={config.iloscStanowisk}
              disabled={readOnly}
              onChange={(e) => update({ iloscStanowisk: Number(e.target.value) })}
            />
          </div>
          <div className="form-group">
            <label>Ilość monitorów</label>
            <input
              type="number"
              min={1}
              value={config.iloscMonitorow}
              disabled={readOnly}
              onChange={(e) => update({ iloscMonitorow: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Funkcjonalności */}
      <div className="nastawnia-config-section">
        <h4>⚙️ Funkcjonalności</h4>
        <div className="nastawnia-checkbox-group">
          {(
            [
              ['obserwacja', '👁️ Obserwacja przejazdów'],
              ['lacznoscAudio', '🎙️ Łączność audio'],
              ['zapisObrazu', '🎥 Zapis obrazu'],
              ['zapisAudio', '🔊 Zapis audio'],
              ['obslugaLPR', '🚘 Obsługa LPR (serwer tablic rejestracyjnych)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="nastawnia-checkbox-item">
              <input
                type="checkbox"
                checked={config.funkcjonalnosci[key]}
                disabled={readOnly}
                onChange={(e) =>
                  update({ funkcjonalnosci: { ...config.funkcjonalnosci, [key]: e.target.checked } })
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Serwer lokalny */}
      <div className="nastawnia-config-section">
        <h4>🖥️ Serwer lokalny</h4>
        <div className="nastawnia-grid-2">
          <div className="form-group">
            <label>Adres IP</label>
            <input
              type="text"
              placeholder="192.168.1.100"
              value={config.serwerLokalny.ip}
              disabled={readOnly}
              onChange={(e) =>
                update({ serwerLokalny: { ...config.serwerLokalny, ip: e.target.value } })
              }
            />
          </div>
          <div className="form-group">
            <label>Typ serwera</label>
            <select
              value={config.serwerLokalny.typ}
              disabled={readOnly}
              onChange={(e) =>
                update({
                  serwerLokalny: {
                    ...config.serwerLokalny,
                    typ: e.target.value as 'NVR' | 'VMS',
                  },
                })
              }
            >
              <option value="NVR">NVR</option>
              <option value="VMS">VMS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Infrastruktura */}
      <div className="nastawnia-config-section">
        <h4>🔌 Infrastruktura</h4>
        <div className="nastawnia-sub-section">
          <h5>📞 Telefon systemowy</h5>
          <div className="nastawnia-grid-2">
            <div className="form-group">
              <label>Numer wewnętrzny</label>
              <input
                type="text"
                placeholder="100"
                value={config.telefonSystemowy.numerWewnetrzny}
                disabled={readOnly}
                onChange={(e) =>
                  update({ telefonSystemowy: { ...config.telefonSystemowy, numerWewnetrzny: e.target.value } })
                }
              />
            </div>
            <div className="form-group">
              <label>Typ</label>
              <select
                value={config.telefonSystemowy.typ}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    telefonSystemowy: {
                      ...config.telefonSystemowy,
                      typ: e.target.value as 'SIP' | 'ANALOG',
                    },
                  })
                }
              >
                <option value="SIP">SIP</option>
                <option value="ANALOG">Analogowy</option>
              </select>
            </div>
          </div>
        </div>

        <div className="nastawnia-sub-section">
          <h5>🔋 System podtrzymania zasilania</h5>
          <div className="nastawnia-grid-2">
            <div className="form-group">
              <label>Typ</label>
              <select
                value={config.systemPodtrzymania.typ}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    systemPodtrzymania: {
                      ...config.systemPodtrzymania,
                      typ: e.target.value as 'UPS' | 'AKUMULATOR',
                    },
                  })
                }
              >
                <option value="UPS">UPS</option>
                <option value="AKUMULATOR">Akumulator</option>
              </select>
            </div>
            <div className="form-group">
              <label>Czas podtrzymania (min)</label>
              <input
                type="number"
                min={1}
                value={config.systemPodtrzymania.czasPodtrzymania}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    systemPodtrzymania: {
                      ...config.systemPodtrzymania,
                      czasPodtrzymania: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="nastawnia-sub-section">
          <h5>🌐 Switch transmisji</h5>
          <div className="nastawnia-grid-2">
            <div className="form-group">
              <label>Typ switcha</label>
              <select
                value={config.switchTransmisji.typ}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    switchTransmisji: {
                      ...config.switchTransmisji,
                      typ: e.target.value as 'ZARZADZALNY' | 'NIEZARZADZALNY',
                    },
                  })
                }
              >
                <option value="ZARZADZALNY">Zarządzalny</option>
                <option value="NIEZARZADZALNY">Niezarządzalny</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ilość portów</label>
              <input
                type="number"
                min={1}
                value={config.switchTransmisji.iloscPortow}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    switchTransmisji: {
                      ...config.switchTransmisji,
                      iloscPortow: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Ilość portów SFP</label>
              <input
                type="number"
                min={0}
                value={config.switchTransmisji.iloscPortowSFP}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    switchTransmisji: {
                      ...config.switchTransmisji,
                      iloscPortowSFP: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Podległa form                                                         */
/* ------------------------------------------------------------------ */

interface PodleglaFormProps {
  config: NastawniaPodleglaConfig;
  readOnly: boolean;
  onChange: (cfg: NastawniaPodleglaConfig) => void;
}

const PodleglaForm: React.FC<PodleglaFormProps> = ({ config, readOnly, onChange }) => {
  const update = (patch: Partial<NastawniaPodleglaConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <>
      {/* LCS reference */}
      <div className="nastawnia-config-section">
        <h4>🔗 Nadrzędne LCS</h4>
        <div className="form-group">
          <label>ID zadania LCS (nadrzędne)</label>
          <input
            type="number"
            min={0}
            placeholder="Numer ID zadania LCS"
            value={config.nadrzedneLCSId || ''}
            disabled={readOnly}
            onChange={(e) => update({ nadrzedneLCSId: Number(e.target.value) })}
          />
          <small className="form-help">
            Podaj ID zadania LCS, pod które podlega ta nastawnia
          </small>
        </div>
      </div>

      {/* Serwer wyświetlania */}
      <div className="nastawnia-config-section">
        <h4>🖥️ Serwer wyświetlania obrazu</h4>
        <div className="nastawnia-grid-2">
          <div className="form-group">
            <label>Adres IP</label>
            <input
              type="text"
              placeholder="192.168.1.101"
              value={config.serwerWyswietlania.ip}
              disabled={readOnly}
              onChange={(e) =>
                update({ serwerWyswietlania: { ...config.serwerWyswietlania, ip: e.target.value } })
              }
            />
          </div>
          <div className="form-group">
            <label>Max monitorów</label>
            <input
              type="number"
              min={1}
              value={config.serwerWyswietlania.maxMonitorow}
              disabled={readOnly}
              onChange={(e) =>
                update({
                  serwerWyswietlania: {
                    ...config.serwerWyswietlania,
                    maxMonitorow: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Stacja operatorska */}
      <div className="nastawnia-config-section">
        <h4>📺 Stacja operatorska</h4>
        <div className="form-group">
          <label>Ilość monitorów</label>
          <input
            type="number"
            min={1}
            value={config.stacjaOperatorska.iloscMonitorow}
            disabled={readOnly}
            onChange={(e) =>
              update({
                stacjaOperatorska: {
                  ...config.stacjaOperatorska,
                  iloscMonitorow: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>

      {/* Telefon systemowy */}
      <div className="nastawnia-config-section">
        <h4>📞 Telefon systemowy</h4>
        <div className="nastawnia-grid-2">
          <div className="form-group">
            <label>Numer wewnętrzny</label>
            <input
              type="text"
              placeholder="100"
              value={config.telefonSystemowy.numerWewnetrzny}
              disabled={readOnly}
              onChange={(e) =>
                update({
                  telefonSystemowy: { ...config.telefonSystemowy, numerWewnetrzny: e.target.value },
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Typ</label>
            <select
              value={config.telefonSystemowy.typ}
              disabled={readOnly}
              onChange={(e) =>
                update({
                  telefonSystemowy: {
                    ...config.telefonSystemowy,
                    typ: e.target.value as 'SIP' | 'ANALOG',
                  },
                })
              }
            >
              <option value="SIP">SIP</option>
              <option value="ANALOG">Analogowy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Infrastruktura */}
      <div className="nastawnia-config-section">
        <h4>🔌 Infrastruktura</h4>
        <div className="nastawnia-sub-section">
          <h5>🔋 UPS</h5>
          <div className="form-group">
            <label>Moc UPS [VA]</label>
            <input
              type="number"
              min={100}
              step={100}
              value={config.infrastruktura.systemPodtrzymania.mocVA}
              disabled={readOnly}
              onChange={(e) =>
                update({
                  infrastruktura: {
                    ...config.infrastruktura,
                    systemPodtrzymania: {
                      typ: 'UPS',
                      mocVA: Number(e.target.value),
                    },
                  },
                })
              }
            />
          </div>
        </div>

        <div className="nastawnia-sub-section">
          <h5>🌐 Switch transmisji</h5>
          <div className="nastawnia-grid-2">
            <div className="form-group">
              <label>Model switcha</label>
              <input
                type="text"
                placeholder="np. Cisco SG350"
                value={config.infrastruktura.switchTransmisji.model}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    infrastruktura: {
                      ...config.infrastruktura,
                      switchTransmisji: {
                        ...config.infrastruktura.switchTransmisji,
                        model: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>Ilość portów</label>
              <input
                type="number"
                min={1}
                value={config.infrastruktura.switchTransmisji.iloscPortow}
                disabled={readOnly}
                onChange={(e) =>
                  update({
                    infrastruktura: {
                      ...config.infrastruktura,
                      switchTransmisji: {
                        ...config.infrastruktura.switchTransmisji,
                        iloscPortow: Number(e.target.value),
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
