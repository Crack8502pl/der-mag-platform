// src/components/contracts/wizard/steps/PreviewStep.tsx
// Step: Preview all contract data and generated tasks

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { WizardData, GeneratedTask } from '../types/wizard.types';

interface Props {
  wizardData: WizardData;
  generatedTasks: GeneratedTask[];
  editMode?: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export const PreviewStep: React.FC<Props> = ({
  wizardData,
  generatedTasks,
  editMode,
  onNext: _onNext,
  onPrev: _onPrev
}) => {
  // Group tasks by subsystem
  const tasksBySubsystem = wizardData.subsystems.map((subsystem) => {
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    const tasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
    const existingTasksCount = editMode
      ? (subsystem.taskDetails?.filter(t => t.id)?.length || 0)
      : 0;
    return { config, subsystem, tasks, existingTasksCount };
  });

  return (
    <div className="wizard-step-content">
      <h3>
        {editMode ? 'Podgląd nowych zadań' : 'Podgląd wszystkich zadań'}
      </h3>

      {editMode && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          ℹ️ Wyświetlane są tylko <strong>nowe zadania</strong>, które zostaną dodane do kontraktu.
          Istniejące zadania nie są pokazywane.
        </div>
      )}
      
      <div className="tasks-preview">
        {tasksBySubsystem.map(({ config, subsystem, tasks, existingTasksCount }, index) => (
          <div key={index} className="subsystem-tasks">
            <h4>
              {config.label}
              {editMode && existingTasksCount > 0 ? (
                <span className="text-muted" style={{ fontSize: '0.9em', marginLeft: '10px' }}>
                  (📋 {existingTasksCount} istniejących + ➕ {tasks.length} nowych)
                </span>
              ) : (
                <> ({tasks.length} zadań)</>
              )}
              {subsystem.ipPool && (
                <span className="ip-pool-badge" style={{ marginLeft: '10px', padding: '4px 8px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '0.85em' }}>
                  🌐 {subsystem.ipPool}
                </span>
              )}
            </h4>
            {tasks.length > 0 ? (
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Numer</th>
                    <th>Nazwa zadania</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => (
                    <tr key={idx}>
                      <td><code>{task.number || '(automatyczny)'}</code></td>
                      <td>{task.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-tasks">
                {editMode ? '✅ Brak nowych zadań do dodania' : 'Brak zadań dla tego podsystemu'}
              </p>
            )}
          </div>
        ))}
        
        <div className="tasks-summary">
          <strong>
            {editMode
              ? `Łącznie: ${generatedTasks.length} nowych zadań z ${wizardData.subsystems.length} podsystemów`
              : `Łącznie: ${generatedTasks.length} zadań z ${wizardData.subsystems.length} podsystemów`
            }
          </strong>
        </div>
      </div>
    </div>
  );
};
