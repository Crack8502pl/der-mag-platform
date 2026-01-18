// src/components/contracts/wizard/steps/SubsystemSelectionStep.tsx
// Step 2: Subsystem selection and confirmation

import React from 'react';
import { SUBSYSTEM_WIZARD_CONFIG, type SubsystemType } from '../../../../config/subsystemWizardConfig';
import type { SubsystemWizardData } from '../types/wizard.types';

interface Props {
  subsystems: SubsystemWizardData[];
  onAdd: (type: SubsystemType) => void;
  onRemove: (index: number) => void;
}

export const SubsystemSelectionStep: React.FC<Props> = ({
  subsystems,
  onAdd,
  onRemove
}) => {
  // Get all available subsystem types
  const availableTypes = Object.keys(SUBSYSTEM_WIZARD_CONFIG) as SubsystemType[];
  const unusedTypes = availableTypes.filter(
    type => !subsystems.some(s => s.type === type)
  );

  return (
    <div className="wizard-step-content">
      <h3>Krok 2: Wybór/potwierdzenie podsystemów</h3>
      
      {subsystems.length > 0 ? (
        <div className="subsystems-list">
          <p>Wykryte/wybrane podsystemy:</p>
          {subsystems.map((subsystem, index) => {
            const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
            const canDelete = !subsystem.isExisting || !subsystem.taskCount || subsystem.taskCount === 0;
            
            return (
              <div key={index} className="subsystem-item">
                <span>{config.label}</span>
                {subsystem.isExisting && subsystem.taskCount && subsystem.taskCount > 0 && (
                  <span className="text-muted" style={{ fontSize: '0.9em', marginLeft: '8px' }}>
                    ({subsystem.taskCount} zadań)
                  </span>
                )}
                <button 
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => onRemove(index)}
                  disabled={!canDelete}
                  title={!canDelete ? 'Nie można usunąć - podsystem ma powiązane zadania' : 'Usuń podsystem'}
                >
                  🗑️ Usuń
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p>Nie wykryto podsystemów w nazwie kontraktu. Wybierz podsystemy ręcznie:</p>
      )}
      
      {unusedTypes.length > 0 && (
        <div className="add-subsystem">
          <label>Dodaj kolejny podsystem:</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAdd(e.target.value as SubsystemType);
                e.target.value = '';
              }
            }}
          >
            <option value="">Wybierz typ podsystemu...</option>
            {unusedTypes.map((type) => {
              const config = SUBSYSTEM_WIZARD_CONFIG[type];
              return (
                <option key={type} value={type}>
                  {config.label}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
};
