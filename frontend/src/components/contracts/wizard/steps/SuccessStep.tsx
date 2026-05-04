// src/components/contracts/wizard/steps/SuccessStep.tsx
// Step: Success screen after contract creation

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import { usePermissions } from '../../../../hooks/usePermissions';
import type { WizardData, GeneratedTask } from '../types/wizard.types';

interface Props {
  contractNumber: string;
  wizardData: WizardData;
  generatedTasks: GeneratedTask[];
  onClose: () => void;
  onRequestShipping?: () => void;
  onCompleteInstallationTask?: (taskNumber: string) => void;
  /** Non-fatal warnings from post-creation saves (e.g. topology or hierarchy failures) */
  warnings?: string[];
}

export const SuccessStep: React.FC<Props> = ({
  contractNumber,
  wizardData,
  generatedTasks,
  onClose,
  onRequestShipping,
  onCompleteInstallationTask,
  warnings,
}) => {
  const { hasPermission } = usePermissions();
  const canCreateAsset = hasPermission('assets', 'create');

  const tasksBySubsystem = wizardData.subsystems.map((subsystem) => {
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    const tasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
    return { config, tasks };
  });

  const installationTasks = generatedTasks.filter(
    t => t.subsystemType === 'SMOKIP_A' || t.subsystemType === 'SMOKIP_B'
  );

  const handleConfigureAndShip = () => {
    if (onRequestShipping) {
      onRequestShipping();
    } else {
      onClose();
    }
  };

  return (
    <div className="wizard-step-content wizard-success">
      <div className="success-icon">✅</div>
      <h3>Kontrakt utworzony!</h3>
      {contractNumber && <p className="text-muted">Numer: {contractNumber}</p>}
      <p>Utworzono kontrakt z {wizardData.subsystems.length} podsystemami:</p>
      <ul className="success-summary">
        {tasksBySubsystem.map(({ config, tasks }, index) => (
          <li key={index}>
            {config.label} ({tasks.length} zadań)
          </li>
        ))}
      </ul>
      <p><strong>Łącznie: {generatedTasks.length} zadań</strong></p>

      {warnings && warnings.length > 0 && (
        <div className="alert alert-warning" style={{ textAlign: 'left', marginTop: '12px' }}>
          <strong>⚠️ Kontrakt został zapisany, ale wystąpiły problemy z dodatkowym zapisem:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {canCreateAsset && installationTasks.length > 0 && onCompleteInstallationTask && (
        <div className="success-installation-tasks">
          <p className="success-installation-hint">
            🏗️ Zadania instalacyjne SMOKIP — możesz od razu zakończyć i utworzyć obiekty:
          </p>
          <ul className="success-installation-list">
            {installationTasks.map((task) => (
              <li key={task.number} className="success-installation-item">
                <span className="success-task-name">
                  <code>{task.number}</code> {task.name}
                </span>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => onCompleteInstallationTask(task.number)}
                >
                  ✅ Zakończ i utwórz obiekt
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="success-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Zakończ bez wysyłki
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleConfigureAndShip}
        >
          📦 Zleć wysyłkę
        </button>
      </div>
    </div>
  );
};
