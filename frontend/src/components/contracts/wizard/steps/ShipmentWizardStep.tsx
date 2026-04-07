// src/components/contracts/wizard/steps/ShipmentWizardStep.tsx
// Step: Configure shipping for newly created contract subsystems

import React, { useState, useEffect } from 'react';
import contractService from '../../../../services/contract.service';
import type { Contract, Subsystem } from '../../../../services/contract.service';
import { ShipmentWizardModal } from '../../ShipmentWizardModal';
import { ShipmentWizardSmokA } from '../../ShipmentWizardSmokA';
import { ShipmentWizardSmokB } from '../../ShipmentWizardSmokB';

interface ShipmentWizardStepProps {
  contract: Contract;
  onComplete: () => void;
  onSkip: () => void;
}

export const ShipmentWizardStep: React.FC<ShipmentWizardStepProps> = ({
  contract,
  onComplete,
  onSkip,
}) => {
  const [subsystems, setSubsystems] = useState<Subsystem[]>(contract.subsystems || []);
  const [loadingSubsystems, setLoadingSubsystems] = useState(!contract.subsystems?.length);
  const [loadError, setLoadError] = useState('');
  const [activeSubsystem, setActiveSubsystem] = useState<Subsystem | null>(null);
  const [configuredIds, setConfiguredIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!contract.subsystems?.length) {
      setLoadingSubsystems(true);
      contractService.getContract(contract.id)
        .then((fullContract) => {
          setSubsystems(fullContract.subsystems || []);
        })
        .catch(() => {
          setLoadError('Nie udało się załadować podsystemów kontraktu');
        })
        .finally(() => {
          setLoadingSubsystems(false);
        });
    }
  }, [contract.id, contract.subsystems]);

  const handleShippingSuccess = (subsystemId: number) => {
    setConfiguredIds((prev) => new Set(prev).add(subsystemId));
    setActiveSubsystem(null);
  };

  if (loadingSubsystems) {
    return (
      <div className="wizard-step-content">
        <p>⏳ Ładowanie podsystemów...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="wizard-step-content">
        <div className="alert alert-error">{loadError}</div>
        <div className="success-actions">
          <button className="btn btn-secondary" onClick={onSkip}>
            Pomiń
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <h3>📦 Konfiguracja wysyłki</h3>
      <p>Kontrakt <strong>{contract.contractNumber || contract.customName}</strong> został utworzony.</p>
      <p>Wybierz podsystemy, dla których chcesz zlecić wysyłkę:</p>

      <ul className="success-summary" style={{ listStyle: 'none', padding: 0 }}>
        {subsystems.map((subsystem) => (
          <li
            key={subsystem.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}
          >
            <span>
              {configuredIds.has(subsystem.id) ? '✅' : '📦'}{' '}
              <strong>{subsystem.subsystemNumber}</strong> — {subsystem.systemType}
              {subsystem.tasks && ` (${subsystem.tasks.length} zadań)`}
            </span>
            <button
              className={`btn btn-sm ${configuredIds.has(subsystem.id) ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setActiveSubsystem(subsystem)}
            >
              {configuredIds.has(subsystem.id) ? '🔄 Ponów' : '📦 Zleć wysyłkę'}
            </button>
          </li>
        ))}
      </ul>

      <div className="success-actions" style={{ marginTop: '16px' }}>
        <button className="btn btn-secondary" onClick={onSkip}>
          Pomiń
        </button>
        <button className="btn btn-primary" onClick={onComplete}>
          ✅ Zakończ
        </button>
      </div>

      {activeSubsystem && (
        activeSubsystem.systemType === 'SMOKIP_A' ? (
          <ShipmentWizardSmokA
            subsystem={activeSubsystem}
            onClose={() => setActiveSubsystem(null)}
            onSuccess={() => handleShippingSuccess(activeSubsystem.id)}
          />
        ) : activeSubsystem.systemType === 'SMOKIP_B' ? (
          <ShipmentWizardSmokB
            subsystem={activeSubsystem}
            onClose={() => setActiveSubsystem(null)}
            onSuccess={() => handleShippingSuccess(activeSubsystem.id)}
          />
        ) : (
          <ShipmentWizardModal
            subsystem={activeSubsystem}
            onClose={() => setActiveSubsystem(null)}
            onSuccess={() => handleShippingSuccess(activeSubsystem.id)}
          />
        )
      )}
    </div>
  );
};
