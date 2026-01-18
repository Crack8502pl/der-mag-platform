// src/components/contracts/wizard/steps/SuccessStep.tsx
// Step: Success screen after contract creation

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { WizardData, GeneratedTask } from '../types/wizard.types';

interface Props {
  contractNumber: string;
  wizardData: WizardData;
  generatedTasks: GeneratedTask[];
  onClose: () => void;
  onViewContract?: () => void;
}

export const SuccessStep: React.FC<Props> = ({
  contractNumber,
  wizardData,
  generatedTasks,
  onClose,
  onViewContract
}) => {
  const tasksBySubsystem = wizardData.subsystems.map((subsystem) => {
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    const tasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
    return { config, tasks };
  });

  const handleViewContract = () => {
    if (onViewContract) {
      onViewContract();
    }
    onClose();
  };

  return (
    <div className="wizard-step-content wizard-success">
      <div className="success-icon">✅</div>
      <h3>Kontrakt utworzony!</h3>
      <p>Utworzono kontrakt z {wizardData.subsystems.length} podsystemami:</p>
      <ul className="success-summary">
        {tasksBySubsystem.map(({ config, tasks }, index) => (
          <li key={index}>
            {config.label} ({tasks.length} zadań)
          </li>
        ))}
      </ul>
      <p><strong>Łącznie: {generatedTasks.length} zadań</strong></p>
      <div className="success-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Zamknij
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleViewContract}
        >
          Przejdź do kontraktu
        </button>
      </div>
    </div>
  );
};
