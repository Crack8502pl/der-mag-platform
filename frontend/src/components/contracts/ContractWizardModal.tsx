// src/components/contracts/ContractWizardModal.tsx
// Multi-step wizard for creating contracts with multiple subsystems

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SUBSYSTEM_WIZARD_CONFIG, detectSubsystemTypes } from '../../config/subsystemWizardConfig';
import type { SubsystemType } from '../../config/subsystemWizardConfig';
import contractService, { type Subsystem } from '../../services/contract.service';
import { AdminService } from '../../services/admin.service';
import type { User as AdminUser } from '../../types/admin.types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;           // NOWE - tryb edycji
  contractToEdit?: Contract;    // NOWE - dane kontraktu do edycji
}

interface SubsystemWizardData {
  id?: number;              // NOWE - ID podsystemu (dla edycji)
  type: SubsystemType;
  params: Record<string, number | boolean>;
  taskDetails?: TaskDetail[];
  isExisting?: boolean;     // NOWE - czy podsystem już istnieje w bazie
  taskCount?: number;       // NOWE - liczba zadań (dla blokady usuwania)
}

interface TaskDetail {
  id?: number;              // NOWE - ID zadania (dla edycji)
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

export const ContractWizardModal: React.FC<Props> = ({ 
  onClose, 
  onSuccess, 
  editMode = false,      // NOWE
  contractToEdit         // NOWE
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedSubsystems, setDetectedSubsystems] = useState<SubsystemType[]>([]);
  const [availableManagers, setAvailableManagers] = useState<AdminUser[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  
  const [wizardData, setWizardData] = useState<WizardData>({
    customName: '',
    orderDate: '',
    projectManagerId: user?.id?.toString() || '',
    managerCode: '',
    subsystems: []
  });
  
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);

  // Check if current user can select managers (Admin or Board)
  const canSelectManager = user?.role === 'admin' || user?.role === 'board';

  // Set initial projectManagerId when user is available
  useEffect(() => {
    if (user && !wizardData.projectManagerId) {
      setWizardData(prev => ({
        ...prev,
        projectManagerId: user.id.toString()
      }));
    }
  }, [user]);

  // Load managers on mount if user can select
  useEffect(() => {
    if (canSelectManager) {
      loadManagers();
    }
  }, [canSelectManager]);

  // Wczytaj dane kontraktu przy edycji
  useEffect(() => {
    if (editMode && contractToEdit) {
      loadContractDataForEdit(contractToEdit);
    }
  }, [editMode, contractToEdit]);

  const loadContractDataForEdit = async (contract: Contract) => {
    try {
      setLoading(true);
      
      // 1. Ustaw dane podstawowe
      setWizardData(prev => ({
        ...prev,
        customName: contract.customName || '',
        orderDate: contract.orderDate?.split('T')[0] || '',
        projectManagerId: contract.projectManagerId?.toString() || '',
        managerCode: contract.managerCode || ''
      }));
      
      // 2. Pobierz podsystemy z backendu
      const subsystemsResponse = await contractService.getContractSubsystems(contract.id);
      const existingSubsystems = subsystemsResponse.data || [];
      
      // 3. Mapuj podsystemy na format kreatora
      const wizardSubsystems: SubsystemWizardData[] = existingSubsystems.map(sub => ({
        id: sub.id, // WAŻNE - zachowaj ID dla aktualizacji
        type: sub.systemType as SubsystemType,
        params: sub.params || {},
        taskDetails: (sub.tasks || []).map(task => ({
          id: task.id, // WAŻNE - zachowaj ID zadania
          taskType: task.taskType,
          kilometraz: task.metadata?.kilometraz || '',
          kategoria: task.metadata?.kategoria || '',
          nazwa: task.taskName || task.metadata?.nazwa || '',
          miejscowosc: task.metadata?.miejscowosc || ''
        })),
        isExisting: true, // FLAGA - podsystem już istnieje w bazie
        taskCount: sub.tasks?.length || 0
      }));
      
      setWizardData(prev => ({
        ...prev,
        subsystems: wizardSubsystems
      }));
      
      // 4. Ustaw wykryte podsystemy
      setDetectedSubsystems(wizardSubsystems.map(s => s.type));
      
    } catch (err) {
      console.error('Błąd wczytywania danych kontraktu:', err);
      setError('Nie udało się wczytać danych kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    setLoadingManagers(true);
    try {
      const adminService = new AdminService();
      const users = await adminService.getAllUsers();
      // Filter for active users with manager, admin, or board roles
      const managers = users.filter(u => 
        u.active && (u.role?.name === 'manager' || u.role?.name === 'admin' || u.role?.name === 'board')
      );
      setAvailableManagers(managers);
    } catch (err) {
      console.error('Failed to load managers:', err);
      // If loading fails, at least include current user
      if (user) {
        setAvailableManagers([{
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: undefined,
          roleId: 0,  // We don't have this from auth user
          role: { id: 0, name: user.role || '', permissions: user.permissions || {} },
          active: true,
          forcePasswordChange: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      }
    } finally {
      setLoadingManagers(false);
    }
  };

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
    const subsystem = wizardData.subsystems[index];
    
    // Blokada usuwania istniejącego podsystemu z zadaniami
    if (subsystem.isExisting && subsystem.taskCount && subsystem.taskCount > 0) {
      const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
      setError(`Nie można usunąć podsystemu "${config.label}" - ma ${subsystem.taskCount} powiązanych zadań. Najpierw usuń zadania.`);
      return;
    }
    
    // Można usunąć nowy podsystem (nie zapisany jeszcze) lub pusty istniejący
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
  // REMOVED: Backend now generates task numbers in format {SubsystemNumber}-{Seq}

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

  // Initialize taskDetails array from config params
  const initializeTaskDetails = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    const taskDetails: TaskDetail[] = [];
    const params = subsystem.params;
    
    if (subsystem.type === 'SMOKIP_A') {
      // PRZEJAZD_KAT_A
      for (let i = 0; i < getNumericValue(params, 'przejazdyKatA'); i++) {
        taskDetails.push({ taskType: 'PRZEJAZD_KAT_A', kilometraz: '', kategoria: 'KAT A' });
      }
      // SKP
      for (let i = 0; i < getNumericValue(params, 'iloscSKP'); i++) {
        taskDetails.push({ taskType: 'SKP', kilometraz: '' });
      }
      // NASTAWNIA
      for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
        taskDetails.push({ taskType: 'NASTAWNIA', nazwa: '', miejscowosc: '' });
      }
      // LCS
      if (getBooleanValue(params, 'hasLCS')) {
        taskDetails.push({ taskType: 'LCS', nazwa: '', miejscowosc: '' });
      }
      // CUID
      if (getBooleanValue(params, 'hasCUID')) {
        taskDetails.push({ taskType: 'CUID', nazwa: '', miejscowosc: '' });
      }
    } else if (subsystem.type === 'SMOKIP_B') {
      // PRZEJAZD_KAT_B
      for (let i = 0; i < getNumericValue(params, 'przejazdyKatB'); i++) {
        taskDetails.push({ taskType: 'PRZEJAZD_KAT_B', kilometraz: '', kategoria: 'KAT B' });
      }
      // NASTAWNIA
      for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
        taskDetails.push({ taskType: 'NASTAWNIA', nazwa: '', miejscowosc: '' });
      }
      // LCS
      if (getBooleanValue(params, 'hasLCS')) {
        taskDetails.push({ taskType: 'LCS', nazwa: '', miejscowosc: '' });
      }
      // CUID
      if (getBooleanValue(params, 'hasCUID')) {
        taskDetails.push({ taskType: 'CUID', nazwa: '', miejscowosc: '' });
      }
    }
    
    // Update subsystem with initialized taskDetails
    const newSubsystems = [...wizardData.subsystems];
    newSubsystems[subsystemIndex].taskDetails = taskDetails;
    setWizardData({ ...wizardData, subsystems: newSubsystems });
  };

  // Update a specific task detail
  const updateTaskDetail = (subsystemIndex: number, taskIndex: number, updates: Partial<TaskDetail>) => {
    const newSubsystems = [...wizardData.subsystems];
    if (!newSubsystems[subsystemIndex].taskDetails) {
      newSubsystems[subsystemIndex].taskDetails = [];
    }
    newSubsystems[subsystemIndex].taskDetails![taskIndex] = {
      ...newSubsystems[subsystemIndex].taskDetails![taskIndex],
      ...updates
    };
    setWizardData({ ...wizardData, subsystems: newSubsystems });
  };

  // Add a new task detail
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
    setWizardData({ ...wizardData, subsystems: newSubsystems });
  };

  // Remove a task detail
  const removeTaskDetail = (subsystemIndex: number, taskIndex: number) => {
    const newSubsystems = [...wizardData.subsystems];
    if (newSubsystems[subsystemIndex].taskDetails) {
      newSubsystems[subsystemIndex].taskDetails!.splice(taskIndex, 1);
      setWizardData({ ...wizardData, subsystems: newSubsystems });
    }
  };

  // Check if can proceed from details step
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

  // Generate tasks for a single subsystem
  const generateTasksForSubsystem = (
    subsystem: SubsystemWizardData, 
    _startIndex: number
  ): GeneratedTask[] => {
    const tasks: GeneratedTask[] = [];
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
            number: '',
            name,
            type: detail.taskType,
            subsystemType: subsystem.type
          });
        });
      } else {
        // Generic task generation
        for (let i = 0; i < getNumericValue(params, 'przejazdyKatA'); i++) {
          tasks.push({
            number: '',
            name: `Przejazd Kat A #${i + 1}`,
            type: 'PRZEJAZD_KAT_A',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(params, 'iloscSKP'); i++) {
          tasks.push({
            number: '',
            name: `SKP #${i + 1}`,
            type: 'SKP',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
          tasks.push({
            number: '',
            name: `Nastawnia #${i + 1}`,
            type: 'NASTAWNIA',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasLCS')) {
          tasks.push({
            number: '',
            name: `LCS (${getNumericValue(params, 'lcsMonitory')} monitorów, ${getNumericValue(params, 'lcsStanowiska')} stanowisk)`,
            type: 'LCS',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasCUID')) {
          tasks.push({
            number: '',
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
            number: '',
            name,
            type: detail.taskType,
            subsystemType: subsystem.type
          });
        });
      } else {
        for (let i = 0; i < getNumericValue(params, 'przejazdyKatB'); i++) {
          tasks.push({
            number: '',
            name: `Przejazd Kat B #${i + 1}`,
            type: 'PRZEJAZD_KAT_B',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(params, 'iloscNastawni'); i++) {
          tasks.push({
            number: '',
            name: `Nastawnia #${i + 1}`,
            type: 'NASTAWNIA',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasLCS')) {
          tasks.push({
            number: '',
            name: `LCS (${getNumericValue(params, 'lcsMonitory')} monitorów, ${getNumericValue(params, 'lcsStanowiska')} stanowisk)`,
            type: 'LCS',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(params, 'hasCUID')) {
          tasks.push({
            number: '',
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
          number: '',
          name: `Budynek SKD #${i + 1}`,
          type: 'BUDYNEK',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
        tasks.push({
          number: '',
          name: `Kontener SKD #${i + 1}`,
          type: 'KONTENER',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscPrzejsc'); i++) {
        tasks.push({
          number: '',
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
          number: '',
          name: `${subsystemLabel} - Budynek #${i + 1}`,
          type: 'BUDYNEK',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscPomieszczen'); i++) {
        tasks.push({
          number: '',
          name: `${subsystemLabel} - Pomieszczenie #${i + 1}`,
          type: 'POMIESZCZENIE',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(params, 'iloscKontenerow'); i++) {
        tasks.push({
          number: '',
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
    
    // Initialize taskDetails when leaving config step if next step is details step (for SMOK-A/B)
    if (stepInfo.type === 'config' && stepInfo.subsystemIndex !== undefined) {
      const subsystem = wizardData.subsystems[stepInfo.subsystemIndex];
      // Check if next step is details step
      if (subsystem.type === 'SMOKIP_A' || subsystem.type === 'SMOKIP_B') {
        // Initialize taskDetails if not already initialized
        if (!subsystem.taskDetails || subsystem.taskDetails.length === 0) {
          initializeTaskDetails(stepInfo.subsystemIndex);
        }
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!wizardData.projectManagerId) {
      setError('Nie wybrano kierownika projektu');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (editMode && contractToEdit) {
        // TRYB EDYCJI - aktualizuj kontrakt
        
        // 1. Aktualizuj dane podstawowe kontraktu
        await contractService.updateContract(contractToEdit.id, {
          customName: wizardData.customName,
          orderDate: wizardData.orderDate,
          projectManagerId: parseInt(wizardData.projectManagerId),
          managerCode: wizardData.managerCode
        });
        
        // 2. Dodaj tylko NOWE podsystemy (te bez flagi isExisting)
        const newSubsystems = wizardData.subsystems.filter(s => !s.isExisting);
        
        if (newSubsystems.length > 0) {
          const subsystemsData = newSubsystems.map((subsystem) => {
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
          
          await contractService.addSubsystemsToContract(contractToEdit.id, {
            subsystems: subsystemsData
          });
        }
        
        // 3. Dla istniejących podsystemów - dodaj tylko NOWE zadania
        for (const subsystem of wizardData.subsystems.filter(s => s.isExisting)) {
          const newTasks = (subsystem.taskDetails || []).filter(t => !t.id);
          
          if (newTasks.length > 0 && subsystem.id) {
            await contractService.addTasksToSubsystem(subsystem.id, {
              tasks: newTasks.map(t => ({
                name: t.nazwa || t.taskType,
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
        
        setCurrentStep(getTotalSteps()); // Success step
      } else {
        // TRYB TWORZENIA - istniejący kod
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

        const response = await contractService.createContractWithWizard({
          customName: wizardData.customName,
          orderDate: wizardData.orderDate,
          projectManagerId: parseInt(wizardData.projectManagerId),
          managerCode: wizardData.managerCode,
          subsystems: subsystemsData
        });
        
        // Map returned tasks to generatedTasks format
        const createdSubsystems: Subsystem[] = response.subsystems || [];
        const fetchedTasks: GeneratedTask[] = createdSubsystems.flatMap((subsystem) => 
          (subsystem.tasks || []).map((task) => ({
            number: task.taskNumber,
            name: task.taskName,
            type: task.taskType,
            subsystemType: subsystem.systemType as SubsystemType
          }))
        );
        
        // Update state with real tasks from database
        setGeneratedTasks(fetchedTasks);
        setCurrentStep(getTotalSteps()); // Move to success step
      }
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
             wizardData.projectManagerId && wizardData.managerCode.length === 3;
    }
    if (stepInfo.type === 'selection') {
      return wizardData.subsystems.length > 0;
    }
    if (stepInfo.type === 'details' && stepInfo.subsystemIndex !== undefined) {
      return canProceedFromDetails(stepInfo.subsystemIndex);
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
        {canSelectManager ? (
          <>
            <select
              value={wizardData.projectManagerId}
              onChange={(e) => setWizardData({...wizardData, projectManagerId: e.target.value})}
              disabled={loadingManagers}
            >
              <option value="">Wybierz kierownika projektu</option>
              {availableManagers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.firstName} {manager.lastName} ({manager.username}) - {manager.role?.name || 'Brak roli'}
                </option>
              ))}
            </select>
            {loadingManagers && <span className="text-muted">Ładowanie listy kierowników...</span>}
            {!loadingManagers && <span className="text-muted">Admin i Zarząd mogą wybrać dowolnego kierownika</span>}
          </>
        ) : (
          <>
            <input
              type="text"
              className="form-control-readonly"
              value={user ? `${user.firstName} ${user.lastName} (${user.username})` : ''}
              disabled
              readOnly
            />
            <span className="text-muted">Automatycznie ustawiony na aktualnego użytkownika</span>
          </>
        )}
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
        <h3>
          Konfiguracja: {config.icon} {config.label}
          {subsystem.isExisting && (
            <span className="badge badge-info" style={{ marginLeft: '10px', fontSize: '0.85em' }}>Istniejący podsystem</span>
          )}
        </h3>
        
        {subsystem.isExisting && (
          <div className="alert alert-warning">
            ⚠️ Typ podsystemu nie może być zmieniony. Możesz tylko edytować parametry i dodawać nowe zadania.
          </div>
        )}
        
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
    const taskDetails = subsystem.taskDetails || [];
    
    // Calculate progress
    const totalTasks = taskDetails.length;
    const describedTasks = taskDetails.filter(detail => {
      if (detail.taskType === 'PRZEJAZD_KAT_A' || detail.taskType === 'PRZEJAZD_KAT_B') {
        return detail.kilometraz && detail.kategoria;
      } else if (detail.taskType === 'SKP') {
        return detail.kilometraz;
      }
      // For NASTAWNIA, LCS, CUID - count as described if any field is filled
      return detail.nazwa || detail.miejscowosc || detail.kilometraz;
    }).length;
    
    return (
      <div className="wizard-step-content">
        <h3>Szczegóły zadań: {config.icon} {config.label}</h3>
        <p className="info-text">
          Opisane: {describedTasks}/{totalTasks} zadań
        </p>
        
        <div className="task-details-form">
          {taskDetails.map((detail, idx) => (
            <div key={idx} className="task-detail-item">
              <div className="task-header">
                <strong>Zadanie {idx + 1}: {detail.taskType}</strong>
                <button 
                  type="button"
                  className="btn-icon btn-danger"
                  onClick={() => removeTaskDetail(subsystemIndex, idx)}
                  title="Usuń zadanie"
                >
                  🗑️
                </button>
              </div>
              
              {(detail.taskType === 'PRZEJAZD_KAT_A' || detail.taskType === 'PRZEJAZD_KAT_B') && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Kilometraż *</label>
                    <input
                      type="text"
                      placeholder="np. 123.456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { kilometraz: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Kategoria *</label>
                    <select
                      value={detail.kategoria || 'KAT A'}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { 
                        kategoria: e.target.value as TaskDetail['kategoria']
                      })}
                      required
                    >
                      <option value="KAT A">KAT A</option>
                      <option value="KAT B">KAT B</option>
                      <option value="KAT C">KAT C</option>
                      <option value="KAT E">KAT E</option>
                      <option value="KAT F">KAT F</option>
                    </select>
                  </div>
                </div>
              )}
              
              {detail.taskType === 'SKP' && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Kilometraż *</label>
                    <input
                      type="text"
                      placeholder="np. 123.456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { kilometraz: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}
              
              {detail.taskType === 'NASTAWNIA' && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Nazwa</label>
                    <input
                      type="text"
                      placeholder="Nazwa nastawni"
                      value={detail.nazwa || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { nazwa: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Miejscowość</label>
                    <input
                      type="text"
                      placeholder="Miejscowość"
                      value={detail.miejscowosc || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { miejscowosc: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Kilometraż (opcjonalnie)</label>
                    <input
                      type="text"
                      placeholder="np. 123.456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { kilometraz: e.target.value })}
                    />
                  </div>
                </div>
              )}
              
              {detail.taskType === 'LCS' && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Nazwa</label>
                    <input
                      type="text"
                      placeholder="Nazwa LCS"
                      value={detail.nazwa || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { nazwa: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Miejscowość</label>
                    <input
                      type="text"
                      placeholder="Miejscowość"
                      value={detail.miejscowosc || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { miejscowosc: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Kilometraż (opcjonalnie)</label>
                    <input
                      type="text"
                      placeholder="np. 123.456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { kilometraz: e.target.value })}
                    />
                  </div>
                </div>
              )}
              
              {detail.taskType === 'CUID' && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Nazwa</label>
                    <input
                      type="text"
                      placeholder="Nazwa CUID"
                      value={detail.nazwa || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { nazwa: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Miejscowość</label>
                    <input
                      type="text"
                      placeholder="Miejscowość"
                      value={detail.miejscowosc || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { miejscowosc: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="add-task-section">
            <p><strong>Dodaj nowe zadanie:</strong></p>
            <div className="add-task-buttons">
              {subsystem.type === 'SMOKIP_A' && (
                <>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'PRZEJAZD_KAT_A')}
                  >
                    ➕ Przejazd Kat A
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'SKP')}
                  >
                    ➕ SKP
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'NASTAWNIA')}
                  >
                    ➕ Nastawnia
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'LCS')}
                  >
                    ➕ LCS
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'CUID')}
                  >
                    ➕ CUID
                  </button>
                </>
              )}
              {subsystem.type === 'SMOKIP_B' && (
                <>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'PRZEJAZD_KAT_B')}
                  >
                    ➕ Przejazd Kat B
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'NASTAWNIA')}
                  >
                    ➕ Nastawnia
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'LCS')}
                  >
                    ➕ LCS
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addTaskDetail(subsystemIndex, 'CUID')}
                  >
                    ➕ CUID
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
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
                        <td><code>{task.number || '(automatyczny)'}</code></td>
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
