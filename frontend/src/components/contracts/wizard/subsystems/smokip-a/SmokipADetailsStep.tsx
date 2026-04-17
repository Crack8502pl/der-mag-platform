import React from 'react';
import type { SubsystemWizardData, TaskDetail } from '../../types/wizard.types';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import { OPTIONAL_KILOMETRAZ_HELP, formatLiniaKolejowa } from '../../utils/validation';
import { GPSLocationInput } from '../../common/GPSLocationInput';

interface SmokipADetailsStepProps {
  subsystem: SubsystemWizardData;
  subsystemIndex: number;
  detectedRailwayLine?: string;
  onUpdate: (index: number, updates: Partial<SubsystemWizardData>) => void;
  onAddTask: (subsystemIndex: number, taskType: TaskDetail['taskType'], initialData?: Partial<TaskDetail>) => void;
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
  detectedRailwayLine,
  onAddTask,
  onRemoveTask,
  onUpdateTask,
  handleKilometrazInput,
  handleKilometrazBlur
}) => {
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
  const taskDetails = subsystem.taskDetails || [];

  const handleLiniaKolejowaBlur = (taskIndex: number, value: string) => {
    if (value.trim()) {
      const formatted = formatLiniaKolejowa(value);
      onUpdateTask(subsystemIndex, taskIndex, { liniaKolejowa: formatted });
    }
  };

  const handleAddTask = (taskType: TaskDetail['taskType']) => {
    const initialData: Partial<TaskDetail> = detectedRailwayLine
      ? { liniaKolejowa: detectedRailwayLine }
      : {};
    onAddTask(subsystemIndex, taskType, Object.keys(initialData).length ? initialData : undefined);
  };

  const handleCuidCheckbox = (lcsTaskIndex: number, checked: boolean) => {
    const lcsTask = taskDetails[lcsTaskIndex];
    onUpdateTask(subsystemIndex, lcsTaskIndex, { hasCUID: checked });
    if (checked) {
      // Add CUID task inheriting full location from LCS; link via stable LCS taskWizardId
      const cuidInitial: Partial<TaskDetail> = {
        liniaKolejowa: lcsTask.liniaKolejowa || detectedRailwayLine,
        miejscowosc: lcsTask.miejscowosc,
        nazwa: lcsTask.nazwa,
        gpsLatitude: lcsTask.gpsLatitude,
        gpsLongitude: lcsTask.gpsLongitude,
        googleMapsUrl: lcsTask.googleMapsUrl,
        kilometraz: lcsTask.kilometraz,
        linkedLCSId: lcsTask.taskWizardId,
      };
      onAddTask(subsystemIndex, 'CUID', cuidInitial);
    } else {
      // Remove the CUID task linked to this specific LCS via its stable taskWizardId
      const cuidIndex = taskDetails.findIndex(
        (t) => t.taskType === 'CUID' && t.linkedLCSId === lcsTask.taskWizardId
      );
      if (cuidIndex !== -1) {
        onRemoveTask(subsystemIndex, cuidIndex);
      }
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
        {taskDetails.map((detail, idx) => {
          const isExisting = !!detail.id;
          return (
          <div key={idx} className={`task-detail-item ${isExisting ? 'existing-task' : 'new-task'}`}>
            <div className="task-header">
              <strong>
                Zadanie {idx + 1}: {detail.taskType}
                {isExisting && (
                  <span className="badge-task-created">
                    ✅ Utworzone
                  </span>
                )}
              </strong>
              <button
                type="button"
                className="btn-icon btn-danger"
                onClick={() => onRemoveTask(subsystemIndex, idx)}
                title={isExisting ? 'Nie można usunąć utworzonego zadania' : 'Usuń zadanie'}
                disabled={isExisting}
                style={isExisting ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >
                🗑️
              </button>
            </div>

            <div className="task-fields task-fields-common">
              <div className="form-group">
                <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                <GPSLocationInput
                  gpsLatitude={detail.gpsLatitude}
                  gpsLongitude={detail.gpsLongitude}
                  googleMapsUrl={detail.googleMapsUrl}
                  onUpdate={(updates) => onUpdateTask(subsystemIndex, idx, updates)}
                />
              </div>

              <div className="form-group">
                <label>Linia kolejowa <span className="text-muted">(opcjonalne)</span></label>
                <input
                  type="text"
                  placeholder="np. LK-221, E-20"
                  value={detail.liniaKolejowa || ''}
                  onChange={(e) => onUpdateTask(subsystemIndex, idx, { liniaKolejowa: e.target.value })}
                  onBlur={(e) => handleLiniaKolejowaBlur(idx, e.target.value)}
                />
                {detectedRailwayLine && !detail.liniaKolejowa && (
                  <small className="form-help text-success">
                    ✓ Wykryto automatycznie z nazwy kontraktu: {detectedRailwayLine}
                  </small>
                )}
                {!detectedRailwayLine && (
                  <small className="form-help">Format: LK-XXX lub E-XX (auto-normalizacja)</small>
                )}
              </div>
            </div>

            {detail.taskType === 'LCS' && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="checkbox-inline-group">
                  <input
                    type="checkbox"
                    checked={detail.hasCUID || false}
                    onChange={(e) => handleCuidCheckbox(idx, e.target.checked)}
                  />
                  <span>CUiD (Centrum Utrzymania i Diagnostyki)</span>
                </label>
                <small className="form-help">
                  Zaznacz, jeśli LCS ma CUiD. Automatycznie tworzy dodatkowe zadanie CUID.
                </small>
              </div>
            )}

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
          );
        })}

        <div className="add-task-section">
          <p><strong>Dodaj nowe zadanie:</strong></p>
          <div className="add-task-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTask('PRZEJAZD_KAT_A')}
            >
              ➕ Przejazd Kat A
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTask('SKP')}
            >
              ➕ SKP
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTask('NASTAWNIA')}
            >
              ➕ Nastawnia
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTask('LCS')}
            >
              ➕ LCS
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleAddTask('CUID')}
            >
              ➕ CUID
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

