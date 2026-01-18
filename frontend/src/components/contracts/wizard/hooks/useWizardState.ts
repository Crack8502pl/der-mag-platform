// src/components/contracts/wizard/hooks/useWizardState.ts
// Custom hook for managing wizard state and operations

import { useState, useEffect } from 'react';
import { detectSubsystemTypes } from '../../../../config/subsystemWizardConfig';
import type { SubsystemType } from '../../../../config/subsystemWizardConfig';
import contractService, { type Contract } from '../../../../services/contract.service';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { WizardData, SubsystemWizardData, TaskDetail } from '../types/wizard.types';
import { formatKilometrazDisplay, cleanKilometrazInput } from '../utils/validation';

interface UseWizardStateProps {
  initialUserId?: string;
  initialEmployeeCode?: string;
  editMode?: boolean;
  contractToEdit?: Contract;
}

interface UseWizardStateReturn {
  wizardData: WizardData;
  detectedSubsystems: SubsystemType[];
  setDetectedSubsystems: (subsystems: SubsystemType[]) => void;
  detectSubsystems: (name: string) => void;
  addSubsystem: (type: SubsystemType) => void;
  removeSubsystem: (index: number, setError: (error: string) => void) => void;
  updateSubsystemParams: (index: number, params: Record<string, number | boolean>) => void;
  initializeTaskDetails: (subsystemIndex: number) => void;
  updateTaskDetail: (subsystemIndex: number, taskIndex: number, updates: Partial<TaskDetail>) => void;
  addTaskDetail: (subsystemIndex: number, taskType: TaskDetail['taskType']) => void;
  removeTaskDetail: (subsystemIndex: number, taskIndex: number) => void;
  handleKilometrazInput: (subsystemIndex: number, taskIndex: number, value: string) => void;
  handleKilometrazBlur: (subsystemIndex: number, taskIndex: number, value: string) => void;
  canProceedFromDetails: (subsystemIndex: number) => boolean;
  loadContractDataForEdit: (contract: Contract, setLoading: (loading: boolean) => void, setError: (error: string) => void) => Promise<void>;
  updateWizardData: (updates: Partial<WizardData>) => void;
}

/**
 * Custom hook for wizard state management
 * Extracts all state logic from ContractWizardModal
 */
export const useWizardState = ({
  initialUserId = '',
  initialEmployeeCode = '',
  editMode = false,
  contractToEdit
}: UseWizardStateProps = {}): UseWizardStateReturn => {
  const [wizardData, setWizardData] = useState<WizardData>({
    contractNumber: '',
    customName: '',
    orderDate: '',
    projectManagerId: initialUserId,
    managerCode: initialEmployeeCode,
    subsystems: []
  });

  const [detectedSubsystems, setDetectedSubsystems] = useState<SubsystemType[]>([]);

  // Initialize projectManagerId and managerCode when props change
  useEffect(() => {
    if (initialUserId && (!wizardData.projectManagerId || !wizardData.managerCode)) {
      setWizardData(prev => ({
        ...prev,
        projectManagerId: initialUserId,
        managerCode: initialEmployeeCode || prev.managerCode
      }));
    }
  }, [initialUserId, initialEmployeeCode, wizardData.projectManagerId, wizardData.managerCode]);

  // Load contract data in edit mode
  useEffect(() => {
    if (editMode && contractToEdit) {
      loadContractDataForEdit(contractToEdit, () => {}, () => {});
    }
  }, [editMode, contractToEdit]);

  /**
   * Helper to get numeric value from params
   */
  const getNumericValue = (params: Record<string, number | boolean>, key: string): number => {
    const value = params[key];
    return typeof value === 'number' ? value : 0;
  };

  /**
   * Helper to get boolean value from params
   */
  const getBooleanValue = (params: Record<string, number | boolean>, key: string): boolean => {
    const value = params[key];
    return typeof value === 'boolean' ? value : false;
  };

  /**
   * Detect subsystems from contract name and update wizard data
   */
  const detectSubsystems = (name: string) => {
    const detected = detectSubsystemTypes(name);
    setDetectedSubsystems(detected);
    setWizardData(prev => ({
      ...prev,
      customName: name,
      subsystems: detected.map(type => ({ type, params: {} }))
    }));
  };

  /**
   * Add a subsystem manually
   */
  const addSubsystem = (type: SubsystemType) => {
    setWizardData(prev => ({
      ...prev,
      subsystems: [...prev.subsystems, { type, params: {} }]
    }));
  };

  /**
   * Remove a subsystem with validation
   * Blocks deletion of existing subsystems with tasks
   */
  const removeSubsystem = (index: number, setError: (error: string) => void) => {
    const subsystem = wizardData.subsystems[index];
    
    // Block deletion of existing subsystem with tasks
    if (subsystem.isExisting && subsystem.taskCount && subsystem.taskCount > 0) {
      const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
      setError(`Nie można usunąć podsystemu "${config.label}" - ma ${subsystem.taskCount} powiązanych zadań. Najpierw usuń zadania.`);
      return;
    }
    
    // Allow deletion of new subsystem (not saved yet) or empty existing subsystem
    const newSubsystems = [...wizardData.subsystems];
    newSubsystems.splice(index, 1);
    setWizardData(prev => ({
      ...prev,
      subsystems: newSubsystems
    }));
  };

  /**
   * Update subsystem parameters
   */
  const updateSubsystemParams = (index: number, params: Record<string, number | boolean>) => {
    const newSubsystems = [...wizardData.subsystems];
    newSubsystems[index].params = params;
    setWizardData(prev => ({
      ...prev,
      subsystems: newSubsystems
    }));
  };

  /**
   * Initialize taskDetails array from config params for SMOKIP_A/B
   */
  const initializeTaskDetails = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    const taskDetails: TaskDetail[] = [];
    const simpleParams = subsystem.params as Record<string, number | boolean>;
    
    if (subsystem.type === 'SMOKIP_A') {
      // PRZEJAZD_KAT_A
      for (let i = 0; i < getNumericValue(simpleParams, 'przejazdyKatA'); i++) {
        taskDetails.push({ taskType: 'PRZEJAZD_KAT_A', kilometraz: '', kategoria: 'KAT A' });
      }
      // SKP
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscSKP'); i++) {
        taskDetails.push({ taskType: 'SKP', kilometraz: '' });
      }
      // NASTAWNIA
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscNastawni'); i++) {
        taskDetails.push({ taskType: 'NASTAWNIA', nazwa: '', miejscowosc: '' });
      }
      // LCS
      if (getBooleanValue(simpleParams, 'hasLCS')) {
        taskDetails.push({ taskType: 'LCS', nazwa: '', miejscowosc: '' });
      }
      // CUID - copy data from LCS
      if (getBooleanValue(simpleParams, 'hasCUID')) {
        const lcsTask = taskDetails.find(t => t.taskType === 'LCS');
        taskDetails.push({ 
          taskType: 'CUID', 
          nazwa: lcsTask?.nazwa || '', 
          miejscowosc: lcsTask?.miejscowosc || '' 
        });
      }
    } else if (subsystem.type === 'SMOKIP_B') {
      // PRZEJAZD_KAT_B
      for (let i = 0; i < getNumericValue(simpleParams, 'przejazdyKatB'); i++) {
        taskDetails.push({ taskType: 'PRZEJAZD_KAT_B', kilometraz: '', kategoria: 'KAT B' });
      }
      // NASTAWNIA
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscNastawni'); i++) {
        taskDetails.push({ taskType: 'NASTAWNIA', nazwa: '', miejscowosc: '' });
      }
      // LCS
      if (getBooleanValue(simpleParams, 'hasLCS')) {
        taskDetails.push({ taskType: 'LCS', nazwa: '', miejscowosc: '' });
      }
      // CUID - copy data from LCS
      if (getBooleanValue(simpleParams, 'hasCUID')) {
        const lcsTask = taskDetails.find(t => t.taskType === 'LCS');
        taskDetails.push({ 
          taskType: 'CUID', 
          nazwa: lcsTask?.nazwa || '', 
          miejscowosc: lcsTask?.miejscowosc || '' 
        });
      }
    }
    
    // Update subsystem with initialized taskDetails
    const newSubsystems = [...wizardData.subsystems];
    newSubsystems[subsystemIndex].taskDetails = taskDetails;
    setWizardData(prev => ({ ...prev, subsystems: newSubsystems }));
  };

  /**
   * Update a specific task detail
   * Handles LCS -> CUID synchronization
   */
  const updateTaskDetail = (subsystemIndex: number, taskIndex: number, updates: Partial<TaskDetail>) => {
    const newSubsystems = [...wizardData.subsystems];
    if (!newSubsystems[subsystemIndex].taskDetails) {
      newSubsystems[subsystemIndex].taskDetails = [];
    }
    
    const taskDetails = newSubsystems[subsystemIndex].taskDetails!;
    taskDetails[taskIndex] = {
      ...taskDetails[taskIndex],
      ...updates
    };
    
    // LCS -> CUID synchronization: if modifying LCS, update CUID
    const updatedTask = taskDetails[taskIndex];
    if (updatedTask.taskType === 'LCS' && (updates.nazwa !== undefined || updates.miejscowosc !== undefined)) {
      // Find CUID in the same subsystem
      const cuidIndex = taskDetails.findIndex(t => t.taskType === 'CUID');
      if (cuidIndex !== -1) {
        const cuidTask = taskDetails[cuidIndex];
        taskDetails[cuidIndex] = {
          ...cuidTask,
          nazwa: updates.nazwa !== undefined ? updates.nazwa : updatedTask.nazwa,
          miejscowosc: updates.miejscowosc !== undefined ? updates.miejscowosc : updatedTask.miejscowosc
        };
      }
    }
    
    setWizardData(prev => ({ ...prev, subsystems: newSubsystems }));
  };

  /**
   * Add a new task detail
   */
  const addTaskDetail = (subsystemIndex: number, taskType: TaskDetail['taskType']) => {
    const newSubsystems = [...wizardData.subsystems];
    if (!newSubsystems[subsystemIndex].taskDetails) {
      newSubsystems[subsystemIndex].taskDetails = [];
    }
    
    // Create new task detail with appropriate defaults
    const newDetail: TaskDetail = { taskType };
    if (taskType === 'PRZEJAZD_KAT_A') {
      newDetail.kilometraz = '';
      newDetail.kategoria = 'KAT A';
    } else if (taskType === 'PRZEJAZD_KAT_B') {
      newDetail.kilometraz = '';
      newDetail.kategoria = 'KAT B';
    } else if (taskType === 'SKP') {
      newDetail.kilometraz = '';
    } else if (taskType === 'NASTAWNIA' || taskType === 'LCS' || taskType === 'CUID') {
      newDetail.nazwa = '';
      newDetail.miejscowosc = '';
    }
    
    newSubsystems[subsystemIndex].taskDetails!.push(newDetail);
    setWizardData(prev => ({ ...prev, subsystems: newSubsystems }));
  };

  /**
   * Remove a task detail
   */
  const removeTaskDetail = (subsystemIndex: number, taskIndex: number) => {
    const newSubsystems = [...wizardData.subsystems];
    if (newSubsystems[subsystemIndex].taskDetails) {
      newSubsystems[subsystemIndex].taskDetails!.splice(taskIndex, 1);
      setWizardData(prev => ({ ...prev, subsystems: newSubsystems }));
    }
  };

  /**
   * Handle kilometraż input change (without formatting, just filtering)
   */
  const handleKilometrazInput = (subsystemIndex: number, taskIndex: number, value: string) => {
    const limited = cleanKilometrazInput(value);
    updateTaskDetail(subsystemIndex, taskIndex, { kilometraz: limited });
  };

  /**
   * Handle kilometraż blur (apply formatting)
   */
  const handleKilometrazBlur = (subsystemIndex: number, taskIndex: number, value: string) => {
    const formatted = formatKilometrazDisplay(value);
    updateTaskDetail(subsystemIndex, taskIndex, { kilometraz: formatted });
  };

  /**
   * Check if can proceed from details step
   * Validates required fields for each task type
   */
  const canProceedFromDetails = (subsystemIndex: number): boolean => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    if (!subsystem.taskDetails || subsystem.taskDetails.length === 0) return false;
    
    // Validate required fields for each task type
    for (const detail of subsystem.taskDetails) {
      if (detail.taskType === 'PRZEJAZD_KAT_A' || detail.taskType === 'PRZEJAZD_KAT_B') {
        if (!detail.kilometraz || !detail.kategoria) return false;
      } else if (detail.taskType === 'SKP') {
        if (!detail.kilometraz) return false;
      }
      // For NASTAWNIA, LCS, CUID - allow empty fields (optional)
    }
    
    return true;
  };

  /**
   * Load contract data for edit mode
   */
  const loadContractDataForEdit = async (
    contract: Contract, 
    setLoading: (loading: boolean) => void, 
    setError: (error: string) => void
  ) => {
    try {
      setLoading(true);
      
      // 1. Set basic data
      setWizardData(prev => ({
        ...prev,
        contractNumber: contract.contractNumber || '',
        customName: contract.customName || '',
        orderDate: contract.orderDate?.split('T')[0] || '',
        projectManagerId: contract.projectManagerId?.toString() || '',
        managerCode: contract.managerCode || ''
      }));
      
      // 2. Fetch subsystems from backend
      const subsystemsResponse = await contractService.getContractSubsystems(contract.id);
      const existingSubsystems = subsystemsResponse.data || [];
      
      // 3. Map subsystems to wizard format with validation
      const wizardSubsystems: SubsystemWizardData[] = existingSubsystems
        .map(sub => {
          // Validate subsystem type
          const systemType = sub.systemType as SubsystemType;
          if (!SUBSYSTEM_WIZARD_CONFIG[systemType]) {
            console.warn(`Unknown subsystem type "${sub.systemType}" for contract ID ${contract.id}. Skipping.`);
            return null;
          }
          
          return {
            id: sub.id, // IMPORTANT - preserve ID for updates
            type: systemType,
            params: sub.params || {},
            ipPool: sub.ipPool, // IMPORTANT - preserve IP pool
            taskDetails: (sub.tasks || []).map(task => {
              const taskType = task.taskType as TaskDetail['taskType'];
              return {
                id: task.id, // IMPORTANT - preserve task ID
                taskType,
                kilometraz: task.metadata?.kilometraz || '',
                kategoria: task.metadata?.kategoria || '',
                nazwa: task.taskName || task.metadata?.nazwa || '',
                miejscowosc: task.metadata?.miejscowosc || ''
              };
            }),
            isExisting: true, // FLAG - subsystem already exists in database
            taskCount: sub.tasks?.length || 0
          } as SubsystemWizardData;
        })
        .filter((sub): sub is SubsystemWizardData => sub !== null) as SubsystemWizardData[];
      
      setWizardData(prev => ({
        ...prev,
        subsystems: wizardSubsystems
      }));
      
      // 4. Set detected subsystems
      setDetectedSubsystems(wizardSubsystems.map(s => s.type));
      
    } catch (err) {
      console.error('Error loading contract data:', err);
      setError('Nie udało się wczytać danych kontraktu');
    } finally {
      setLoading(false);
    }
  };

  /**
   * General wizard data update function
   */
  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({
      ...prev,
      ...updates
    }));
  };

  return {
    wizardData,
    detectedSubsystems,
    setDetectedSubsystems,
    detectSubsystems,
    addSubsystem,
    removeSubsystem,
    updateSubsystemParams,
    initializeTaskDetails,
    updateTaskDetail,
    addTaskDetail,
    removeTaskDetail,
    handleKilometrazInput,
    handleKilometrazBlur,
    canProceedFromDetails,
    loadContractDataForEdit,
    updateWizardData
  };
};
