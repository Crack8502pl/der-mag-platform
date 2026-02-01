import React from 'react';
import type { SubsystemWizardData, TaskDetail } from '../../types/wizard.types';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../../config/subsystemWizardConfig';
import { OPTIONAL_KILOMETRAZ_HELP } from '../../utils/validation';

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

            {detail.taskType === 'PRZEJAZD_KAT_A' && (
              <div className="task-fields">
                <div className="form-group">
                  <label>Kilometraż *</label>
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
                  <label>Kategoria *</label>
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
                  <label>Kilometraż *</label>
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
                  <label>Nazwa</label>
                  <input
                    type="text"
                    placeholder="Nazwa CUID"
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
    </div>
  );
};
