// src/components/contracts/wizard/steps/PreviewStep.tsx
// Step: Preview all contract data and generated tasks

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { WizardData, GeneratedTask } from '../types/wizard.types';

interface Props {
  wizardData: WizardData;
  generatedTasks: GeneratedTask[];
  onNext: () => void;
  onPrev: () => void;
}

export const PreviewStep: React.FC<Props> = ({
  wizardData,
  generatedTasks,
  onNext,
  onPrev
}) => {
  // Group tasks by subsystem
  const tasksBySubsystem = wizardData.subsystems.map((subsystem) => {
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    const tasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
    return { config, subsystem, tasks };
  });

  return (
    <div className="wizard-step-content">
      <h3>Podgląd wszystkich zadań</h3>
      
      <div className="tasks-preview">
        {tasksBySubsystem.map(({ config, subsystem, tasks }, index) => (
          <div key={index} className="subsystem-tasks">
            <h4>
              {config.label} ({tasks.length} zadań)
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
              <p className="no-tasks">Brak zadań dla tego podsystemu</p>
            )}
          </div>
        ))}
        
        <div className="tasks-summary">
          <strong>Łącznie: {generatedTasks.length} zadań z {wizardData.subsystems.length} podsystemów</strong>
        </div>
      </div>
    </div>
  );
};
