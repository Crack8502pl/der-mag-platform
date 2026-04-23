// src/components/contracts/wizard/extend/steps/AddTasksToExistingStep.tsx
// Extend wizard – Step 3-N: Add new tasks to an existing subsystem

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import type { ExistingSubsystem } from '../../types/extend-wizard.types';
import type { TaskDetail } from '../../types/wizard.types';
import { cleanKilometrazInput, OPTIONAL_KILOMETRAZ_HELP } from '../../utils/validation';
import { generateTaskName } from '../../utils/taskNameGenerator';

interface AddTasksToExistingStepProps {
  subsystem: ExistingSubsystem;
  liniaKolejowa?: string;
  onAddTask: (subsystemId: number, taskType: TaskDetail['taskType']) => void;
  onRemoveTask: (subsystemId: number, taskIndex: number) => void;
  onUpdateTask: (subsystemId: number, taskIndex: number, updates: Partial<TaskDetail>) => void;
  onKilometrazBlur: (subsystemId: number, taskIndex: number, value: string) => void;
  onNext: () => void;
  onBack: () => void;
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
    const cleaned = cleanKilometrazInput(value);
    const newNazwa = generateTaskName(taskType, { taskType: taskType as TaskDetail['taskType'], ...subsystem.newTasks[taskIndex], kilometraz: cleaned }, liniaKolejowa);
    onUpdateTask(subsystem.id, taskIndex, { kilometraz: cleaned, nazwa: newNazwa });
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
                    {task.nazwa || task.kilometraz || task.miejscowosc || task.nazwaLCS || task.nazwaNastawnii || '—'}
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
                  <label>Kilometraż <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="np. 123+456"
                    value={task.kilometraz || ''}
                    onChange={(e) => handleKilometrazChange(idx, e.target.value, 'PRZEJAZD_KAT_A')}
                    onBlur={(e) => onKilometrazBlur(subsystem.id, idx, e.target.value)}
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
                  <label>Kilometraż <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="np. 123+456"
                    value={task.kilometraz || ''}
                    onChange={(e) => handleKilometrazChange(idx, e.target.value, 'PRZEJAZD_KAT_B')}
                    onBlur={(e) => onKilometrazBlur(subsystem.id, idx, e.target.value)}
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
                  <label>Kilometraż <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="np. 123+456"
                    value={task.kilometraz || ''}
                    onChange={(e) => handleKilometrazChange(idx, e.target.value, 'SKP')}
                    onBlur={(e) => onKilometrazBlur(subsystem.id, idx, e.target.value)}
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
                  <input
                    type="text"
                    placeholder="np. 123+456"
                    value={task.kilometraz || ''}
                    onChange={(e) => {
                      const cleaned = cleanKilometrazInput(e.target.value);
                      const newNazwa = generateTaskName('NASTAWNIA', { ...task, kilometraz: cleaned }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { kilometraz: cleaned, nazwa: newNazwa });
                    }}
                    onBlur={(e) => onKilometrazBlur(subsystem.id, idx, e.target.value)}
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
                  <input
                    type="text"
                    placeholder="np. 123+456"
                    value={task.kilometraz || ''}
                    onChange={(e) => {
                      const cleaned = cleanKilometrazInput(e.target.value);
                      const newNazwa = generateTaskName('LCS', { ...task, kilometraz: cleaned }, liniaKolejowa);
                      onUpdateTask(subsystem.id, idx, { kilometraz: cleaned, nazwa: newNazwa });
                    }}
                    onBlur={(e) => onKilometrazBlur(subsystem.id, idx, e.target.value)}
                  />
                  <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
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
