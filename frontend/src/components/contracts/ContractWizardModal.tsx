// src/components/contracts/ContractWizardModal.tsx
// Multi-step wizard for creating contracts with multiple subsystems

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SUBSYSTEM_WIZARD_CONFIG, detectSubsystemTypes, type SmwWizardData, type SmwCabinet } from '../../config/subsystemWizardConfig';
import type { SubsystemType } from '../../config/subsystemWizardConfig';
import contractService, { type Subsystem, type Contract } from '../../services/contract.service';
import { AdminService } from '../../services/admin.service';
import type { User as AdminUser, Role } from '../../types/admin.types';
import '../../styles/grover-theme.css';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;           // NOWE - tryb edycji
  contractToEdit?: Contract;    // NOWE - dane kontraktu do edycji
}

interface SubsystemWizardData {
  id?: number;              // NOWE - ID podsystemu (dla edycji)
  type: SubsystemType;
  params: Record<string, number | boolean> | SmwWizardData;  // Allow SMW complex structure
  taskDetails?: TaskDetail[];
  isExisting?: boolean;     // NOWE - czy podsystem już istnieje w bazie
  taskCount?: number;       // NOWE - liczba zadań (dla blokady usuwania)
  ipPool?: string;          // NOWE - pula adresowa IP (np. "192.168.1.0/24")
  smwData?: SmwWizardData;  // NOWE - SMW specific wizard data
  smwStep?: number;         // NOWE - Current SMW wizard sub-step
}

interface TaskDetail {
  id?: number;              // NOWE - ID zadania (dla edycji)
  taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID' | 'SMW_PLATFORM' | 'SMW_SOK' | 'SMW_LCS' | 'SMW_EXTRA_VIEWING';
  kilometraz?: string;
  kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F';
  nazwa?: string;
  miejscowosc?: string;
  smwCabinets?: Array<{ type: string; name: string }>;  // NOWE - for SMW tasks
}

interface WizardData {
  // Step 1
  contractNumber: string;
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
  const [contractNumberError, setContractNumberError] = useState('');
  const [detectedSubsystems, setDetectedSubsystems] = useState<SubsystemType[]>([]);
  const [availableManagers, setAvailableManagers] = useState<AdminUser[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  
  const [wizardData, setWizardData] = useState<WizardData>({
    contractNumber: '',
    customName: '',
    orderDate: '',
    projectManagerId: user?.id?.toString() || '',
    managerCode: user?.employeeCode || '',
    subsystems: []
  });
  
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);

  // Helper text for optional kilometraż fields
  const OPTIONAL_KILOMETRAZ_HELP = 'Pole opcjonalne - wpisz w formacie XXX,XXX';

  // Helper to get role name (handles both string and object types)
  const getRoleName = (role: string | Role | null | undefined): string => {
    if (typeof role === 'string') return role;
    if (role && typeof role === 'object' && role.name) return role.name;
    return '';
  };

  // Check if current user can select managers (Admin or Board)
  const roleName = getRoleName(user?.role);
  const canSelectManager = roleName === 'admin' || roleName === 'board';

  // Set initial projectManagerId and managerCode when user is available
  useEffect(() => {
    if (user && (!wizardData.projectManagerId || !wizardData.managerCode)) {
      setWizardData(prev => ({
        ...prev,
        projectManagerId: user.id.toString(),
        managerCode: user.employeeCode || prev.managerCode
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
        contractNumber: contract.contractNumber || '',
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
        ipPool: sub.ipPool, // NOWE - zachowaj pulę IP
        taskDetails: (sub.tasks || []).map(task => ({
          id: task.id, // WAŻNE - zachowaj ID zadania
          taskType: task.taskType as TaskDetail['taskType'],
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
      const usersResponse = await adminService.getAllUsers();
      
      // DODAJ: Zabezpieczenie przed nieprawidłowym typem danych
      const users = Array.isArray(usersResponse) ? usersResponse : [];
      
      if (users.length === 0) {
        console.warn('getAllUsers() returned empty array or invalid data');
      }
      
      // Filter for active users with manager, admin, or board roles
      const managers = users.filter(u => 
        u.active && (u.role?.name === 'manager' || u.role?.name === 'admin' || u.role?.name === 'board')
      );
      
      // Jeśli nie znaleziono żadnych managerów, dodaj aktualnego użytkownika jako fallback
      if (managers.length === 0 && user) {
        setAvailableManagers([{
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: undefined,
          roleId: 0,
          role: { id: 0, name: user.role || '', permissions: user.permissions || {} },
          active: true,
          forcePasswordChange: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      } else {
        setAvailableManagers(managers);
      }
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
      } else {
        // Jeśli nawet user jest niedostępny, ustaw pustą tablicę
        setAvailableManagers([]);
      }
    } finally {
      setLoadingManagers(false);
    }
  };

  // Validate contract number format
  const validateContractNumber = (value: string): boolean => {
    if (!value) return true; // Empty is valid (optional field)
    const regex = /^R\d{7}_[A-Z]$/;
    return regex.test(value);
  };

  // Handle contract number change with validation
  const handleContractNumberChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setWizardData({
      ...wizardData,
      contractNumber: upperValue
    });
    
    if (upperValue && !validateContractNumber(upperValue)) {
      setContractNumberError('Format: R0000001_A (R + 7 cyfr + _ + wielka litera)');
    } else {
      setContractNumberError('');
    }
  };

  // Format kilometraż to XXX,XXX format with leading zeros (used on blur)
  const formatKilometrazDisplay = (value: string): string => {
    if (!value) return '';
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    if (!digitsOnly) return '';
    
    // Limit to 6 digits
    const limited = digitsOnly.slice(0, 6);
    
    // Pad with leading zeros to make 6 digits
    const padded = limited.padStart(6, '0');
    
    // Insert comma after 3rd digit: XXX,XXX
    return `${padded.slice(0, 3)},${padded.slice(3)}`;
  };

  // Handle kilometraż input change (without formatting, just filtering)
  const handleKilometrazInput = (subsystemIndex: number, taskIndex: number, value: string) => {
    // Remove everything except digits and comma
    const cleaned = value.replace(/[^\d,]/g, '').replace(/,/g, '');
    // Limit to 6 digits
    const limited = cleaned.slice(0, 6);
    updateTaskDetail(subsystemIndex, taskIndex, { kilometraz: limited });
  };

  // Handle kilometraż blur (apply formatting)
  const handleKilometrazBlur = (subsystemIndex: number, taskIndex: number, value: string) => {
    const formatted = formatKilometrazDisplay(value);
    updateTaskDetail(subsystemIndex, taskIndex, { kilometraz: formatted });
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

  // Handle manager selection and auto-fill manager code
  const handleManagerChange = (selectedManagerId: string) => {
    const selectedManager = availableManagers.find(m => m.id.toString() === selectedManagerId);
    setWizardData({
      ...wizardData, 
      projectManagerId: selectedManagerId,
      // Automatycznie ustaw employeeCode jako managerCode
      managerCode: selectedManager?.employeeCode || wizardData.managerCode
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
      // CUID - kopiuj dane z LCS
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
      // CUID - kopiuj dane z LCS
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
    setWizardData({ ...wizardData, subsystems: newSubsystems });
  };

  // Update a specific task detail
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
    
    // Synchronizacja LCS -> CUID: jeśli modyfikujemy LCS, zaktualizuj CUID
    const updatedTask = taskDetails[taskIndex];
    if (updatedTask.taskType === 'LCS' && (updates.nazwa !== undefined || updates.miejscowosc !== undefined)) {
      // Znajdź CUID w tym samym podsystemie
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
    // Cast params to appropriate type based on subsystem
    const params = subsystem.type === 'SMW' && 'iloscStacji' in subsystem.params 
      ? subsystem.params as SmwWizardData
      : subsystem.params as Record<string, number | boolean>;

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
        const simpleParams = params as Record<string, number | boolean>;
        for (let i = 0; i < getNumericValue(simpleParams, 'przejazdyKatA'); i++) {
          tasks.push({
            number: '',
            name: `Przejazd Kat A #${i + 1}`,
            type: 'PRZEJAZD_KAT_A',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(simpleParams, 'iloscSKP'); i++) {
          tasks.push({
            number: '',
            name: `SKP #${i + 1}`,
            type: 'SKP',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(simpleParams, 'iloscNastawni'); i++) {
          tasks.push({
            number: '',
            name: `Nastawnia #${i + 1}`,
            type: 'NASTAWNIA',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(simpleParams, 'hasLCS')) {
          tasks.push({
            number: '',
            name: `LCS (${getNumericValue(simpleParams, 'lcsMonitory')} monitorów, ${getNumericValue(simpleParams, 'lcsStanowiska')} stanowisk)`,
            type: 'LCS',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(simpleParams, 'hasCUID')) {
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
        const simpleParams = params as Record<string, number | boolean>;
        for (let i = 0; i < getNumericValue(simpleParams, 'przejazdyKatB'); i++) {
          tasks.push({
            number: '',
            name: `Przejazd Kat B #${i + 1}`,
            type: 'PRZEJAZD_KAT_B',
            subsystemType: subsystem.type
          });
        }
        for (let i = 0; i < getNumericValue(simpleParams, 'iloscNastawni'); i++) {
          tasks.push({
            number: '',
            name: `Nastawnia #${i + 1}`,
            type: 'NASTAWNIA',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(simpleParams, 'hasLCS')) {
          tasks.push({
            number: '',
            name: `LCS (${getNumericValue(simpleParams, 'lcsMonitory')} monitorów, ${getNumericValue(simpleParams, 'lcsStanowiska')} stanowisk)`,
            type: 'LCS',
            subsystemType: subsystem.type
          });
        }
        if (getBooleanValue(simpleParams, 'hasCUID')) {
          tasks.push({
            number: '',
            name: 'CUID',
            type: 'CUID',
            subsystemType: subsystem.type
          });
        }
      }
    }
    // SMW specific - Generate tasks based on smwData
    else if (subsystem.type === 'SMW') {
      const smwData = (subsystem.smwData || params) as SmwWizardData;
      
      // Tasks for each platform of each station
      if (smwData.stations && Array.isArray(smwData.stations)) {
        smwData.stations.forEach((station, stationIdx: number) => {
          if (station.platformCabinets && Array.isArray(station.platformCabinets)) {
            station.platformCabinets.forEach((platform) => {
              const cabinetInfo = platform.cabinets && platform.cabinets.length > 0
                ? ` (${platform.cabinets.length} szaf)`
                : '';
              tasks.push({
                number: '',
                name: `${station.name || `Stacja ${stationIdx + 1}`} - Peron ${platform.platformNumber}${cabinetInfo}`,
                type: 'SMW_PLATFORM',
                subsystemType: subsystem.type
              });
            });
          }
        });
      }
      
      // Task for SOK if enabled
      if (smwData.sokEnabled && smwData.sokConfig) {
        const sokCabinets = smwData.sokConfig.cabinets || [];
        const cabinetInfo = sokCabinets.length > 0 ? ` (${sokCabinets.length} szaf)` : '';
        tasks.push({
          number: '',
          name: `SOK${smwData.sokConfig.nameAddress ? ` - ${smwData.sokConfig.nameAddress}` : ''}${cabinetInfo}`,
          type: 'SMW_SOK',
          subsystemType: subsystem.type
        });
      }
      
      // Task for Extra Viewing Station if enabled
      if (smwData.extraViewingEnabled && smwData.extraViewingConfig) {
        const extraCabinets = smwData.extraViewingConfig.cabinets || [];
        const cabinetInfo = extraCabinets.length > 0 ? ` (${extraCabinets.length} szaf)` : '';
        tasks.push({
          number: '',
          name: `Stanowisko Oglądowe${smwData.extraViewingConfig.nameAddress ? ` - ${smwData.extraViewingConfig.nameAddress}` : ''}${cabinetInfo}`,
          type: 'SMW_EXTRA_VIEWING',
          subsystemType: subsystem.type
        });
      }
      
      // Task for LCS
      if (smwData.lcsConfig) {
        const lcsCabinets = smwData.lcsConfig.cabinets || [];
        const cabinetInfo = lcsCabinets.length > 0 ? ` (${lcsCabinets.length} szaf)` : '';
        tasks.push({
          number: '',
          name: `LCS${cabinetInfo}`,
          type: 'SMW_LCS',
          subsystemType: subsystem.type
        });
      }
      
      // Fallback: If no smwData, generate generic tasks based on simple params
      if (tasks.length === 0 && 'iloscKontenerow' in smwData) {
        for (let i = 0; i < (smwData.iloscKontenerow || 0); i++) {
          tasks.push({
            number: '',
            name: `SMW - Kontener #${i + 1}`,
            type: 'KONTENER',
            subsystemType: subsystem.type
          });
        }
      }
    }
    // SKD specific
    else if (subsystem.type === 'SKD') {
      const simpleParams = params as Record<string, number | boolean>;
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscBudynkow'); i++) {
        tasks.push({
          number: '',
          name: `Budynek SKD #${i + 1}`,
          type: 'BUDYNEK',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscKontenerow'); i++) {
        tasks.push({
          number: '',
          name: `Kontener SKD #${i + 1}`,
          type: 'KONTENER',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscPrzejsc'); i++) {
        tasks.push({
          number: '',
          name: `Przejście #${i + 1}`,
          type: 'PRZEJSCIE',
          subsystemType: subsystem.type
        });
      }
    }
    // Default for other subsystems (SSWiN, CCTV, SDIP, SUG, SSP, LAN, OTK, ZASILANIE)
    else {
      const simpleParams = params as Record<string, number | boolean>;
      const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
      const subsystemLabel = config?.label || 'Zadanie';
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscBudynkow'); i++) {
        tasks.push({
          number: '',
          name: `${subsystemLabel} - Budynek #${i + 1}`,
          type: 'BUDYNEK',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscPomieszczen'); i++) {
        tasks.push({
          number: '',
          name: `${subsystemLabel} - Pomieszczenie #${i + 1}`,
          type: 'POMIESZCZENIE',
          subsystemType: subsystem.type
        });
      }
      for (let i = 0; i < getNumericValue(simpleParams, 'iloscKontenerow'); i++) {
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

  // Get step info for a specific step number
  const getStepInfo = (step: number) => {
    if (step === 1) return { type: 'basic' };
    if (step === 2) return { type: 'selection' };
    
    let stepCount = 2;
    for (let i = 0; i < wizardData.subsystems.length; i++) {
      stepCount++; // Config step
      if (step === stepCount) {
        return { type: 'config', subsystemIndex: i };
      }
      
      if (wizardData.subsystems[i].type === 'SMOKIP_A' || wizardData.subsystems[i].type === 'SMOKIP_B') {
        stepCount++; // Details step
        if (step === stepCount) {
          return { type: 'details', subsystemIndex: i };
        }
      }
    }
    
    stepCount++; // Preview
    if (step === stepCount) return { type: 'preview' };
    
    return { type: 'success' };
  };

  /**
   * Walidacja unikalności pul IP w kontrakcie
   * @returns true jeśli walidacja przeszła, false jeśli są duplikaty
   */
  const validateUniqueIPPools = (): { valid: boolean; error?: string } => {
    // Pobierz wszystkie pule IP z podsystemów (pomiń puste/undefined)
    const ipPools = wizardData.subsystems
      .map((s, index) => ({ 
        ipPool: s.ipPool?.trim(), 
        type: s.type,
        index 
      }))
      .filter(s => s.ipPool); // Tylko podsystemy z przypisaną pulą
    
    // Jeśli żaden podsystem nie ma puli - walidacja przechodzi
    if (ipPools.length === 0) {
      return { valid: true };
    }
    
    // Szukaj duplikatów
    const seen = new Map<string, { type: SubsystemType; index: number }>();
    const duplicates: string[] = [];
    
    for (const pool of ipPools) {
      if (seen.has(pool.ipPool!)) {
        const existing = seen.get(pool.ipPool!)!;
        const config1 = SUBSYSTEM_WIZARD_CONFIG[existing.type];
        const config2 = SUBSYSTEM_WIZARD_CONFIG[pool.type];
        duplicates.push(
          `${config1.label} i ${config2.label} mają tę samą pulę IP: ${pool.ipPool}`
        );
      } else {
        seen.set(pool.ipPool!, { type: pool.type, index: pool.index });
      }
    }
    
    if (duplicates.length > 0) {
      return {
        valid: false,
        error: `Podsystemy w kontrakcie muszą mieć różne pule adresowe IP!\n${duplicates.join('\n')}`
      };
    }
    
    return { valid: true };
  };

  const handleNextStep = () => {
    const stepInfo = getCurrentStepInfo();
    
    // Przed przejściem do Preview - waliduj pule IP
    if (stepInfo.type === 'config' || stepInfo.type === 'details') {
      // Sprawdź czy to ostatni krok przed preview
      const nextStepInfo = getStepInfo(currentStep + 1);
      if (nextStepInfo.type === 'preview') {
        const validation = validateUniqueIPPools();
        if (!validation.valid) {
          setError(validation.error!);
          return; // Nie przechodź dalej
        }
      }
    }
    
    // Przed przejściem do Preview - wygeneruj zadania
    const nextStepInfo = getStepInfo(currentStep + 1);
    if (nextStepInfo.type === 'preview') {
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
          contractNumber: wizardData.contractNumber || undefined,
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
          // For SMW, use smwData if available, otherwise use params
          const params = subsystem.type === 'SMW' && subsystem.smwData 
            ? subsystem.smwData 
            : subsystem.params;
          return {
            type: subsystem.type,
            params: params as Record<string, number | boolean | any>, // Allow complex SMW data
            ipPool: subsystem.ipPool,
            tasks: subsystemTasks.map(t => ({
              number: t.number,
              name: t.name,
              type: t.type
            }))
          };
        });

        const response = await contractService.createContractWithWizard({
          contractNumber: wizardData.contractNumber || undefined,
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
             wizardData.projectManagerId && wizardData.managerCode.length >= 1 && wizardData.managerCode.length <= 5;
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
        <label>
          Numer kontraktu <span className="text-muted">(opcjonalny - auto-generowany)</span>
        </label>
        <input
          type="text"
          value={wizardData.contractNumber}
          onChange={(e) => handleContractNumberChange(e.target.value)}
          placeholder="R0000001_A"
          className={contractNumberError ? 'error' : ''}
        />
        {contractNumberError && <span className="error-text">{contractNumberError}</span>}
      </div>
      
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
              onChange={(e) => handleManagerChange(e.target.value)}
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
        <label>Kod kierownika (do 5 znaków) *</label>
        <input
          type="text"
          value={wizardData.managerCode}
          onChange={(e) => setWizardData({...wizardData, managerCode: e.target.value.toUpperCase().slice(0, 5)})}
          maxLength={5}
          placeholder="np. ABC12"
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
                  <span>{config.label}</span>
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


  const renderConfigStep = (subsystemIndex: number) => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    const config = SUBSYSTEM_WIZARD_CONFIG[subsystem.type];
    
    // Special handling for SMW - single-page comprehensive form
    if (subsystem.type === 'SMW') {
      // Initialize smwData if not present with proper defaults
      const defaultSmwData: SmwWizardData = {
        iloscStacji: 0,
        iloscKontenerow: 0,
        sokEnabled: false,
        extraViewingEnabled: false,
        stations: [],
        sokConfig: { nameAddress: '', cabinets: [] },
        extraViewingConfig: { nameAddress: '', cabinets: [] },
        lcsConfig: { cabinets: [] }
      };

      // Merge with defaults to ensure all properties exist
      const rawSmwData = subsystem.params as SmwWizardData;
      const smwData: SmwWizardData = {
        ...defaultSmwData,
        ...rawSmwData,
        stations: rawSmwData?.stations || [],
        sokConfig: { ...defaultSmwData.sokConfig, ...rawSmwData?.sokConfig },
        extraViewingConfig: { ...defaultSmwData.extraViewingConfig, ...rawSmwData?.extraViewingConfig },
        lcsConfig: { ...defaultSmwData.lcsConfig, ...rawSmwData?.lcsConfig }
      };

      const updateSmwData = (updates: Partial<SmwWizardData>) => {
        const newSubsystems = [...wizardData.subsystems];
        const currentData = (newSubsystems[subsystemIndex].params as SmwWizardData) || smwData;
        newSubsystems[subsystemIndex].params = { ...currentData, ...updates };
        setWizardData({ ...wizardData, subsystems: newSubsystems });
      };

      return (
        <div className="wizard-step-content">
          <h3>Konfiguracja: {config.label}</h3>
          
          {/* Pole puli IP */}
          <div className="form-group">
            <label>Pula adresowa IP (opcjonalnie)</label>
            <input
              type="text"
              value={subsystem.ipPool || ''}
              onChange={(e) => {
                const newSubsystems = [...wizardData.subsystems];
                newSubsystems[subsystemIndex].ipPool = e.target.value.trim();
                setWizardData({...wizardData, subsystems: newSubsystems});
              }}
              placeholder="np. 192.168.1.0/24"
            />
            <small className="form-help">
              Format CIDR (np. 192.168.1.0/24). Każdy podsystem musi mieć unikalną pulę.
            </small>
          </div>

          {/* Basic Configuration */}
          <div className="form-group">
            <label>Ilość Stacji *</label>
            <input
              type="number"
              min={0}
              value={smwData.iloscStacji || 0}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 0;
                const stations = Array.from({ length: count }, (_, i) => ({
                  name: `Stacja ${i + 1}`,
                  platforms: 0,
                  elevators: 0,
                  tunnels: 0,
                  platformCabinets: []
                }));
                updateSmwData({ iloscStacji: count, stations });
              }}
            />
          </div>

          <div className="form-group">
            <label>Ilość kontenerów *</label>
            <input
              type="number"
              min={0}
              value={smwData.iloscKontenerow || 0}
              onChange={(e) => updateSmwData({ iloscKontenerow: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={smwData.sokEnabled || false}
                onChange={(e) => updateSmwData({ sokEnabled: e.target.checked })}
              />
              {' '}SOK
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={smwData.extraViewingEnabled || false}
                onChange={(e) => updateSmwData({ extraViewingEnabled: e.target.checked })}
              />
              {' '}Dodatkowe stanowisko Oglądowe
            </label>
          </div>

          {/* SOK Configuration - if enabled */}
          {smwData.sokEnabled && (
            <div className="smw-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <h4>Konfiguracja SOK</h4>
              <div className="form-group">
                <label>Nazwa/Adres SOK *</label>
                <input
                  type="text"
                  value={smwData.sokConfig?.nameAddress || ''}
                  onChange={(e) => updateSmwData({ 
                    sokConfig: { nameAddress: e.target.value, cabinets: smwData.sokConfig?.cabinets || [] } 
                  })}
                  placeholder="Wprowadź nazwę lub adres"
                />
              </div>

              <div className="form-group">
                <label>Ilość szaf *</label>
                <input
                  type="number"
                  min={0}
                  value={smwData.sokConfig?.cabinets?.length || 0}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 0;
                    const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                      type: 'S1' as const,
                      name: `Szafa SOK ${i + 1}`
                    }));
                    updateSmwData({ sokConfig: { ...smwData.sokConfig, nameAddress: smwData.sokConfig?.nameAddress || '', cabinets } });
                  }}
                />
              </div>

              {(smwData.sokConfig?.cabinets || []).map((cabinet: SmwCabinet, idx: number) => (
                <div key={idx} className="cabinet-config" style={{ marginLeft: '20px', marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                  <h5>Szafa {idx + 1}</h5>
                  <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Typ Szafy</label>
                      <select
                        value={cabinet.type || 'S1'}
                        onChange={(e) => {
                          const newCabinets = [...(smwData.sokConfig?.cabinets || [])];
                          newCabinets[idx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                          updateSmwData({ sokConfig: { ...smwData.sokConfig, nameAddress: smwData.sokConfig?.nameAddress || '', cabinets: newCabinets } });
                        }}
                      >
                        <option value="S1">S1</option>
                        <option value="S2">S2</option>
                        <option value="S3">S3</option>
                        <option value="S4">S4</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Nazwa Szafy</label>
                      <input
                        type="text"
                        value={cabinet.name || ''}
                        onChange={(e) => {
                          const newCabinets = [...(smwData.sokConfig?.cabinets || [])];
                          newCabinets[idx].name = e.target.value;
                          updateSmwData({ sokConfig: { ...smwData.sokConfig, nameAddress: smwData.sokConfig?.nameAddress || '', cabinets: newCabinets } });
                        }}
                        placeholder={`Szafa SOK ${idx + 1}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extra Viewing Station Configuration - if enabled */}
          {smwData.extraViewingEnabled && (
            <div className="smw-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <h4>Konfiguracja Dodatkowego Stanowiska Oglądowego</h4>
              <div className="form-group">
                <label>Nazwa/Adres *</label>
                <input
                  type="text"
                  value={smwData.extraViewingConfig?.nameAddress || ''}
                  onChange={(e) => updateSmwData({ 
                    extraViewingConfig: { nameAddress: e.target.value, cabinets: smwData.extraViewingConfig?.cabinets || [] } 
                  })}
                  placeholder="Wprowadź nazwę lub adres"
                />
              </div>

              <div className="form-group">
                <label>Ilość szaf *</label>
                <input
                  type="number"
                  min={0}
                  value={smwData.extraViewingConfig?.cabinets?.length || 0}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 0;
                    const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                      type: 'S1' as const,
                      name: `Szafa Extra ${i + 1}`
                    }));
                    updateSmwData({ extraViewingConfig: { ...smwData.extraViewingConfig, nameAddress: smwData.extraViewingConfig?.nameAddress || '', cabinets } });
                  }}
                />
              </div>

              {(smwData.extraViewingConfig?.cabinets || []).map((cabinet: SmwCabinet, idx: number) => (
                <div key={idx} className="cabinet-config" style={{ marginLeft: '20px', marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                  <h5>Szafa {idx + 1}</h5>
                  <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Typ Szafy</label>
                      <select
                        value={cabinet.type || 'S1'}
                        onChange={(e) => {
                          const newCabinets = [...(smwData.extraViewingConfig?.cabinets || [])];
                          newCabinets[idx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                          updateSmwData({ extraViewingConfig: { ...smwData.extraViewingConfig, nameAddress: smwData.extraViewingConfig?.nameAddress || '', cabinets: newCabinets } });
                        }}
                      >
                        <option value="S1">S1</option>
                        <option value="S2">S2</option>
                        <option value="S3">S3</option>
                        <option value="S4">S4</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Nazwa Szafy</label>
                      <input
                        type="text"
                        value={cabinet.name || ''}
                        onChange={(e) => {
                          const newCabinets = [...(smwData.extraViewingConfig?.cabinets || [])];
                          newCabinets[idx].name = e.target.value;
                          updateSmwData({ extraViewingConfig: { ...smwData.extraViewingConfig, nameAddress: smwData.extraViewingConfig?.nameAddress || '', cabinets: newCabinets } });
                        }}
                        placeholder={`Szafa Extra ${idx + 1}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stations Configuration */}
          {(smwData.stations || []).map((station, stationIdx) => (
            <div key={stationIdx} className="smw-section" style={{ marginTop: '20px', padding: '15px', border: '2px solid #4CAF50', borderRadius: '4px' }}>
              <h4>Stacja {stationIdx + 1}</h4>
              
              <div className="form-group">
                <label>Nazwa Stacji *</label>
                <input
                  type="text"
                  value={station.name || ''}
                  onChange={(e) => {
                    const newStations = [...smwData.stations];
                    newStations[stationIdx].name = e.target.value;
                    updateSmwData({ stations: newStations });
                  }}
                  placeholder={`Stacja ${stationIdx + 1}`}
                />
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ilość Peronów *</label>
                  <input
                    type="number"
                    min={0}
                    value={station.platforms || 0}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      const newStations = [...smwData.stations];
                      newStations[stationIdx].platforms = count;
                      newStations[stationIdx].platformCabinets = Array.from({ length: count }, (_, i) => ({
                        platformNumber: i + 1,
                        cabinets: []
                      }));
                      updateSmwData({ stations: newStations });
                    }}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ilość Wind *</label>
                  <input
                    type="number"
                    min={0}
                    value={station.elevators || 0}
                    onChange={(e) => {
                      const newStations = [...smwData.stations];
                      newStations[stationIdx].elevators = parseInt(e.target.value) || 0;
                      updateSmwData({ stations: newStations });
                    }}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ilość Tuneli *</label>
                  <input
                    type="number"
                    min={0}
                    value={station.tunnels || 0}
                    onChange={(e) => {
                      const newStations = [...smwData.stations];
                      newStations[stationIdx].tunnels = parseInt(e.target.value) || 0;
                      updateSmwData({ stations: newStations });
                    }}
                  />
                </div>
              </div>

              {/* Platform Cabinets */}
              {(station.platformCabinets || []).map((platformCabinet, platformIdx) => (
                <div key={platformIdx} style={{ marginLeft: '20px', marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '4px' }}>
                  <h5>Peron {platformIdx + 1}</h5>
                  
                  <div className="form-group">
                    <label>Ilość szaf *</label>
                    <input
                      type="number"
                      min={0}
                      value={platformCabinet.cabinets?.length || 0}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                          type: 'S1' as const,
                          name: `Peron ${platformIdx + 1} Szafa ${i + 1}`
                        }));
                        const newStations = [...smwData.stations];
                        newStations[stationIdx].platformCabinets[platformIdx].cabinets = cabinets;
                        updateSmwData({ stations: newStations });
                      }}
                    />
                  </div>

                  {(platformCabinet.cabinets || []).map((cabinet, cabinetIdx) => (
                    <div key={cabinetIdx} style={{ marginLeft: '20px', marginBottom: '10px', padding: '8px', background: '#fff', borderRadius: '4px' }}>
                      <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Typ Szafy</label>
                          <select
                            value={cabinet.type || 'S1'}
                            onChange={(e) => {
                              const newStations = [...smwData.stations];
                              newStations[stationIdx].platformCabinets[platformIdx].cabinets[cabinetIdx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                              updateSmwData({ stations: newStations });
                            }}
                          >
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                            <option value="S4">S4</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Nazwa Szafy</label>
                          <input
                            type="text"
                            value={cabinet.name || ''}
                            onChange={(e) => {
                              const newStations = [...smwData.stations];
                              newStations[stationIdx].platformCabinets[platformIdx].cabinets[cabinetIdx].name = e.target.value;
                              updateSmwData({ stations: newStations });
                            }}
                            placeholder={`Peron ${platformIdx + 1} Szafa ${cabinetIdx + 1}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* LCS Configuration */}
          <div className="smw-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h4>Konfiguracja LCS</h4>
            
            <div className="form-group">
              <label>Ilość szaf LCS *</label>
              <input
                type="number"
                min={0}
                value={smwData.lcsConfig?.cabinets?.length || 0}
                onChange={(e) => {
                  const count = parseInt(e.target.value) || 0;
                  const cabinets: SmwCabinet[] = Array.from({ length: count }, (_, i) => ({
                    type: 'S1' as const,
                    name: `Szafa LCS ${i + 1}`
                  }));
                  updateSmwData({ lcsConfig: { cabinets } });
                }}
              />
            </div>

            {(smwData.lcsConfig?.cabinets || []).map((cabinet: SmwCabinet, idx: number) => (
              <div key={idx} className="cabinet-config" style={{ marginLeft: '20px', marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                <h5>Szafa LCS {idx + 1}</h5>
                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Typ Szafy</label>
                    <select
                      value={cabinet.type || 'S1'}
                      onChange={(e) => {
                        const newCabinets = [...(smwData.lcsConfig?.cabinets || [])];
                        newCabinets[idx].type = e.target.value as 'S1' | 'S2' | 'S3' | 'S4';
                        updateSmwData({ lcsConfig: { cabinets: newCabinets } });
                      }}
                    >
                      <option value="S1">S1</option>
                      <option value="S2">S2</option>
                      <option value="S3">S3</option>
                      <option value="S4">S4</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Nazwa Szafy</label>
                    <input
                      type="text"
                      value={cabinet.name || ''}
                      onChange={(e) => {
                        const newCabinets = [...(smwData.lcsConfig?.cabinets || [])];
                        newCabinets[idx].name = e.target.value;
                        updateSmwData({ lcsConfig: { cabinets: newCabinets } });
                      }}
                      placeholder={`Szafa LCS ${idx + 1}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="wizard-step-content">
        <h3>
          Konfiguracja: {config.label}
          {subsystem.isExisting && (
            <span className="badge badge-info" style={{ marginLeft: '10px', fontSize: '0.85em' }}>Istniejący podsystem</span>
          )}
        </h3>
        
        {subsystem.isExisting && (
          <div className="alert alert-warning">
            ⚠️ Typ podsystemu nie może być zmieniony. Możesz tylko edytować parametry i dodawać nowe zadania.
          </div>
        )}
        
        {/* Pole puli IP */}
        <div className="form-group">
          <label>Pula adresowa IP (opcjonalnie)</label>
          <input
            type="text"
            value={subsystem.ipPool || ''}
            onChange={(e) => {
              const newSubsystems = [...wizardData.subsystems];
              newSubsystems[subsystemIndex].ipPool = e.target.value.trim();
              setWizardData({...wizardData, subsystems: newSubsystems});
            }}
            placeholder="np. 192.168.1.0/24"
          />
          <small className="form-help">
            Format CIDR (np. 192.168.1.0/24). Każdy podsystem musi mieć unikalną pulę.
          </small>
        </div>
        
        {config.fields.map((field) => {
          const params = subsystem.params as Record<string, number | boolean>;
          const paramValue = params[field.name];
          
          // Check dependency
          if (field.dependsOn && !params[field.dependsOn]) {
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
                    const newParams = { ...params };
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
                    const newParams = { ...params };
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
        <h3>Szczegóły zadań: {config.label}</h3>
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
              
              {detail.taskType === 'PRZEJAZD_KAT_A' && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Kilometraż *</label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                      onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
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
                      <option value="KAT E">KAT E</option>
                      <option value="KAT F">KAT F</option>
                    </select>
                  </div>
                </div>
              )}
              
              {detail.taskType === 'PRZEJAZD_KAT_B' && (
                <div className="task-fields">
                  <div className="form-group">
                    <label>Kilometraż *</label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                      onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Kategoria *</label>
                    <select
                      value={detail.kategoria || 'KAT B'}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { 
                        kategoria: e.target.value as TaskDetail['kategoria']
                      })}
                      required
                    >
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
                      placeholder="123456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => handleKilometrazInput(subsystemIndex, idx, e.target.value)}
                      onBlur={(e) => handleKilometrazBlur(subsystemIndex, idx, e.target.value)}
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
                      placeholder="np. 123,456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { kilometraz: e.target.value })}
                    />
                    <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
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
                      placeholder="np. 123,456"
                      value={detail.kilometraz || ''}
                      onChange={(e) => updateTaskDetail(subsystemIndex, idx, { kilometraz: e.target.value })}
                    />
                    <small className="form-help">{OPTIONAL_KILOMETRAZ_HELP}</small>
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
          {tasksBySubsystem.map(({ config, subsystem, tasks }, index) => (
            <div key={index} className="subsystem-tasks">
              <h4>
                {config.label} ({tasks.length} zadań)
                {subsystem.ipPool && (
                  <span className="ip-pool-badge" style={{ marginLeft: '10px', padding: '4px 8px', backgroundColor: '#e3f2fd', borderRadius: '4px', fontSize: '0.85em' }}>
                    🌐 {subsystem.ipPool}
                  </span>
                )}
              </h4>
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
      return { config, subsystem, tasks };
    });

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
          <h2>🧙‍♂️ {editMode ? 'Edycja Kontraktu' : 'Kreator Kontraktu'}</h2>
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
