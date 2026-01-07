// src/components/contracts/ContractWizardModal.tsx
// Multi-step wizard for creating contracts with multiple subsystems

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SUBSYSTEM_WIZARD_CONFIG, detectSubsystemTypes } from '../../config/subsystemWizardConfig';
import type { SubsystemType } from '../../config/subsystemWizardConfig';
import contractService from '../../services/contract.service';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface SubsystemWizardData {
  type: SubsystemType;
  params: Record<string, number | boolean>;
  taskDetails?: TaskDetail[];
}

interface TaskDetail {
  taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID';
  kilometraz?: string;
  kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F';
  nazwa?: string;
  miejscowosc?: string;
}

interface WizardData {
  // Step 1
  customName: string;
  orderDate: string;
  projectManagerId: string;
  managerCode: string;
  
  // Step 2+
  subsystems: SubsystemWizardData[];
}

interface GeneratedTask {
  number: string;
  name: string;
  type: string;
  subsystemType: SubsystemType;
}

export const ContractWizardModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedSubsystems, setDetectedSubsystems] = useState<SubsystemType[]>([]);
  
  const [wizardData, setWizardData] = useState<WizardData>({
    customName: '',
    orderDate: '',
    projectManagerId: user?.id?.toString() || '',
    managerCode: '',
    subsystems: []
  });
  
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);

  // Step 1: Detect subsystems from name
  const handleNameChange = (name: string) => {
    const detected = detectSubsystemTypes(name);
    setDetectedSubsystems(detected);
    setWizardData({
      ...wizardData,
      customName: name,
      subsystems: detected.map(type => ({ type, params: {} }))
    });
  };

  // Add a subsystem manually
  const addSubsystem = (type: SubsystemType) => {
    setWizardData({
      ...wizardData,
      subsystems: [...wizardData.subsystems, { type, params: {} }]
    });
  };

  // Remove a subsystem
  const removeSubsystem = (index: number) => {
    const newSubsystems = [...wizardData.subsystems];
    newSubsystems.splice(index, 1);
    setWizardData({
      ...wizardData,
      subsystems: newSubsystems
    });
  };

  // Update subsystem params
  const updateSubsystemParams = (index: number, params: Record<string, number | boolean>) => {
    const newSubsystems = [...wizardData.subsystems];
    newSubsystems[index].params = params;
    setWizardData({
      ...wizardData,
      subsystems: newSubsystems
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

  // Helper to get numeric value
  const getNumericValue = (params: Record<string, number | boolean>, key: string): number => {
    const value = params[key];
    return typeof value === 'number' ? value : 0;
  };

  // Helper to get boolean value
  const getBooleanValue = (params: Record<string, number | boolean>, key: string): boolean => {
    const value = params[key];
    return typeof value === 'boolean' ? value : false;
  };

  // Generate tasks for a single subsystem
  const generateTasksForSubsystem = (
    subsystem: SubsystemWizardData, 
    startIndex: number
  ): GeneratedTask[] => {
    const tasks: GeneratedTask[] = [];
    let taskIndex = startIndex;
    const params = subsystem.params;

    // SMOK-A specific
    if (subsystem.type === 'SMOKIP_A') {
      // Use task details if available, otherwise generate generic tasks
      if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
        subsystem.taskDetails.forEach((detail) => {
          let name = '';
          if (detail.taskType === 'PRZEJAZD_KAT_A' && detail.kilometraz && detail.kategoria) {
            name = `${detail.kilometraz} Km ${detail.kategoria}`;
          } else if (detail.taskType === 'SKP' && detail.kilometraz) {
            name = `${detail.kilometraz} Km SKP`;
          } else if (detail.taskType === 'NASTAWNIA') {
            name = detail.nazwa || 'Nastawnia';
            if (detail.miejscowosc) name = `Nastawnia ${detail.miejscowosc}`;
            if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
          } else if (detail.taskType === 'LCS') {
            name = detail.nazwa || 'LCS';
            if (detail.miejscowosc) name = `LCS ${detail.miejscowosc}`;
            if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
          } else if (detail.taskType === 'CUID') {
            name = detail.nazwa || 'CUID';
            if (detail.miejscowosc) name = `CUID ${detail.miejscowosc}`;
          } else {
            name = detail.taskType;
          }
          
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name,
            type: detail.taskType,
            subsystemType: subsystem.type
          });
        });
      } else {
        // Generic task generation
        for (let i = 0; i < getNumericValue(params, 'przejazdyKatA'); i++) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `Przejazd Kat A #${i + 1}`,
            type: 'PRZEJAZD_KAT_A',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(params, 'iloscSKP'); i++) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `SKP #${i + 1}`,
            type: 'SKP',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `Nastawnia #${i + 1}`,
            type: 'NASTAWNIA',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasLCS')) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `LCS (${getNumericValue(params, 'lcsMonitory')} monitorów, ${getNumericValue(params, 'lcsStanowiska')} stanowisk)`,
            type: 'LCS',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasCUID')) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: 'CUID',
            type: 'CUID',
            subsystemType: subsystem.type
          });
        }
      }
    }
    // SMOK-B specific
    else if (subsystem.type === 'SMOKIP_B') {
      if (subsystem.taskDetails && subsystem.taskDetails.length > 0) {
        subsystem.taskDetails.forEach((detail) => {
          let name = '';
          if (detail.taskType === 'PRZEJAZD_KAT_B' && detail.kilometraz && detail.kategoria) {
            name = `${detail.kilometraz} Km ${detail.kategoria}`;
          } else if (detail.taskType === 'NASTAWNIA') {
            name = detail.nazwa || 'Nastawnia';
            if (detail.miejscowosc) name = `Nastawnia ${detail.miejscowosc}`;
            if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
          } else if (detail.taskType === 'LCS') {
            name = detail.nazwa || 'LCS';
            if (detail.miejscowosc) name = `LCS ${detail.miejscowosc}`;
            if (detail.kilometraz) name += ` ${detail.kilometraz} Km`;
          } else if (detail.taskType === 'CUID') {
            name = detail.nazwa || 'CUID';
            if (detail.miejscowosc) name = `CUID ${detail.miejscowosc}`;
          } else {
            name = detail.taskType;
          }
          
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name,
            type: detail.taskType,
            subsystemType: subsystem.type
          });
        });
      } else {
        for (let i = 0; i < getNumericValue(params, 'przejazdyKatB'); i++) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `Przejazd Kat B #${i + 1}`,
            type: 'PRZEJAZD_KAT_B',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `Nastawnia #${i + 1}`,
            type: 'NASTAWNIA',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasLCS')) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: `LCS (${getNumericValue(params, 'lcsMonitory')} monitorów, ${getNumericValue(params, 'lcsStanowiska')} stanowisk)`,
            type: 'LCS',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasCUID')) {
          tasks.push({
            number: generateTaskNumber(taskIndex++),
            name: 'CUID',
            type: 'CUID',
            subsystemType: subsystem.type
          });
        }
      }
    }
    // SKD specific
    else if (subsystem.type === 'SKD') {
      for (let i = 0; i < getNumericValue(params, 'iloscBudynkow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Budynek SKD #${i + 1}`,
          type: 'BUDYNEK',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Kontener SKD #${i + 1}`,
          type: 'KONTENER',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscPrzejsc'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `Przejście #${i + 1}`,
          type: 'PRZEJSCIE',
          subsystemType: subsystem.type
        });
      }
    }
    // Default for other subsystems (SSWiN, CCTV, SMW, SDIP, SUG, SSP, LAN, OTK, ZASILANIE)
    else {
      const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
      const subsystemLabel = config?.label || 'Zadanie';
      for (let i = 0; i < getNumericValue(params, 'iloscBudynkow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `${subsystemLabel} - Budynek #${i + 1}`,
          type: 'BUDYNEK',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscPomieszczen'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `${subsystemLabel} - Pomieszczenie #${i + 1}`,
          type: 'POMIESZCZENIE',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
        tasks.push({
          number: generateTaskNumber(taskIndex++),
          name: `${subsystemLabel} - Kontener #${i + 1}`,
          type: 'KONTENER',
          subsystemType: subsystem.type
        });
      }
    }
    
    return tasks;
  };

  // Generate all tasks from all subsystems
  const generateAllTasks = (): GeneratedTask[] => {
    const allTasks: GeneratedTask[] = [];
    let taskIndex = 1;
    
    wizardData.subsystems.forEach((subsystem) => {
      const tasks = generateTasksForSubsystem(subsystem, taskIndex);
      allTasks.push(...tasks);
      taskIndex += tasks.length;
    });
    
    return allTasks;
  };

  // Calculate total number of steps dynamically
  const getTotalSteps = (): number => {
    // 1: Basic data
    // 2: Subsystem selection
    // For each subsystem: 1 config step + (1 details step if SMOK-A/B)
    // Preview step
    // Success step
    let steps = 3; // Basic + Selection + Preview
    wizardData.subsystems.forEach((subsystem) => {
      steps++; // Config step
      if (subsystem.type === 'SMOKIP_A' || subsystem.type === 'SMOKIP_B') {
        steps++; // Details step
      }
    });
    steps++; // Success
    return steps;
  };

  // Get current subsystem index and step type based on current step
  const getCurrentStepInfo = () => {
    if (currentStep === 1) return { type: 'basic' };
    if (currentStep === 2) return { type: 'selection' };
    
    let stepCount = 2;
    for (let i = 0; i < wizardData.subsystems.length; i++) {
      stepCount++; // Config step
      if (currentStep === stepCount) {
        return { type: 'config', subsystemIndex: i };
      }
      
      if (wizardData.subsystems[i].type === 'SMOKIP_A' || wizardData.subsystems[i].type === 'SMOKIP_B') {
        stepCount++; // Details step
        if (currentStep === stepCount) {
          return { type: 'details', subsystemIndex: i };
        }
      }
    }
    
    stepCount++; // Preview
    if (currentStep === stepCount) return { type: 'preview' };
    
    return { type: 'success' };
  };

  const handleNextStep = () => {
    const stepInfo = getCurrentStepInfo();
    
    if (stepInfo.type === 'preview') {
      // Generate tasks before moving to preview
      const tasks = generateAllTasks();
      setGeneratedTasks(tasks);
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!user || !user.id) {
      setError('Nie znaleziono aktualnego użytkownika');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Format data for backend
      const subsystemsData = wizardData.subsystems.map((subsystem) => {
        const subsystemTasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
        return {
          type: subsystem.type,
          params: subsystem.params,
          tasks: subsystemTasks.map(t => ({
            number: t.number,
            name: t.name,
            type: t.type
          }))
        };
      });

      await contractService.createContractWithWizard({
        customName: wizardData.customName,
        orderDate: wizardData.orderDate,
        projectManagerId: user.id,
        managerCode: wizardData.managerCode,
        subsystems: subsystemsData
      });
      
      setCurrentStep(getTotalSteps()); // Move to success step
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Błąd tworzenia kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    const stepInfo = getCurrentStepInfo();
    
    if (stepInfo.type === 'basic') {
      return wizardData.customName && wizardData.orderDate && 
             user && user.id && wizardData.managerCode.length === 3;
    }
    if (stepInfo.type === 'selection') {
      return wizardData.subsystems.length > 0;
    }
    if (stepInfo.type === 'preview') {
      return generatedTasks.length > 0;
    }
    return true;
  };

  const renderStepIndicator = () => {
    const totalSteps = getTotalSteps();
    const steps = [];
    
    // Show up to 6 steps in the indicator to avoid UI overflow
    // For contracts with many subsystems, this provides a simplified view
    const maxStepsToShow = 6;
    
    for (let i = 1; i <= Math.min(totalSteps, maxStepsToShow); i++) {
      let label = '';
      if (i === 1) label = 'Dane';
      else if (i === 2) label = 'Podsystemy';
      else if (i === totalSteps - 1) label = 'Podgląd';
      else if (i === totalSteps) label = 'Sukces';
      else label = `Krok ${i}`;
      
      steps.push(
        <div 
          key={i}
          className={`wizard-step ${currentStep === i ? 'active' : ''} ${currentStep > i ? 'completed' : ''}`}
        >
          <span className="step-number">{i}</span>
          <span className="step-label">{label}</span>
        </div>
      );
    }
    
    return <div className="wizard-steps">{steps}</div>;
  };

  const renderStep1 = () => (
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
        {detectedSubsystems.length > 0 && (
          <div className="detected-subsystem">
            ✅ Wykryto podsystemy: {detectedSubsystems.map(type => {
              const config = SUBSYSTEM_WIZARD_CONFIG[type];
              return config.label;
            }).join(', ')}
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
        <input
          type="text"
          className="form-control-readonly"
          value={user ? `${user.firstName} ${user.lastName} (${user.username})` : ''}
          disabled
          readOnly
        />
        <span className="text-muted">Automatycznie ustawiony na aktualnego użytkownika</span>
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

  const renderStep2 = () => {
    // Get all available subsystem types
    const availableTypes = Object.keys(SUBSYSTEM_WIZARD_CONFIG) as SubsystemType[];
    const unusedTypes = availableTypes.filter(
      type => !wizardData.subsystems.some(s => s.type === type)
    );

    return (
      <div className="wizard-step-content">
        <h3>Krok 2: Wybór/potwierdzenie podsystemów</h3>
        
        {wizardData.subsystems.length > 0 ? (
          <div className="subsystems-list">
            <p>Wykryte/wybrane podsystemy:</p>
            {wizardData.subsystems.map((subsystem, index) => {
              const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
              return (
                <div key={index} className="subsystem-item">
                  <span>{config.icon} {config.label}</span>
                  <button 
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => removeSubsystem(index)}
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
                  addSubsystem(e.target.value as SubsystemType);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Wybierz typ podsystemu...</option>
              {unusedTypes.map((type) => {
                const config = SUBSYSTEM_WIZARD_CONFIG[type];
                return (
                  <option key={type} value={type}>
                    {config.icon} {config.label}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    );
  };

  const renderConfigStep = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    
    return (
      <div className="wizard-step-content">
        <h3>Konfiguracja: {config.icon} {config.label}</h3>
        
        {config.fields.map((field) => {
          const paramValue = subsystem.params[field.name];
          
          // Check dependency
          if (field.dependsOn && !subsystem.params[field.dependsOn]) {
            return null;
          }
          
          return (
            <div className="form-group" key={field.name}>
              <label>{field.label}</label>
              {field.type === 'number' && (
                <input
                  type="number"
                  min={0}
                  value={typeof paramValue === 'number' ? paramValue : 0}
                  onChange={(e) => {
                    const newParams = { ...subsystem.params };
                    newParams[field.name] = parseInt(e.target.value) || 0;
                    updateSubsystemParams(subsystemIndex, newParams);
                  }}
                />
              )}
              {field.type === 'checkbox' && (
                <input
                  type="checkbox"
                  checked={typeof paramValue === 'boolean' ? paramValue : false}
                  onChange={(e) => {
                    const newParams = { ...subsystem.params };
                    newParams[field.name] = e.target.checked;
                    updateSubsystemParams(subsystemIndex, newParams);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailsStep = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    
    // For now, show a placeholder for details step
    // In a full implementation, this would have detailed forms for each task
    return (
      <div className="wizard-step-content">
        <h3>Szczegóły zadań: {config.icon} {config.label}</h3>
        <p className="info-text">
          Szczegółowe informacje o zadaniach (kilometraż, kategorie) można edytować po utworzeniu kontraktu.
        </p>
        <p className="info-text">
          Zadania zostaną utworzone na podstawie konfiguracji z poprzedniego kroku.
        </p>
      </div>
    );
  };

  const renderPreview = () => {
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
          {tasksBySubsystem.map(({ config, tasks }, index) => (
            <div key={index} className="subsystem-tasks">
              <h4>{config.icon} {config.label} ({tasks.length} zadań)</h4>
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
                        <td><code>{task.number}</code></td>
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

  const renderSuccess = () => {
    const tasksBySubsystem = wizardData.subsystems.map((subsystem) => {
      const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
      const tasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
      return { config, tasks };
    });

    return (
      <div className="wizard-step-content wizard-success">
        <div className="success-icon">✅</div>
        <h3>Kontrakt utworzony!</h3>
        <p>Utworzono kontrakt z {wizardData.subsystems.length} podsystemami:</p>
        <ul className="success-summary">
          {tasksBySubsystem.map(({ config, tasks }, index) => (
            <li key={index}>
              {config.icon} {config.label} ({tasks.length} zadań)
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
  };

  const renderCurrentStep = () => {
    const stepInfo = getCurrentStepInfo();
    
    if (stepInfo.type === 'basic') return renderStep1();
    if (stepInfo.type === 'selection') return renderStep2();
    if (stepInfo.type === 'config' && stepInfo.subsystemIndex !== undefined) {
      return renderConfigStep(stepInfo.subsystemIndex);
    }
    if (stepInfo.type === 'details' && stepInfo.subsystemIndex !== undefined) {
      return renderDetailsStep(stepInfo.subsystemIndex);
    }
    if (stepInfo.type === 'preview') return renderPreview();
    if (stepInfo.type === 'success') return renderSuccess();
    
    return null;
  };

  const stepInfo = getCurrentStepInfo();
  const isLastStep = stepInfo.type === 'success';

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
          {renderCurrentStep()}
        </div>
        
        {!isLastStep && (
          <div className="modal-footer">
            {currentStep > 1 && (
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                ← Wstecz
              </button>
            )}
            <div className="footer-spacer"></div>
            {stepInfo.type !== 'preview' && (
              <button 
                className="btn btn-primary" 
                onClick={handleNextStep}
                disabled={!canProceed()}
              >
                Dalej →
              </button>
            )}
            {stepInfo.type === 'preview' && (
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
