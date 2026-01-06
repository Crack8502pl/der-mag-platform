// src/components/contracts/ContractWizardModal.tsx
// Multi-step wizard for creating contracts with subsystems

import React, { useState } from 'react';
import { SUBSYSTEM_WIZARD_CONFIG, detectSubsystemType } from '../../config/subsystemWizardConfig';
import type { SubsystemType } from '../../config/subsystemWizardConfig';
import contractService from '../../services/contract.service';

interface Props {
  managers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

interface WizardData {
  // Step 1
  customName: string;
  orderDate: string;
  projectManagerId: string;
  managerCode: string;
  detectedSubsystem: SubsystemType | null;
  
  // Step 2 - dynamic fields
  subsystemParams: {
    [key: string]: number | boolean;
  };
}

interface GeneratedTask {
  number: string;
  name: string;
  type: string;
}

export const ContractWizardModal: React.FC<Props> = ({ managers, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [wizardData, setWizardData] = useState<WizardData>({
    customName: '',
    orderDate: '',
    projectManagerId: '',
    managerCode: '',
    detectedSubsystem: null,
    subsystemParams: {}
  });
  
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);

  // Step 1: Detect subsystem from name
  const handleNameChange = (name: string) => {
    const detected = detectSubsystemType(name);
    setWizardData({
      ...wizardData,
      customName: name,
      detectedSubsystem: detected
    });
  };

  // Generate task number in format P{XXXXX}{MM}{RR}
  const generateTaskNumber = (index: number): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const number = String(index).padStart(5, '0');
    return `P${number}${month}${year}`;
  };

  // Generate tasks based on subsystem config
  const generateTasks = (): GeneratedTask[] => {
    const tasks: GeneratedTask[] = [];
    let taskIndex = 1;
    
    const config = wizardData.detectedSubsystem 
      ? SUBSYSTEM_WIZARD_CONFIG[wizardData.detectedSubsystem]
      : SUBSYSTEM_WIZARD_CONFIG.DEFAULT;
    
    const params = wizardData.subsystemParams;
    
    // Helper to get numeric value
    const getNumericValue = (key: string): number => {
      const value = params[key];
      return typeof value === 'number' ? value : 0;
    };
    
    // Helper to get boolean value
    const getBooleanValue = (key: string): boolean => {
      const value = params[key];
      return typeof value === 'boolean' ? value : false;
    };
    
    // SMOK-A specific
    if (wizardData.detectedSubsystem === 'SMOKIP_A') {
      // Przejazdy Kat A
      for (let i = 0; i < getNumericValue('przejazdyKatA'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Przejazd Kat A #${i + 1}`,
          type: 'PRZEJAZD_KAT_A'
        });
      }
      // SKP
      for (let i = 0; i < getNumericValue('iloscSKP'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `SKP #${i + 1}`,
          type: 'SKP'
        });
      }
      // Nastawnie
      for (let i = 0; i < getNumericValue('iloscNastawni'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Nastawnia #${i + 1}`,
          type: 'NASTAWNIA'
        });
      }
      // LCS
      if (getBooleanValue('hasLCS')) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `LCS (${getNumericValue('lcsMonitory')} monitorów, ${getNumericValue('lcsStanowiska')} stanowisk)`,
          type: 'LCS'
        });
      }
      // CUID
      if (getBooleanValue('hasCUID')) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: 'CUID',
          type: 'CUID'
        });
      }
    }
    // SMOK-B specific
    else if (wizardData.detectedSubsystem === 'SMOKIP_B') {
      // Przejazdy Kat B
      for (let i = 0; i < getNumericValue('przejazdyKatB'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Przejazd Kat B #${i + 1}`,
          type: 'PRZEJAZD_KAT_B'
        });
      }
      // Nastawnie
      for (let i = 0; i < getNumericValue('iloscNastawni'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Nastawnia #${i + 1}`,
          type: 'NASTAWNIA'
        });
      }
      // LCS
      if (getBooleanValue('hasLCS')) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `LCS (${getNumericValue('lcsMonitory')} monitorów, ${getNumericValue('lcsStanowiska')} stanowisk)`,
          type: 'LCS'
        });
      }
      // CUID
      if (getBooleanValue('hasCUID')) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: 'CUID',
          type: 'CUID'
        });
      }
    }
    // SKD specific
    else if (wizardData.detectedSubsystem === 'SKD') {
      for (let i = 0; i < getNumericValue('iloscBudynkow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Budynek SKD #${i + 1}`,
          type: 'BUDYNEK'
        });
      }
      for (let i = 0; i < getNumericValue('iloscKontenerow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Kontener SKD #${i + 1}`,
          type: 'KONTENER'
        });
      }
      for (let i = 0; i < getNumericValue('iloscPrzejsc'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Przejście #${i + 1}`,
          type: 'PRZEJSCIE'
        });
      }
    }
    // Default (SSWiN, CCTV, SMW, SDIP, SUG, SSP, LAN, OTK, ZASILANIE)
    else {
      const subsystemLabel = config?.label || 'Zadanie';
      for (let i = 0; i < getNumericValue('iloscBudynkow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `${subsystemLabel} - Budynek #${i + 1}`,
          type: 'BUDYNEK'
        });
      }
      for (let i = 0; i < getNumericValue('iloscPomieszczen'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `${subsystemLabel} - Pomieszczenie #${i + 1}`,
          type: 'POMIESZCZENIE'
        });
      }
      for (let i = 0; i < getNumericValue('iloscKontenerow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `${subsystemLabel} - Kontener #${i + 1}`,
          type: 'KONTENER'
        });
      }
    }
    
    return tasks;
  };

  const handleNextStep = () => {
    if (currentStep === 2) {
      // Generate tasks preview
      const tasks = generateTasks();
      setGeneratedTasks(tasks);
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Create contract via wizard endpoint
      await contractService.createContractWithWizard({
        customName: wizardData.customName,
        orderDate: wizardData.orderDate,
        projectManagerId: parseInt(wizardData.projectManagerId),
        managerCode: wizardData.managerCode,
        subsystemType: wizardData.detectedSubsystem,
        subsystemParams: wizardData.subsystemParams,
        tasks: generatedTasks
      });
      
      // Success, move to step 4
      setCurrentStep(4);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Błąd tworzenia kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="wizard-steps">
      {[1, 2, 3, 4].map((step) => (
        <div 
          key={step}
          className={`wizard-step ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
        >
          <span className="step-number">{step}</span>
          <span className="step-label">
            {step === 1 && 'Dane'}
            {step === 2 && 'Podsystem'}
            {step === 3 && 'Podgląd'}
            {step === 4 && 'Sukces'}
          </span>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => {
    const config = wizardData.detectedSubsystem 
      ? SUBSYSTEM_WIZARD_CONFIG[wizardData.detectedSubsystem]
      : null;
    
    return (
      <div className="wizard-step-content">
        <h3>Krok 1: Dane podstawowe</h3>
        
        <div className="form-group">
          <label>Nazwa kontraktu *</label>
          <input
            type="text"
            value={wizardData.customName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="np. Modernizacja SMOK-A Warszawa"
          />
          {wizardData.detectedSubsystem && (
            <div className="detected-subsystem">
              ✅ Wykryto: <strong>{config?.label}</strong>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label>Data zamówienia *</label>
          <input
            type="date"
            value={wizardData.orderDate}
            onChange={(e) => setWizardData({...wizardData, orderDate: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label>Kierownik projektu *</label>
          <select
            value={wizardData.projectManagerId}
            onChange={(e) => setWizardData({...wizardData, projectManagerId: e.target.value})}
          >
            <option value="">Wybierz kierownika...</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Kod kierownika (3 znaki) *</label>
          <input
            type="text"
            value={wizardData.managerCode}
            onChange={(e) => setWizardData({...wizardData, managerCode: e.target.value.toUpperCase().slice(0, 3)})}
            maxLength={3}
            placeholder="np. ABC"
          />
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const config = wizardData.detectedSubsystem 
      ? SUBSYSTEM_WIZARD_CONFIG[wizardData.detectedSubsystem]
      : SUBSYSTEM_WIZARD_CONFIG.DEFAULT;
    
    return (
      <div className="wizard-step-content">
        <h3>Krok 2: Konfiguracja {config.label}</h3>
        
        {config.fields.map((field) => {
          const paramValue = wizardData.subsystemParams[field.name];
          
          // Check dependency
          if (field.dependsOn && !wizardData.subsystemParams[field.dependsOn]) {
            return null;
          }
          
          return (
            <div className="form-group" key={field.name}>
              <label>{field.label}</label>
              {field.type === 'number' && (
                <input
                  type="number"
                  min={0}
                  value={
                    typeof paramValue === 'number' ? paramValue : 0
                  }
                  onChange={(e) => setWizardData({
                    ...wizardData,
                    subsystemParams: {
                      ...wizardData.subsystemParams,
                      [field.name]: parseInt(e.target.value) || 0
                    }
                  })}
                />
              )}
              {field.type === 'checkbox' && (
                <input
                  type="checkbox"
                  checked={
                    typeof paramValue === 'boolean' ? paramValue : false
                  }
                  onChange={(e) => setWizardData({
                    ...wizardData,
                    subsystemParams: {
                      ...wizardData.subsystemParams,
                      [field.name]: e.target.checked
                    }
                  })}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="wizard-step-content">
      <h3>Krok 3: Podgląd zadań</h3>
      
      <div className="tasks-preview">
        {generatedTasks.length === 0 ? (
          <p className="no-tasks">Brak zadań do wygenerowania. Sprawdź konfigurację podsystemu.</p>
        ) : (
          <>
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Numer</th>
                  <th>Nazwa zadania</th>
                </tr>
              </thead>
              <tbody>
                {generatedTasks.map((task, index) => (
                  <tr key={index}>
                    <td><code>{task.number}</code></td>
                    <td>{task.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tasks-summary">
              <strong>Łącznie: {generatedTasks.length} zadań</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="wizard-step-content wizard-success">
      <div className="success-icon">✅</div>
      <h3>Kontrakt utworzony!</h3>
      <p>Kontrakt został pomyślnie utworzony wraz z {generatedTasks.length} zadaniami.</p>
      <div className="success-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Zamknij
        </button>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            onSuccess();
            onClose();
          }}
        >
          Przejdź do kontraktu
        </button>
      </div>
    </div>
  );

  const canProceed = () => {
    if (currentStep === 1) {
      return wizardData.customName && wizardData.orderDate && 
             wizardData.projectManagerId && wizardData.managerCode.length === 3;
    }
    if (currentStep === 2) {
      return true; // Can proceed with any config
    }
    if (currentStep === 3) {
      return generatedTasks.length > 0;
    }
    return false;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🧙‍♂️ Kreator Kontraktu</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        {renderStepIndicator()}
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <div className="modal-body">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
        
        {currentStep < 4 && (
          <div className="modal-footer">
            {currentStep > 1 && (
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                ← Wstecz
              </button>
            )}
            <div className="footer-spacer"></div>
            {currentStep < 3 && (
              <button 
                className="btn btn-primary" 
                onClick={handleNextStep}
                disabled={!canProceed()}
              >
                Dalej →
              </button>
            )}
            {currentStep === 3 && (
              <button 
                className="btn btn-success" 
                onClick={handleSubmit}
                disabled={loading || generatedTasks.length === 0}
              >
                {loading ? 'Tworzenie...' : '✅ Utwórz kontrakt'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
