// src/components/contracts/wizard/extend/steps/AddTasksToExistingStep.tsx
// Extend wizard – Step 3-N: Add new tasks to an existing subsystem

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import type { ExistingSubsystem } from '../../types/extend-wizard.types';
import type { TaskDetail } from '../../types/wizard.types';
import { OPTIONAL_KILOMETRAZ_HELP } from '../../utils/validation';
import { generateTaskName } from '../../utils/taskNameGenerator';
import { GPSLocationInput } from '../../common/GPSLocationInput';
import { RailwayLineSelect } from '../../../../common/RailwayLineSelect';
import { KilometrazInput } from '../../../../common/KilometrazInput';
import '../../subsystems/SmokipDetailsStep.css';

interface AddTasksToExistingStepProps {
  subsystem: ExistingSubsystem;
  liniaKolejowa?: string;
  onAddTask: (subsystemId: number, taskType: TaskDetail['taskType'], initialData?: Partial<TaskDetail>) => void;
  onRemoveTask: (subsystemId: number, taskIndex: number) => void;
  onUpdateTask: (subsystemId: number, taskIndex: number, updates: Partial<TaskDetail>) => void;
  onKilometrazBlur: (subsystemId: number, taskIndex: number, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Returns the primary display value for an existing (read-only) task row. */
function getTaskDisplayValue(task: TaskDetail): string {
  return (
    task.nazwa ||
    task.kilometraz ||
    task.miejscowosc ||
    task.nazwaLCS ||
    task.nazwaNastawnii ||
    '—'
  );
}

const TASK_TYPE_LABELS: Record<string, string> = {
  PRZEJAZD_KAT_A: 'Przejazd KAT A',
  PRZEJAZD_KAT_B: 'Przejazd KAT B',
  PRZEJAZD_KAT_C: 'Przejazd KAT C',
  PRZEJAZD_KAT_E: 'Przejazd KAT E',
  PRZEJAZD_KAT_F: 'Przejazd KAT F',
  SKP: 'SKP',
  NASTAWNIA: 'Nastawnia (ND)',
  LCS: 'LCS',
  CUID: 'CUID',
};

function getAddableTaskTypes(subsystemType: string): Array<TaskDetail['taskType']> {
  switch (subsystemType) {
    case 'SMOKIP_A':
      return ['PRZEJAZD_KAT_A', 'SKP', 'NASTAWNIA', 'LCS'];
    case 'SMOKIP_B':
      return ['PRZEJAZD_KAT_B', 'NASTAWNIA', 'LCS'];
    default:
      return [];
  }
}

export const AddTasksToExistingStep: React.FC<AddTasksToExistingStepProps> = ({
  subsystem,
  liniaKolejowa,
  onAddTask,
  onRemoveTask,
  onUpdateTask,
  onKilometrazBlur,
  onNext,
  onBack,
}) => {
  const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
  const addableTypes = getAddableTaskTypes(subsystem.type);

  const handleKilometrazChange = (taskIndex: number, value: string, taskType: string) => {
    const newNazwa = generateTaskName(taskType, { ...subsystem.newTasks[taskIndex], taskType: taskType as TaskDetail['taskType'], kilometraz: value }, liniaKolejowa);
    onUpdateTask(subsystem.id, taskIndex, { kilometraz: value, nazwa: newNazwa });
  };

  const handleCuidCheckbox = (lcsTaskIndex: number, checked: boolean) => {
    const lcsTask = subsystem.newTasks[lcsTaskIndex];
    onUpdateTask(subsystem.id, lcsTaskIndex, { hasCUID: checked });
    if (checked) {
      const cuidInitial: Partial<TaskDetail> = {
        liniaKolejowa: lcsTask.liniaKolejowa,
        miejscowosc: lcsTask.miejscowosc,
        nazwaLCS: lcsTask.nazwaLCS,
        nazwa: lcsTask.nazwa,
        gpsLatitude: lcsTask.gpsLatitude,
        gpsLongitude: lcsTask.gpsLongitude,
        googleMapsUrl: lcsTask.googleMapsUrl,
        kilometraz: lcsTask.kilometraz,
        linkedLCSId: lcsTask.taskWizardId,
      };
      onAddTask(subsystem.id, 'CUID', cuidInitial);
    } else {
      const cuidIndex = subsystem.newTasks.findIndex(
        (t) => t.taskType === 'CUID' && t.linkedLCSId === lcsTask.taskWizardId
      );
      if (cuidIndex !== -1) {
        onRemoveTask(subsystem.id, cuidIndex);
      }
    }
  };

  return (
    <div className="wizard-step-content">
      <h3>➕ Dodaj zadania do: {config?.label ?? subsystem.type}</h3>

      {/* Existing tasks – read-only context */}
      {subsystem.existingTasks.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h4>
            Istniejące zadania
            <span
              className="text-muted"
              style={{ fontWeight: 'normal', fontSize: '0.9em', marginLeft: '8px' }}
            >
              (tylko do odczytu)
            </span>
          </h4>
          <table className="tasks-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Typ</th>
                <th>Numer</th>
                <th>Dane</th>
              </tr>
            </thead>
            <tbody>
              {subsystem.existingTasks.map((task, idx) => (
                <tr key={idx} style={{ opacity: 0.75 }}>
                  <td>{idx + 1}</td>
                  <td>
                    <code>{task.taskType}</code>
                  </td>
                  <td>
                    <code>{task.taskNumber || '—'}</code>
                  </td>
                  <td>
                    {getTaskDisplayValue(task)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* New tasks form */}
      <section style={{ marginBottom: '24px' }}>
        <h4>Nowe zadania ({subsystem.newTasks.length})</h4>

        {subsystem.newTasks.length === 0 && (
          <p className="text-muted">
            Brak nowych zadań. Użyj przycisków poniżej, aby dodać zadania.
          </p>
        )}

        {subsystem.newTasks.map((task, idx) => (
          <div
            key={idx}
            className="task-detail-item new-task"
            style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}
          >
            <div className="task-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>
                Nowe zadanie {idx + 1}: {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
              </strong>
              <button
                type="button"
                className="btn-icon btn-danger"
                onClick={() => onRemoveTask(subsystem.id, idx)}
                title="Usuń zadanie"
              >
                🗑️
              </button>
            </div>

            {/* PRZEJAZD_KAT_A */}
            {task.taskType === 'PRZEJAZD_KAT_A' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>📌 Nazwa zadania <span className="text-muted">(automatyczna)</span></label>
                  <div className="name-preview">
                    {generateTaskName('PRZEJAZD_KAT_A', task, liniaKolejowa)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                  <GPSLocationInput
                    gpsLatitude={task.gpsLatitude}
                    gpsLongitude={task.gpsLongitude}
                    googleMapsUrl={task.googleMapsUrl}
                    onUpdate={(updates) => onUpdateTask(subsystem.id, idx, updates)}
                  />
                </div>
                <div className="form-group">
                  <label>Linia kolejowa <span className="text-muted">(opcjonalnie)</span></label>
                  <RailwayLineSelect
                    value={task.liniaKolejowa || ''}
                    onChange={(code) => {
                      const newNazwa = generateTaskName('PRZEJAZD_KAT_A', { ...task, liniaKolejowa: code }, code);
                      onUpdateTask(subsystem.id, idx, { liniaKolejowa: code, nazwa: newNazwa });
                    }}
                    placeholder="np. LK-1"
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż <span className="required">*</span></label>
                  <KilometrazInput
                    value={task.kilometraz || ''}
                    onChange={(value) => handleKilometrazChange(idx, value, 'PRZEJAZD_KAT_A')}
                    onBlur={(value) => onKilometrazBlur(subsystem.id, idx, value)}
                    lineCode={task.liniaKolejowa || liniaKolejowa}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Kategoria <span className="required">*</span></label>
                  <select
                    value={task.kategoria || 'KAT A'}
                    onChange={(e) => {
                      const kategoria = e.target.value as TaskDetail['kategoria'];
                      const newNazwa = generateTaskName('PRZEJAZD_KAT_A', { ...task, kategoria }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { kategoria, nazwa: newNazwa });
                    }}
                  >
                    <option value="KAT A">KAT A</option>
                    <option value="KAT E">KAT E</option>
                    <option value="KAT F">KAT F</option>
                  </select>
                </div>
              </div>
            )}

            {/* PRZEJAZD_KAT_B */}
            {task.taskType === 'PRZEJAZD_KAT_B' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>📌 Nazwa zadania <span className="text-muted">(automatyczna)</span></label>
                  <div className="name-preview">
                    {generateTaskName('PRZEJAZD_KAT_B', task, liniaKolejowa)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                  <GPSLocationInput
                    gpsLatitude={task.gpsLatitude}
                    gpsLongitude={task.gpsLongitude}
                    googleMapsUrl={task.googleMapsUrl}
                    onUpdate={(updates) => onUpdateTask(subsystem.id, idx, updates)}
                  />
                </div>
                <div className="form-group">
                  <label>Linia kolejowa <span className="text-muted">(opcjonalnie)</span></label>
                  <RailwayLineSelect
                    value={task.liniaKolejowa || ''}
                    onChange={(code) => {
                      const newNazwa = generateTaskName('PRZEJAZD_KAT_B', { ...task, liniaKolejowa: code }, code);
                      onUpdateTask(subsystem.id, idx, { liniaKolejowa: code, nazwa: newNazwa });
                    }}
                    placeholder="np. LK-1"
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż <span className="required">*</span></label>
                  <KilometrazInput
                    value={task.kilometraz || ''}
                    onChange={(value) => handleKilometrazChange(idx, value, 'PRZEJAZD_KAT_B')}
                    onBlur={(value) => onKilometrazBlur(subsystem.id, idx, value)}
                    lineCode={task.liniaKolejowa || liniaKolejowa}
                    required
                  />
                </div>
              </div>
            )}

            {/* SKP */}
            {task.taskType === 'SKP' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>📌 Nazwa zadania <span className="text-muted">(automatyczna)</span></label>
                  <div className="name-preview">
                    {generateTaskName('SKP', task, liniaKolejowa)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                  <GPSLocationInput
                    gpsLatitude={task.gpsLatitude}
                    gpsLongitude={task.gpsLongitude}
                    googleMapsUrl={task.googleMapsUrl}
                    onUpdate={(updates) => onUpdateTask(subsystem.id, idx, updates)}
                  />
                </div>
                <div className="form-group">
                  <label>Linia kolejowa <span className="text-muted">(opcjonalnie)</span></label>
                  <RailwayLineSelect
                    value={task.liniaKolejowa || ''}
                    onChange={(code) => {
                      const newNazwa = generateTaskName('SKP', { ...task, liniaKolejowa: code }, code);
                      onUpdateTask(subsystem.id, idx, { liniaKolejowa: code, nazwa: newNazwa });
                    }}
                    placeholder="np. LK-1"
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż <span className="required">*</span></label>
                  <KilometrazInput
                    value={task.kilometraz || ''}
                    onChange={(value) => handleKilometrazChange(idx, value, 'SKP')}
                    onBlur={(value) => onKilometrazBlur(subsystem.id, idx, value)}
                    lineCode={task.liniaKolejowa || liniaKolejowa}
                    required
                  />
                </div>
              </div>
            )}

            {/* NASTAWNIA */}
            {task.taskType === 'NASTAWNIA' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>📌 Nazwa zadania <span className="text-muted">(automatyczna)</span></label>
                  <div className="name-preview">
                    {generateTaskName('NASTAWNIA', task, liniaKolejowa)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                  <GPSLocationInput
                    gpsLatitude={task.gpsLatitude}
                    gpsLongitude={task.gpsLongitude}
                    googleMapsUrl={task.googleMapsUrl}
                    onUpdate={(updates) => onUpdateTask(subsystem.id, idx, updates)}
                  />
                </div>
                <div className="form-group">
                  <label>Linia kolejowa <span className="text-muted">(opcjonalnie)</span></label>
                  <RailwayLineSelect
                    value={task.liniaKolejowa || ''}
                    onChange={(code) => {
                      const newNazwa = generateTaskName('NASTAWNIA', { ...task, liniaKolejowa: code }, code);
                      onUpdateTask(subsystem.id, idx, { liniaKolejowa: code, nazwa: newNazwa });
                    }}
                    placeholder="np. LK-1"
                  />
                </div>
                <div className="form-group">
                  <label>Nazwa Nastawni <span className="text-muted">(opcjonalnie)</span></label>
                  <input
                    type="text"
                    placeholder="np. ND GP1"
                    value={task.nazwaNastawnii || ''}
                    onChange={(e) => {
                      const nazwaNastawnii = e.target.value;
                      const newNazwa = generateTaskName('NASTAWNIA', { ...task, nazwaNastawnii }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { nazwaNastawnii, nazwa: newNazwa });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Miejscowość <span className="text-muted">(opcjonalnie)</span></label>
                  <input
                    type="text"
                    placeholder="Miejscowość"
                    value={task.miejscowosc || ''}
                    onChange={(e) => {
                      const miejscowosc = e.target.value;
                      const newNazwa = generateTaskName('NASTAWNIA', { ...task, miejscowosc }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { miejscowosc, nazwa: newNazwa });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż <span className="text-muted">(opcjonalnie)</span></label>
                  <KilometrazInput
                    value={task.kilometraz || ''}
                    onChange={(value) => {
                      const newNazwa = generateTaskName('NASTAWNIA', { ...task, kilometraz: value }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { kilometraz: value, nazwa: newNazwa });
                    }}
                    onBlur={(value) => onKilometrazBlur(subsystem.id, idx, value)}
                    lineCode={task.liniaKolejowa || liniaKolejowa}
                  />
                  <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
                </div>
              </div>
            )}

            {/* LCS */}
            {task.taskType === 'LCS' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>📌 Nazwa zadania <span className="text-muted">(automatyczna)</span></label>
                  <div className="name-preview">
                    {generateTaskName('LCS', task, liniaKolejowa)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                  <GPSLocationInput
                    gpsLatitude={task.gpsLatitude}
                    gpsLongitude={task.gpsLongitude}
                    googleMapsUrl={task.googleMapsUrl}
                    onUpdate={(updates) => onUpdateTask(subsystem.id, idx, updates)}
                  />
                </div>
                <div className="form-group">
                  <label>Linia kolejowa <span className="text-muted">(opcjonalnie)</span></label>
                  <RailwayLineSelect
                    value={task.liniaKolejowa || ''}
                    onChange={(code) => {
                      const newNazwa = generateTaskName('LCS', { ...task, liniaKolejowa: code }, code);
                      onUpdateTask(subsystem.id, idx, { liniaKolejowa: code, nazwa: newNazwa });
                    }}
                    placeholder="np. LK-1"
                  />
                </div>
                <div className="form-group">
                  <label>Nazwa LCS <span className="text-muted">(opcjonalnie)</span></label>
                  <input
                    type="text"
                    placeholder="np. LCS Warszawa Wschód"
                    value={task.nazwaLCS || ''}
                    onChange={(e) => {
                      const nazwaLCS = e.target.value;
                      const newNazwa = generateTaskName('LCS', { ...task, nazwaLCS }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { nazwaLCS, nazwa: newNazwa });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Miejscowość <span className="text-muted">(opcjonalnie)</span></label>
                  <input
                    type="text"
                    placeholder="Miejscowość"
                    value={task.miejscowosc || ''}
                    onChange={(e) => {
                      const miejscowosc = e.target.value;
                      const newNazwa = generateTaskName('LCS', { ...task, miejscowosc }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { miejscowosc, nazwa: newNazwa });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Kilometraż <span className="text-muted">(opcjonalnie)</span></label>
                  <KilometrazInput
                    value={task.kilometraz || ''}
                    onChange={(value) => {
                      const newNazwa = generateTaskName('LCS', { ...task, kilometraz: value }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { kilometraz: value, nazwa: newNazwa });
                    }}
                    onBlur={(value) => onKilometrazBlur(subsystem.id, idx, value)}
                    lineCode={task.liniaKolejowa || liniaKolejowa}
                  />
                  <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
                </div>
                <div className="form-group cuid-checkbox-group">
                  <label className="checkbox-inline-group">
                    <input
                      type="checkbox"
                      checked={task.hasCUID || false}
                      onChange={(e) => handleCuidCheckbox(idx, e.target.checked)}
                    />
                    <span>CUiD (Centrum Utrzymania i Diagnostyki)</span>
                  </label>
                  <small className="form-help">
                    Zaznacz, jeśli LCS ma CUiD. Automatycznie tworzy dodatkowe zadanie CUID.
                  </small>
                </div>
              </div>
            )}

            {/* CUID */}
            {task.taskType === 'CUID' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>📌 Nazwa zadania <span className="text-muted">(automatyczna)</span></label>
                  <div className="name-preview">
                    {generateTaskName('CUID', task, liniaKolejowa)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Lokalizacja GPS <span className="text-muted">(opcjonalne)</span></label>
                  <GPSLocationInput
                    gpsLatitude={task.gpsLatitude}
                    gpsLongitude={task.gpsLongitude}
                    googleMapsUrl={task.googleMapsUrl}
                    onUpdate={(updates) => onUpdateTask(subsystem.id, idx, updates)}
                  />
                </div>
                <div className="form-group">
                  <label>Linia kolejowa <span className="text-muted">(opcjonalnie)</span></label>
                  <RailwayLineSelect
                    value={task.liniaKolejowa || ''}
                    onChange={(code) => {
                      const newNazwa = generateTaskName('CUID', { ...task, liniaKolejowa: code }, code);
                      onUpdateTask(subsystem.id, idx, { liniaKolejowa: code, nazwa: newNazwa });
                    }}
                    placeholder="np. LK-1"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add task buttons */}
        {addableTypes.length > 0 && (
          <div className="add-task-section">
            <p><strong>Dodaj nowe zadanie:</strong></p>
            <div className="add-task-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {addableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onAddTask(subsystem.id, type)}
                >
                  ➕ {TASK_TYPE_LABELS[type] ?? type}
                </button>
              ))}
            </div>
          </div>
        )}

        {addableTypes.length === 0 && subsystem.newTasks.length === 0 && (
          <p className="text-muted">
            Dodawanie nowych zadań nie jest obsługiwane dla tego typu podsystemu.
          </p>
        )}
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Wstecz
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Dalej →
        </button>
      </div>
    </div>
  );
};
