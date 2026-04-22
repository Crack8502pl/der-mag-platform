import React, { useState, useEffect, useMemo } from 'react';
import type { ExtendWizardModalProps, ExtendStepInfo } from './types/extend-wizard.types';
import './ContractWizardModal.css';

const ALLOWED_STATUSES = ['CREATED', 'IN_PROGRESS'] as const;
const MAX_STEP = 7;

export const ExtendWizardModal: React.FC<ExtendWizardModalProps> = ({ contract, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);

  const error = useMemo(
    () => !ALLOWED_STATUSES.includes(contract.status as typeof ALLOWED_STATUSES[number])
      ? `Nie można rozszerzyć kontraktu w statusie: ${contract.status}`
      : '',
    [contract.status]
  );

  useEffect(() => {
    if (!ALLOWED_STATUSES.includes(contract.status as typeof ALLOWED_STATUSES[number])) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [contract.status, onClose]);

  const getStepInfo = (step: number): ExtendStepInfo => {
    if (step === 1) return { type: 'review' };
    if (step === 2) return { type: 'subsystems-overview' };
    if (step === MAX_STEP) return { type: 'success' };
    return { type: 'config' };
  };

  const renderStep = () => {
    const info = getStepInfo(currentStep);
    if (info.type === 'review') return <div><h2>Przegląd</h2><p>{contract.contractNumber}</p></div>;
    if (info.type === 'success') return <div><h2>Sukces</h2><button onClick={onSuccess}>OK</button></div>;
    return <div><p>TODO: {info.type}</p></div>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Rozszerzanie: {contract.contractNumber}</h2>
        {error && <div className="alert-error">{error}</div>}
        {renderStep()}
        <button onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}>Wstecz</button>
        <button onClick={() => setCurrentStep(Math.min(MAX_STEP, currentStep + 1))}>Dalej</button>
      </div>
    </div>
  );
};
