// src/components/contracts/wizard/ContractWizardModal.tsx
// Main orchestrator for contract wizard - coordinates all step components

import React, { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import contractService from '../../../services/contract.service';
// SUBSYSTEM_WIZARD_CONFIG imported in child components
import { useWizardState } from './hooks/useWizardState';
import { generateAllTasks, buildTaskNameFromDetails } from './utils/taskGenerator';
import { validateUniqueIPPools } from './utils/validation';
import type { WizardProps, GeneratedTask } from './types/wizard.types';

// Step Components
import { BasicDataStep } from './steps/BasicDataStep';
import { SubsystemSelectionStep } from './steps/SubsystemSelectionStep';
import { PreviewStep } from './steps/PreviewStep';
import { SuccessStep } from './steps/SuccessStep';

// Subsystem Config Components
import { SmokipAConfigStep } from './subsystems/smokip-a/SmokipAConfigStep';
import { SmokipADetailsStep } from './subsystems/smokip-a/SmokipADetailsStep';
import { SmokipBConfigStep } from './subsystems/smokip-b/SmokipBConfigStep';
import { SmokipBDetailsStep } from './subsystems/smokip-b/SmokipBDetailsStep';
import { SkdConfigStep } from './subsystems/skd/SkdConfigStep';
import { SmwConfigStep } from './subsystems/smw/SmwConfigStep';
import { SswinConfigStep } from './subsystems/sswin/SswinConfigStep';
import { CctvConfigStep } from './subsystems/cctv/CctvConfigStep';
import { SdipConfigStep } from './subsystems/sdip/SdipConfigStep';
import { SugConfigStep } from './subsystems/sug/SugConfigStep';
import { SspConfigStep } from './subsystems/ssp/SspConfigStep';
import { LanConfigStep } from './subsystems/lan/LanConfigStep';
import { OtkConfigStep } from './subsystems/otk/OtkConfigStep';
import { ZasilanieConfigStep } from './subsystems/zasilanie/ZasilanieConfigStep';

import '../../../styles/grover-theme.css';

export const ContractWizardModal: React.FC<WizardProps> = ({ 
  onClose, 
  onSuccess, 
  editMode = false,
  contractToEdit
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  
  // Initialize wizard state using custom hook
  const {
    wizardData,
    detectedSubsystems,
    detectSubsystems,
    addSubsystem,
    removeSubsystem,
    initializeTaskDetails,
    updateTaskDetail,
    addTaskDetail,
    removeTaskDetail,
    handleKilometrazInput,
    handleKilometrazBlur,
    canProceedFromDetails,
    updateWizardData
  } = useWizardState({
    initialUserId: user?.id?.toString() || '',
    initialEmployeeCode: user?.employeeCode || '',
    editMode,
    contractToEdit
  });

  const getTotalSteps = (): number => {
    let steps = 3; // Basic + Selection + Preview
    wizardData.subsystems.forEach((s) => {
      steps += (s.type === 'SMOKIP_A' || s.type === 'SMOKIP_B') ? 2 : 1;
    });
    return steps + 1; // +1 for Success
  };

  const getStepInfo = (step: number) => {
    if (step === 1) return { type: 'basic' as const };
    if (step === 2) return { type: 'selection' as const };
    
    let stepCount = 2;
    for (let i = 0; i < wizardData.subsystems.length; i++) {
      const hasDetails = wizardData.subsystems[i].type === 'SMOKIP_A' || wizardData.subsystems[i].type === 'SMOKIP_B';
      if (step === ++stepCount) return { type: 'config' as const, subsystemIndex: i };
      if (hasDetails && step === ++stepCount) return { type: 'details' as const, subsystemIndex: i };
      if (!hasDetails) stepCount--; // Undo increment
    }
    
    return step === ++stepCount ? { type: 'preview' as const } : { type: 'success' as const };
  };

  const getCurrentStepInfo = () => getStepInfo(currentStep);

  const handleNextStep = () => {
    const stepInfo = getCurrentStepInfo();
    
    // Validate IP pools before Preview
    if (getStepInfo(currentStep + 1).type === 'preview') {
      const validation = validateUniqueIPPools(wizardData.subsystems);
      if (!validation.valid) {
        setError(validation.error!);
        return;
      }
      setGeneratedTasks(generateAllTasks(wizardData.subsystems, wizardData.liniaKolejowa));
    }
    
    // Initialize taskDetails for SMOKIP when leaving config step
    if (stepInfo.type === 'config' && stepInfo.subsystemIndex !== undefined) {
      const subsystem = wizardData.subsystems[stepInfo.subsystemIndex];
      if ((subsystem.type === 'SMOKIP_A' || subsystem.type === 'SMOKIP_B') && 
          (!subsystem.taskDetails || subsystem.taskDetails.length === 0)) {
        initializeTaskDetails(stepInfo.subsystemIndex);
      }
    }
    
    setCurrentStep(currentStep + 1);
    setError('');
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  /**
   * Handle final submission (create or update contract)
   */
  const handleSubmit = async () => {
    console.log('🔍 handleSubmit called');
    console.log('wizardData:', wizardData);
    console.log('generatedTasks:', generatedTasks);
    
    if (!wizardData.projectManagerId) {
      setError('Nie wybrano kierownika projektu');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('📤 Submitting wizard data...');
      
      if (editMode && contractToEdit) {
        // EDIT MODE - update contract
        
        // 1. Update basic contract data
        await contractService.updateContract(contractToEdit.id, {
          contractNumber: wizardData.contractNumber || undefined,
          customName: wizardData.customName,
          orderDate: wizardData.orderDate,
          projectManagerId: parseInt(wizardData.projectManagerId),
          managerCode: wizardData.managerCode,
          liniaKolejowa: wizardData.liniaKolejowa || undefined
        });
        
        // 2. Add only NEW subsystems (without isExisting flag)
        const newSubsystems = wizardData.subsystems.filter(s => !s.isExisting);
        
        if (newSubsystems.length > 0) {
          const subsystemsData = newSubsystems.map((subsystem) => {
            const subsystemTasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
            return {
              type: subsystem.type,
              params: subsystem.params,
              ipPool: subsystem.ipPool,
              tasks: subsystemTasks.map(t => ({
                number: t.number,
                name: t.name,
                type: t.type
              }))
            };
          });
          
          await contractService.addSubsystemsToContract(contractToEdit.id, {
            subsystems: subsystemsData
          });
        }
        
        // 3. For existing subsystems - add only NEW tasks
        for (const subsystem of wizardData.subsystems.filter(s => s.isExisting)) {
          const newTasks = (subsystem.taskDetails || []).filter(t => !t.id);
          
          if (newTasks.length > 0 && subsystem.id) {
            await contractService.addTasksToSubsystem(subsystem.id, {
              tasks: newTasks.map(t => ({
                name: buildTaskNameFromDetails(t.taskType, t, wizardData.liniaKolejowa),
                type: t.taskType,
                metadata: {
                  kilometraz: t.kilometraz,
                  kategoria: t.kategoria,
                  miejscowosc: t.miejscowosc
                }
              }))
            });
          }
        }
        
        console.log('✅ Contract updated successfully');
        setCurrentStep(getTotalSteps()); // Success step
      } else {
        // CREATE MODE - create new contract
        const subsystemsData = wizardData.subsystems.map((subsystem) => {
          const subsystemTasks = generatedTasks.filter(t => t.subsystemType === subsystem.type);
          const params = subsystem.type === 'SMW' && subsystem.smwData 
            ? subsystem.smwData 
            : subsystem.params;
          return {
            type: subsystem.type,
            params: params as Record<string, number | boolean | any>,
            ipPool: subsystem.ipPool,
            tasks: subsystemTasks.map(t => ({
              number: t.number,
              name: t.name,
              type: t.type
            }))
          };
        });

        console.log('📤 Sending contract data:', {
          contractNumber: wizardData.contractNumber || undefined,
          customName: wizardData.customName,
          orderDate: wizardData.orderDate,
          projectManagerId: parseInt(wizardData.projectManagerId),
          managerCode: wizardData.managerCode,
          subsystems: subsystemsData
        });

        const response = await contractService.createContractWithWizard({
          contractNumber: wizardData.contractNumber || undefined,
          customName: wizardData.customName,
          orderDate: wizardData.orderDate,
          projectManagerId: parseInt(wizardData.projectManagerId),
          managerCode: wizardData.managerCode,
          liniaKolejowa: wizardData.liniaKolejowa || undefined,
          subsystems: subsystemsData
        });
        
        console.log('✅ Contract created:', response);
        
        // Update generated tasks with actual task numbers from backend
        const createdSubsystems = response.subsystems || [];
        const fetchedTasks: GeneratedTask[] = createdSubsystems.flatMap((subsystem) => 
          (subsystem.tasks || []).map((task) => ({
            number: task.taskNumber,
            name: task.taskName,
            type: task.taskType,
            subsystemType: subsystem.systemType as any
          }))
        );
        
        setGeneratedTasks(fetchedTasks);
        setCurrentStep(getTotalSteps()); // Success step
      }
    } catch (err: any) {
      console.error('❌ Error creating/updating contract:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || err.message || 'Błąd podczas tworzenia kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    const stepInfo = getCurrentStepInfo();
    
    console.log('🔍 canProceed check:', {
      stepType: stepInfo.type,
      wizardData,
      subsystems: wizardData.subsystems
    });
    
    if (stepInfo.type === 'basic') {
      const canProceedBasic = !!(wizardData.customName && wizardData.orderDate && wizardData.projectManagerId && 
                wizardData.managerCode.length >= 1 && wizardData.managerCode.length <= 5);
      console.log('🔍 Basic step canProceed:', canProceedBasic);
      return canProceedBasic;
    }
    if (stepInfo.type === 'selection') {
      const canProceedSelection = wizardData.subsystems.length > 0;
      console.log('🔍 Selection step canProceed:', canProceedSelection);
      return canProceedSelection;
    }
    if (stepInfo.type === 'details' && stepInfo.subsystemIndex !== undefined) {
      const canProceedDetails = canProceedFromDetails(stepInfo.subsystemIndex);
      console.log('🔍 Details step canProceed:', canProceedDetails);
      return canProceedDetails;
    }
    if (stepInfo.type === 'preview') {
      const canProceedPreview = generatedTasks.length > 0;
      console.log('🔍 Preview step canProceed:', canProceedPreview, 'generatedTasks:', generatedTasks.length);
      return canProceedPreview;
    }
    console.log('🔍 Default canProceed: true');
    return true;
  };

  const renderStepIndicator = () => {
    const totalSteps = getTotalSteps();
    const maxStepsToShow = 6;
    const steps = [];
    
    for (let i = 1; i <= Math.min(totalSteps, maxStepsToShow); i++) {
      const labels = ['', 'Dane', 'Podsystemy'];
      let label = labels[i] || `Krok ${i}`;
      if (i === totalSteps - 1) label = 'Podgląd';
      if (i === totalSteps) label = 'Sukces';
      
      steps.push(
        <div key={i} className={`wizard-step ${currentStep === i ? 'active' : ''} ${currentStep > i ? 'completed' : ''}`}>
          <span className="step-number">{i}</span>
          <span className="step-label">{label}</span>
        </div>
      );
    }
    
    return <div className="wizard-steps">{steps}</div>;
  };

  const renderConfigStep = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    
    const commonProps = {
      subsystem,
      subsystemIndex,
      onUpdate: (index: number, updates: any) => {
        const newSubsystems = [...wizardData.subsystems];
        newSubsystems[index] = { ...newSubsystems[index], ...updates };
        updateWizardData({ subsystems: newSubsystems });
      },
      // SmwConfigStep needs these for internal multi-step navigation
      onNext: subsystem.type === 'SMW' ? handleNextStep : undefined,
      onPrev: subsystem.type === 'SMW' ? handlePrevStep : undefined
    };
    
    const configComponents: Record<string, React.FC<any>> = {
      SMOKIP_A: SmokipAConfigStep, SMOKIP_B: SmokipBConfigStep,
      SKD: SkdConfigStep, SMW: SmwConfigStep, SSWIN: SswinConfigStep,
      CCTV: CctvConfigStep, SDIP: SdipConfigStep, SUG: SugConfigStep,
      SSP: SspConfigStep, LAN: LanConfigStep, OTK: OtkConfigStep,
      ZASILANIE: ZasilanieConfigStep
    };
    
    const Component = configComponents[subsystem.type];
    return Component ? <Component {...commonProps} /> : <div>Unknown subsystem: {subsystem.type}</div>;
  };

  const renderDetailsStep = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    
    const props = {
      subsystem,
      subsystemIndex,
      onUpdate: (index: number, updates: any) => {
        const newSubsystems = [...wizardData.subsystems];
        newSubsystems[index] = { ...newSubsystems[index], ...updates };
        updateWizardData({ subsystems: newSubsystems });
      },
      onAddTask: addTaskDetail,
      onRemoveTask: removeTaskDetail,
      onUpdateTask: updateTaskDetail,
      onNext: handleNextStep,
      onPrev: handlePrevStep,
      handleKilometrazInput,
      handleKilometrazBlur
    };
    
    const Component = subsystem.type === 'SMOKIP_A' ? SmokipADetailsStep : SmokipBDetailsStep;
    return <Component {...props} />;
  };

  const renderCurrentStep = () => {
    const stepInfo = getCurrentStepInfo();
    
    const stepComponents = {
      basic: () => (
        <BasicDataStep
          wizardData={wizardData}
          detectedSubsystems={detectedSubsystems}
          onUpdate={updateWizardData}
          onDetectSubsystems={detectSubsystems}
        />
      ),
      selection: () => (
        <SubsystemSelectionStep
          subsystems={wizardData.subsystems}
          onAdd={addSubsystem}
          onRemove={(index) => removeSubsystem(index, setError)}
        />
      ),
      config: () => stepInfo.subsystemIndex !== undefined && renderConfigStep(stepInfo.subsystemIndex),
      details: () => stepInfo.subsystemIndex !== undefined && renderDetailsStep(stepInfo.subsystemIndex),
      preview: () => (
        <PreviewStep
          wizardData={wizardData}
          generatedTasks={generatedTasks}
          onNext={handleSubmit}
          onPrev={handlePrevStep}
        />
      ),
      success: () => (
        <SuccessStep
          contractNumber={wizardData.contractNumber}
          wizardData={wizardData}
          generatedTasks={generatedTasks}
          onClose={() => {
            onSuccess();
            onClose();
          }}
        />
      )
    };
    
    return stepComponents[stepInfo.type]?.() || null;
  };

  const stepInfo = getCurrentStepInfo();
  const isLastStep = stepInfo.type === 'success';
  
  // Check if we're in SMW config step with internal navigation
  const isSmwConfigStep = stepInfo.type === 'config' && 
    stepInfo.subsystemIndex !== undefined && 
    wizardData.subsystems[stepInfo.subsystemIndex]?.type === 'SMW';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🧙‍♂️ {editMode ? 'Edycja Kontraktu' : 'Kreator Kontraktu'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        {renderStepIndicator()}
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <div className="modal-body">
          {renderCurrentStep()}
        </div>
        
        {!isLastStep && !isSmwConfigStep && (
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
