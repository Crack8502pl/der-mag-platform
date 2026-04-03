import React, { useState } from 'react';
import type { SubsystemWizardData, TaskDetail } from '../../types/wizard.types';
import type { FiberConnection } from '../../../../../types/fiber.types';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import { OPTIONAL_KILOMETRAZ_HELP, formatLiniaKolejowa } from '../../utils/validation';
import { useGoogleMaps } from '../../../../../hooks/useGoogleMaps';
import { WizardFiberModal } from '../WizardFiberModal';

interface SmokipADetailsStepProps {
  subsystem: SubsystemWizardData;
  subsystemIndex: number;
  onUpdate: (index: number, updates: Partial<SubsystemWizardData>) => void;
  onAddTask: (subsystemIndex: number, taskType: TaskDetail['taskType']) => void;
  onRemoveTask: (subsystemIndex: number, taskIndex: number) => void;
  onUpdateTask: (subsystemIndex: number, taskIndex: number, updates: Partial<TaskDetail>) => void;
  onNext: () => void;
  onPrev: () => void;
  handleKilometrazInput: (subsystemIndex: number, taskIndex: number, value: string) => void;
  handleKilometrazBlur: (subsystemIndex: number, taskIndex: number, value: string) => void;
}

export const SmokipADetailsStep: React.FC<SmokipADetailsStepProps> = ({
  subsystem,
  subsystemIndex,
  onAddTask,
  onRemoveTask,
  onUpdateTask,
  handleKilometrazInput,
  handleKilometrazBlur
}) => {
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
  const taskDetails = subsystem.taskDetails || [];
  const { parseUrl, parseUrlLocal, loading: gpsLoading } = useGoogleMaps();
  const [gpsInputValues, setGpsInputValues] = useState<Record<number, string>>({});
  const [fiberModalTaskIndex, setFiberModalTaskIndex] = useState<number | null>(null);

  const handleGpsInputChange = async (taskIndex: number, value: string) => {
    setGpsInputValues(prev => ({ ...prev, [taskIndex]: value }));

    if (value.includes('google.com/maps') || value.includes('goo.gl/maps') || value.includes('maps.app.goo.gl')) {
      try {
        const localResult = parseUrlLocal(value);
        if (localResult) {
          onUpdateTask(subsystemIndex, taskIndex, {
            gpsLatitude: localResult.lat.toFixed(6),
            gpsLongitude: localResult.lon.toFixed(6),
            googleMapsUrl: value
          });
          return;
        }
        const result = await parseUrl(value);
        if (result?.coordinates) {
          onUpdateTask(subsystemIndex, taskIndex, {
            gpsLatitude: result.coordinates.lat.toFixed(6),
            gpsLongitude: result.coordinates.lon.toFixed(6),
            googleMapsUrl: value
          });
        }
      } catch (err) {
        console.error('Błąd parsowania linku Google Maps:', err);
      }
    } else if (value.match(/^[-0-9.]+\s*,\s*[-0-9.]+$/)) {
      const parts = value.split(',').map(s => s.trim());
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
          onUpdateTask(subsystemIndex, taskIndex, {
            gpsLatitude: lat.toFixed(6),
            gpsLongitude: lon.toFixed(6)
          });
        }
      }
    }
  };

  const handleGetCurrentLocation = (taskIndex: number) => {
    if (!navigator.geolocation) {
      alert('Geolokalizacja nie jest wspierana przez tę przeglądarkę');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onUpdateTask(subsystemIndex, taskIndex, {
          gpsLatitude: position.coords.latitude.toFixed(6),
          gpsLongitude: position.coords.longitude.toFixed(6)
        });
        setGpsInputValues(prev => ({ ...prev, [taskIndex]: '' }));
      },
      (error) => {
        const msg = error.code === error.PERMISSION_DENIED
          ? 'Brak uprawnień do geolokalizacji. Zezwól na dostęp do lokalizacji w ustawieniach przeglądarki.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Lokalizacja jest niedostępna. Spróbuj ponownie.'
            : 'Nie udało się pobrać lokalizacji. Spróbuj ponownie.';
        alert(msg);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleLiniaKolejowaBlur = (taskIndex: number, value: string) => {
    if (value.trim()) {
      const formatted = formatLiniaKolejowa(value);
      onUpdateTask(subsystemIndex, taskIndex, { liniaKolejowa: formatted });
    }
  };

  const openInGoogleMaps = (lat: string, lon: string) => {
    if (lat && lon) {
      window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
    }
  };

  const describedTasks = taskDetails.filter(detail => {
    if (detail.taskType === 'PRZEJAZD_KAT_A') {
      return detail.kilometraz && detail.kategoria;
    } else if (detail.taskType === 'SKP') {
      return detail.kilometraz;
    }
    return detail.nazwa || detail.miejscowosc || detail.kilometraz;
  }).length;

  return (
    <div className="wizard-step-content">
      <h3>Szczegóły zadań: {config.label}</h3>
      <p className="info-text">
        Opisane: {describedTasks}/{taskDetails.length} zadań
      </p>

      <div className="task-details-form">
        {taskDetails.map((detail, idx) => (
          <div key={idx} className="task-detail-item">
            <div className="task-header">
              <strong>Zadanie {idx + 1}: {detail.taskType}</strong>
              <button
                type="button"
                className="btn-icon btn-danger"
                onClick={() => onRemoveTask(subsystemIndex, idx)}
                title="Usuń zadanie"
              >
                🗑️
              </button>
            </div>

            <div className="task-fields task-fields-common">
              <div className="form-group">
                <label>Linia kolejowa <span className="text-muted">(opcjonalne)</span></label>
                <input
                  type="text"
                  placeholder="np. LK-221, E-20"
                  value={detail.liniaKolejowa || ''}
                  onChange={(e) => onUpdateTask(subsystemIndex, idx, { liniaKolejowa: e.target.value })}
                  onBlur={(e) => handleLiniaKolejowaBlur(idx, e.target.value)}
                />
                <small className="form-help">Format: LK-XXX lub E-XX (auto-normalizacja)</small>
              </div>

              <div className="form-group">
                <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                <div className="gps-input-wrapper">
                  <input
                    type="text"
                    placeholder="Wklej link Google Maps lub współrzędne (lat, lon)"
                    value={gpsInputValues[idx] || ''}
                    onChange={(e) => handleGpsInputChange(idx, e.target.value)}
                    className="gps-url-input"
                  />
                  <button
                    type="button"
                    className="btn-icon btn-gps"
                    onClick={() => handleGetCurrentLocation(idx)}
                    title="Użyj aktualnej lokalizacji"
                    disabled={gpsLoading}
                  >
                    📍
                  </button>
                </div>
                {(detail.gpsLatitude || detail.gpsLongitude) && (
                  <div className="gps-coordinates-display">
                    <span className="gps-coords">
                      📌 {detail.gpsLatitude}, {detail.gpsLongitude}
                    </span>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => openInGoogleMaps(detail.gpsLatitude!, detail.gpsLongitude!)}
                      title="Otwórz w Google Maps"
                    >
                      🗺️ Otwórz mapę
                    </button>
                    <button
                      type="button"
                      className="btn-link btn-danger-link"
                      onClick={() => {
                        onUpdateTask(subsystemIndex, idx, { gpsLatitude: undefined, gpsLongitude: undefined });
                        setGpsInputValues(prev => ({ ...prev, [idx]: '' }));
                      }}
                      title="Usuń lokalizację"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <small className="form-help">
                  Obsługiwane formaty: link Google Maps (także skrócony), współrzędne "52.2297, 21.0122"
                </small>
              </div>
            </div>

            {detail.taskType === 'PRZEJAZD_KAT_A' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>Kilometraż <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={detail.kilometraz || ''}
                    onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                    onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Kategoria <span className="required">*</span></label>
                  <select
                    value={detail.kategoria || 'KAT A'}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, {
                      kategoria: e.target.value as TaskDetail['kategoria']
                    })}
                    required
                  >
                    <option value="KAT A">KAT A</option>
                    <option value="KAT E">KAT E</option>
                    <option value="KAT F">KAT F</option>
                  </select>
                </div>
              </div>
            )}

            {detail.taskType === 'SKP' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>Kilometraż <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={detail.kilometraz || ''}
                    onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                    onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {detail.taskType === 'NASTAWNIA' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>Nazwa</label>
                  <input
                    type="text"
                    placeholder="Nazwa nastawni"
                    value={detail.nazwa || ''}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, { nazwa: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Miejscowość</label>
                  <input
                    type="text"
                    placeholder="Miejscowość"
                    value={detail.miejscowosc || ''}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, { miejscowosc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż (opcjonalnie)</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={detail.kilometraz || ''}
                    onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                    onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
                  />
                  <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
                </div>
              </div>
            )}

            {detail.taskType === 'LCS' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>Nazwa</label>
                  <input
                    type="text"
                    placeholder="Nazwa LCS"
                    value={detail.nazwa || ''}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, { nazwa: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Miejscowość</label>
                  <input
                    type="text"
                    placeholder="Miejscowość"
                    value={detail.miejscowosc || ''}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, { miejscowosc: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż (opcjonalnie)</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={detail.kilometraz || ''}
                    onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                    onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
                  />
                  <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
                </div>
                <div className="form-group">
                  <label>Połączenia światłowodowe <span className="text-muted">(opcjonalne)</span></label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setFiberModalTaskIndex(idx)}
                  >
                    ⚡ {(() => {
                        const n = detail.fiberConnections?.length || 0;
                        if (!n) return 'Konfiguruj połączenia';
                        const plural = n === 1 ? 'połączenie' : n < 5 ? 'połączenia' : 'połączeń';
                        return `Konfiguruj (${n} ${plural})`;
                      })()}
                  </button>
                </div>
              </div>
            )}

            {detail.taskType === 'CUID' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>Nazwa <span className="text-muted">(opcjonalnie)</span></label>
                  <input
                    type="text"
                    placeholder="Pozostaw puste aby skopiować z LCS"
                    value={detail.nazwa || ''}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, { nazwa: e.target.value })}
                  />
                  <small className="form-help">Jeśli puste, nazwa zostanie pobrana z LCS</small>
                </div>
                <div className="form-group">
                  <label>Miejscowość <span className="text-muted">(opcjonalnie)</span></label>
                  <input
                    type="text"
                    placeholder="Pozostaw puste aby skopiować z LCS"
                    value={detail.miejscowosc || ''}
                    onChange={(e) => onUpdateTask(subsystemIndex, idx, { miejscowosc: e.target.value })}
                  />
                  <small className="form-help">Jeśli puste, miejscowość zostanie pobrana z LCS</small>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="add-task-section">
          <p><strong>Dodaj nowe zadanie:</strong></p>
          <div className="add-task-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAddTask(subsystemIndex, 'PRZEJAZD_KAT_A')}
            >
              ➕ Przejazd Kat A
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAddTask(subsystemIndex, 'SKP')}
            >
              ➕ SKP
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAddTask(subsystemIndex, 'NASTAWNIA')}
            >
              ➕ Nastawnia
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAddTask(subsystemIndex, 'LCS')}
            >
              ➕ LCS
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onAddTask(subsystemIndex, 'CUID')}
            >
              ➕ CUID
            </button>
          </div>
        </div>
      </div>

      {fiberModalTaskIndex !== null && (() => {
        const detail = taskDetails[fiberModalTaskIndex];
        return (
          <WizardFiberModal
            taskLabel={detail?.nazwa || `LCS ${fiberModalTaskIndex + 1}`}
            initialConnections={detail?.fiberConnections || []}
            gpsLatitude={detail?.gpsLatitude}
            gpsLongitude={detail?.gpsLongitude}
            kilometraz={detail?.kilometraz}
            onSave={(connections: FiberConnection[]) => {
              onUpdateTask(subsystemIndex, fiberModalTaskIndex, { fiberConnections: connections });
              setFiberModalTaskIndex(null);
            }}
            onClose={() => setFiberModalTaskIndex(null)}
          />
        );
      })()}
    </div>
  );
};
