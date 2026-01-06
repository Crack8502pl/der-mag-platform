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

interface TaskDetail {
  index: number;
  type: string;
  name: string;           // Wprowadzona przez użytkownika nazwa
  kilometer?: string;     // Format: XXX,XXX
  category?: string;      // Dla przejazdów: KAT A, KAT F, KAT B, KAT C, KAT E
  location?: string;      // Dla nastawni, LCS, CUID
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
  const [taskDetails, setTaskDetails] = useState<TaskDetail[]>([]);

  // Helper functions for dynamic steps
  const getTotalSteps = () => {
    // SMOK-A i SMOK-B mają 5 kroków (dodatkowy krok szczegółów)
    if (wizardData.detectedSubsystem === 'SMOKIP_A' || wizardData.detectedSubsystem === 'SMOKIP_B') {
      return 5;
    }
    // Inne podsystemy mają 4 kroki
    return 4;
  };

  const getStepLabel = (step: number) => {
    const totalSteps = getTotalSteps();
    
    if (totalSteps === 5) {
      // SMOK-A/SMOK-B
      if (step === 1) return 'Dane';
      if (step === 2) return 'Ilości';
      if (step === 3) return 'Szczegóły';
      if (step === 4) return 'Podgląd';
      if (step === 5) return 'Sukces';
    } else {
      // Inne
      if (step === 1) return 'Dane';
      if (step === 2) return 'Podsystem';
      if (step === 3) return 'Podgląd';
      if (step === 4) return 'Sukces';
    }
    return '';
  };

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

  // Generate tasks with detailed names (for SMOK-A/SMOK-B)
  const generateTasksWithDetails = (): GeneratedTask[] => {
    const tasks: GeneratedTask[] = [];
    let taskIndex = 1;
    
    taskDetails.forEach((detail) => {
      let taskName = '';
      
      if (detail.type === 'PRZEJAZD_KAT_A' || detail.type === 'PRZEJAZD_KAT_B') {
        taskName = `${detail.kilometer} Km ${detail.category}`;
      } else if (detail.type === 'SKP') {
        taskName = `${detail.kilometer} Km SKP`;
      } else if (detail.type === 'NASTAWNIA' || detail.type === 'LCS' || detail.type === 'CUID') {
        taskName = detail.location || '';
        if (detail.kilometer) {
          taskName += ` ${detail.kilometer} Km`;
        }
      }
      
      tasks.push({
        number: generateTaskNumber(taskIndex++),
        name: taskName,
        type: detail.type
      });
    });
    
    return tasks;
  };

  const handleNextStep = () => {
    const totalSteps = getTotalSteps();
    
    // Dla SMOK-A/SMOK-B:
    if (totalSteps === 5) {
      if (currentStep === 2) {
        // Po kroku 2 (ilości) - nie generuj jeszcze zadań, tylko przejdź do szczegółów
        setCurrentStep(3);
        return;
      }
      if (currentStep === 3) {
        // Po kroku 3 (szczegóły) - teraz generuj zadania z nazwami
        const tasks = generateTasksWithDetails();
        setGeneratedTasks(tasks);
        setCurrentStep(4);
        return;
      }
    } else {
      // Inne podsystemy - stara logika
      if (currentStep === 2) {
        const tasks = generateTasks();
        setGeneratedTasks(tasks);
      }
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
      
      // Success, move to final step
      setCurrentStep(getTotalSteps());
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Błąd tworzenia kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const totalSteps = getTotalSteps();
    
    return (
      <div className="wizard-steps">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div 
            key={step}
            className={`wizard-step ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
          >
            <span className="step-number">{step}</span>
            <span className="step-label">{getStepLabel(step)}</span>
          </div>
        ))}
      </div>
    );
  };

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

  const renderStep3DetailsSMOK = () => {
    // Przygotuj listę zadań do wypełnienia
    const tasksToFill: TaskDetail[] = [];
    const params = wizardData.subsystemParams;
    
    let taskIndex = 0;
    
    if (wizardData.detectedSubsystem === 'SMOKIP_A') {
      // Przejazdy Kat A
      const przejazdyKatA = typeof params.przejazdyKatA === 'number' ? params.przejazdyKatA : 0;
      for (let i = 0; i < przejazdyKatA; i++) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'PRZEJAZD_KAT_A',
          name: '',
          kilometer: '',
          category: 'KAT A' // Default
        });
      }
      
      // SKP
      const iloscSKP = typeof params.iloscSKP === 'number' ? params.iloscSKP : 0;
      for (let i = 0; i < iloscSKP; i++) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'SKP',
          name: '',
          kilometer: ''
        });
      }
      
      // Nastawnie
      const iloscNastawni = typeof params.iloscNastawni === 'number' ? params.iloscNastawni : 0;
      for (let i = 0; i < iloscNastawni; i++) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'NASTAWNIA',
          name: '',
          location: '',
          kilometer: ''
        });
      }
      
      // LCS
      if (params.hasLCS) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'LCS',
          name: '',
          location: '',
          kilometer: ''
        });
      }
      
      // CUID
      if (params.hasCUID) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'CUID',
          name: '',
          location: '',
          kilometer: ''
        });
      }
    } 
    else if (wizardData.detectedSubsystem === 'SMOKIP_B') {
      // Przejazdy Kat B
      const przejazdyKatB = typeof params.przejazdyKatB === 'number' ? params.przejazdyKatB : 0;
      for (let i = 0; i < przejazdyKatB; i++) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'PRZEJAZD_KAT_B',
          name: '',
          kilometer: '',
          category: 'KAT B' // Default
        });
      }
      
      // Nastawnie
      const iloscNastawni = typeof params.iloscNastawni === 'number' ? params.iloscNastawni : 0;
      for (let i = 0; i < iloscNastawni; i++) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'NASTAWNIA',
          name: '',
          location: '',
          kilometer: ''
        });
      }
      
      // LCS
      if (params.hasLCS) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'LCS',
          name: '',
          location: '',
          kilometer: ''
        });
      }
      
      // CUID
      if (params.hasCUID) {
        tasksToFill.push({
          index: taskIndex++,
          type: 'CUID',
          name: '',
          location: '',
          kilometer: ''
        });
      }
    }
    
    // Inicjalizuj taskDetails jeśli puste
    if (taskDetails.length === 0) {
      setTaskDetails(tasksToFill);
    }
    
    const updateTaskDetail = (index: number, field: keyof TaskDetail, value: string) => {
      setTaskDetails(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    };
    
    const getTaskTypeLabel = (type: string) => {
      if (type === 'PRZEJAZD_KAT_A') return 'Przejazd SMOK-A';
      if (type === 'PRZEJAZD_KAT_B') return 'Przejazd SMOK-B';
      if (type === 'SKP') return 'SKP';
      if (type === 'NASTAWNIA') return 'Nastawnia';
      if (type === 'LCS') return 'LCS';
      if (type === 'CUID') return 'CUID';
      return type;
    };
    
    return (
      <div className="wizard-step-content">
        <h3>Krok 3: Szczegóły nazw zadań</h3>
        <p className="step-description">
          Wprowadź szczegółowe nazwy dla każdego zadania zgodnie z wymaganiami.
        </p>
        
        <div className="task-details-form">
          {taskDetails.map((task, idx) => (
            <div key={idx} className="task-detail-card">
              <h4>
                {getTaskTypeLabel(task.type)} #{idx + 1}
              </h4>
              
              {/* Przejazdy - kilometer + kategoria */}
              {(task.type === 'PRZEJAZD_KAT_A' || task.type === 'PRZEJAZD_KAT_B') && (
                <>
                  <div className="form-group">
                    <label>Kilometraż (XXX,XXX) *</label>
                    <input
                      type="text"
                      placeholder="np. 123,456"
                      value={task.kilometer || ''}
                      onChange={(e) => updateTaskDetail(idx, 'kilometer', e.target.value)}
                    />
                    <small className="form-hint">Format: XXX,XXX (z przecinkiem)</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Kategoria *</label>
                    <select
                      value={task.category || ''}
                      onChange={(e) => updateTaskDetail(idx, 'category', e.target.value)}
                    >
                      {task.type === 'PRZEJAZD_KAT_A' && (
                        <>
                          <option value="KAT A">KAT A</option>
                          <option value="KAT F">KAT F</option>
                        </>
                      )}
                      {task.type === 'PRZEJAZD_KAT_B' && (
                        <>
                          <option value="KAT B">KAT B</option>
                          <option value="KAT C">KAT C</option>
                          <option value="KAT E">KAT E</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div className="generated-name">
                    <strong>Wygenerowana nazwa:</strong>
                    <code>{task.kilometer && task.category ? `${task.kilometer} Km ${task.category}` : '(wprowadź dane)'}</code>
                  </div>
                </>
              )}
              
              {/* SKP - tylko kilometraż */}
              {task.type === 'SKP' && (
                <>
                  <div className="form-group">
                    <label>Kilometraż (XXX,XXX) *</label>
                    <input
                      type="text"
                      placeholder="np. 234,567"
                      value={task.kilometer || ''}
                      onChange={(e) => updateTaskDetail(idx, 'kilometer', e.target.value)}
                    />
                    <small className="form-hint">Format: XXX,XXX (z przecinkiem)</small>
                  </div>
                  
                  <div className="generated-name">
                    <strong>Wygenerowana nazwa:</strong>
                    <code>{task.kilometer ? `${task.kilometer} Km SKP` : '(wprowadź dane)'}</code>
                  </div>
                </>
              )}
              
              {/* Nastawnia, LCS, CUID - lokalizacja + opcjonalny kilometraż */}
              {(task.type === 'NASTAWNIA' || task.type === 'LCS' || task.type === 'CUID') && (
                <>
                  <div className="form-group">
                    <label>{task.type === 'NASTAWNIA' ? 'Nazwa nastawni/Miejscowość' : 'Nazwa/Miejscowość'} *</label>
                    <input
                      type="text"
                      placeholder={task.type === 'NASTAWNIA' ? 'np. Nastawnia Warszawa Centralna' : 'np. LCS Poznań'}
                      value={task.location || ''}
                      onChange={(e) => updateTaskDetail(idx, 'location', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Kilometraż (opcjonalnie)</label>
                    <input
                      type="text"
                      placeholder="np. 100,500"
                      value={task.kilometer || ''}
                      onChange={(e) => updateTaskDetail(idx, 'kilometer', e.target.value)}
                    />
                    <small className="form-hint">Format: XXX,XXX (z przecinkiem)</small>
                  </div>
                  
                  <div className="generated-name">
                    <strong>Wygenerowana nazwa:</strong>
                    <code>
                      {task.location 
                        ? `${task.location}${task.kilometer ? ' ' + task.kilometer + ' Km' : ''}`
                        : '(wprowadź dane)'}
                    </code>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
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
    if (currentStep === 3 && getTotalSteps() === 5) {
      // SMOK-A/SMOK-B: waliduj czy wszystkie wymagane pola są wypełnione
      return taskDetails.every(task => {
        if (task.type === 'PRZEJAZD_KAT_A' || task.type === 'PRZEJAZD_KAT_B') {
          return task.kilometer && task.category;
        }
        if (task.type === 'SKP') {
          return task.kilometer;
        }
        if (task.type === 'NASTAWNIA' || task.type === 'LCS' || task.type === 'CUID') {
          return task.location; // Kilometraż opcjonalny
        }
        return false;
      });
    }
    
    const previewStep = getTotalSteps() === 5 ? 4 : 3;
    if (currentStep === previewStep) {
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
          
          {/* SMOK-A/SMOK-B: krok 3 = szczegóły, krok 4 = podgląd, krok 5 = sukces */}
          {getTotalSteps() === 5 && currentStep === 3 && renderStep3DetailsSMOK()}
          {getTotalSteps() === 5 && currentStep === 4 && renderStep3()}
          {getTotalSteps() === 5 && currentStep === 5 && renderStep4()}
          
          {/* Inne podsystemy: krok 3 = podgląd, krok 4 = sukces */}
          {getTotalSteps() === 4 && currentStep === 3 && renderStep3()}
          {getTotalSteps() === 4 && currentStep === 4 && renderStep4()}
        </div>
        
        {currentStep < getTotalSteps() && (
          <div className="modal-footer">
            {currentStep > 1 && (
              <button className="btn btn-secondary" onClick={handlePrevStep}>
                ← Wstecz
              </button>
            )}
            <div className="footer-spacer"></div>
            {currentStep < getTotalSteps() - 1 && (
              <button 
                className="btn btn-primary" 
                onClick={handleNextStep}
                disabled={!canProceed()}
              >
                Dalej →
              </button>
            )}
            {currentStep === getTotalSteps() - 1 && (
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
