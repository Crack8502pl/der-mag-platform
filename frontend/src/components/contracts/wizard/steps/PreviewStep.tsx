// src/components/contracts/wizard/steps/PreviewStep.tsx
// Step: Preview all contract data and generated tasks

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { WizardData, GeneratedTask } from '../types/wizard.types';
import type { ExtendWizardData } from '../types/extend-wizard.types';

interface ExtendPreviewData {
  extendData: ExtendWizardData;
}

interface Props {
  wizardData: WizardData;
  generatedTasks: GeneratedTask[];
  editMode?: boolean;
  extendMode?: boolean;
  extendPreviewData?: ExtendPreviewData;
  onNext: () => void;
  onPrev: () => void;
}

export const PreviewStep: React.FC<Props> = ({
  wizardData,
  generatedTasks,
  editMode,
  extendMode,
  extendPreviewData,
  onNext: _onNext,
  onPrev: _onPrev
}) => {
  // Group tasks by subsystem
  const tasksBySubsystem = wizardData.subsystems.map((subsystem) => {
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    const tasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
    const existingTasksCount = editMode
      ? (subsystem.taskDetails?.filter(t => t.id).length || 0)
      : 0;
    return { config, subsystem, tasks, existingTasksCount };
  });

  // Compute extend summary
  const extendSummary = extendMode && extendPreviewData
    ? (() => {
        const { extendData } = extendPreviewData;
        const newSubsystems = extendData.newSubsystems.map((sub) => ({
          label: SUBSYSTEM_WIZARD_CONFIG[sub.type]?.label ?? sub.type,
          taskCount: sub.taskDetails?.length ?? 0,
        }));
        const extendedSubsystems = extendData.existingSubsystems
          .filter((sub) => sub.addingNewTasks && sub.newTasks.length > 0)
          .map((sub) => ({
            label: SUBSYSTEM_WIZARD_CONFIG[sub.type]?.label ?? sub.type,
            newTaskCount: sub.newTasks.length,
          }));
        return { newSubsystems, extendedSubsystems };
      })()
    : null;

  return (
    <div className="wizard-step-content">
      <h3>
        {extendMode
          ? 'Podgląd zmian (tryb rozszerzania)'
          : editMode
          ? 'Podgląd nowych zadań'
          : 'Podgląd wszystkich zadań'}
      </h3>

      {editMode && !extendMode && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          ℹ️ Wyświetlane są tylko <strong>nowe zadania</strong>, które zostaną dodane do kontraktu.
          Istniejące zadania nie są pokazywane.
        </div>
      )}

      {/* Extend mode summary */}
      {extendMode && extendSummary && (
        <div className="alert alert-info" style={{ marginBottom: '20px' }}>
          <strong>📋 Zmiany w kontrakcie:</strong>
          {extendSummary.newSubsystems.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Nowe podsystemy: {extendSummary.newSubsystems.length}</strong>
              <ul style={{ margin: '4px 0 0 16px' }}>
                {extendSummary.newSubsystems.map((sub, idx) => (
                  <li key={idx}>{sub.label} ({sub.taskCount} zadań)</li>
                ))}
              </ul>
            </div>
          )}
          {extendSummary.extendedSubsystems.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Nowe zadania dla istniejących podsystemów:</strong>
              <ul style={{ margin: '4px 0 0 16px' }}>
                {extendSummary.extendedSubsystems.map((sub, idx) => (
                  <li key={idx}>{sub.label}: +{sub.newTaskCount} zadań</li>
                ))}
              </ul>
            </div>
          )}
          {extendSummary.newSubsystems.length === 0 && extendSummary.extendedSubsystems.length === 0 && (
            <div style={{ marginTop: '8px' }}>Brak zaplanowanych zmian.</div>
          )}
        </div>
      )}

      {!extendMode && (
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
      )}
    </div>
  );
};
