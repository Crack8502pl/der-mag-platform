// src/components/contracts/wizard/hooks/useExtendWizardState.ts
// Custom hook for managing extend wizard state

import { useState } from 'react';
import { detectSubsystemTypes, detectRailwayLine } from '../../../../config/subsystemWizardConfig';
import type { SubsystemType } from '../../../../config/subsystemWizardConfig';
import contractService from '../../../../services/contract.service';
import { SUBSYSTEM_WIZARD_CONFIG } from '../../../../config/subsystemWizardConfig';
import type { ExtendWizardData, ExistingSubsystem } from '../types/extend-wizard.types';
import type { SubsystemWizardData, TaskDetail, InfrastructureData, TaskInfrastructure, LogisticsData, WizardTaskRelationships } from '../types/wizard.types';
import { formatKilometrazDisplay, cleanKilometrazInput } from '../utils/validation';
import taskRelationshipService from '../../../../services/taskRelationship.service';

interface UseExtendWizardStateProps {
  contractId: number;
  contractNumber: string;
  customName: string;
  orderDate: string;
  projectManagerId: string;
  managerCode?: string;
  liniaKolejowa?: string;
}

interface UseExtendWizardStateReturn {
  extendData: ExtendWizardData;
  detectedSubsystems: SubsystemType[];
  setDetectedSubsystems: (subsystems: SubsystemType[]) => void;
  detectSubsystems: (name: string) => void;
  loadContractData: (setLoading: (loading: boolean) => void, setError: (error: string) => void) => Promise<void>;

  // Existing subsystems management
  toggleAddingNewTasks: (subsystemId: number) => void;
  addTaskToExisting: (subsystemId: number, taskType: TaskDetail['taskType']) => void;
  removeTaskFromExisting: (subsystemId: number, taskIndex: number) => void;
  updateExistingTaskDetail: (subsystemId: number, taskIndex: number, updates: Partial<TaskDetail>) => void;

  // New subsystems management
  addNewSubsystem: (type: SubsystemType) => void;
  removeNewSubsystem: (index: number) => void;
  updateNewSubsystemParams: (index: number, params: Record<string, number | boolean>) => void;
  initializeNewSubsystemTasks: (index: number) => void;
  updateNewTaskDetail: (subsystemIndex: number, taskIndex: number, updates: Partial<TaskDetail>) => void;
  addNewTaskDetail: (subsystemIndex: number, taskType: TaskDetail['taskType']) => void;
  removeNewTaskDetail: (subsystemIndex: number, taskIndex: number) => void;

  // Common helpers
  handleKilometrazInput: (key: 'existing' | 'new', subsystemIdOrIndex: number, taskIndex: number, value: string) => void;
  handleKilometrazBlur: (key: 'existing' | 'new', subsystemIdOrIndex: number, taskIndex: number, value: string) => void;
  canProceedFromDetails: (key: 'existing' | 'new', subsystemIdOrIndex: number) => boolean;

  // Global updates
  updateExtendData: (updates: Partial<ExtendWizardData>) => void;
  updateInfrastructure: (data: Partial<InfrastructureData>) => void;
  updateTaskInfrastructure: (taskNumber: string, data: Partial<TaskInfrastructure>) => void;
  updateLogistics: (data: Partial<LogisticsData>) => void;
  clearInfrastructure: () => void;
  clearLogistics: () => void;
}

export const useExtendWizardState = ({
  contractId,
  contractNumber,
  customName,
  orderDate,
  projectManagerId,
  managerCode = '',
  liniaKolejowa = ''
}: UseExtendWizardStateProps): UseExtendWizardStateReturn => {

  const [extendData, setExtendData] = useState<ExtendWizardData>({
    contractId,
    contractNumber,
    customName,
    orderDate,
    projectManagerId,
    managerCode,
    liniaKolejowa,
    existingSubsystems: [],
    newSubsystems: [],
    taskRelationships: {}
  });

  const [detectedSubsystems, setDetectedSubsystems] = useState<SubsystemType[]>([]);

  const loadContractData = async (
    setLoading: (loading: boolean) => void,
    setError: (error: string) => void
  ) => {
    try {
      setLoading(true);

      const subsystemsResponse = await contractService.getContractSubsystems(contractId);
      const subsystems = subsystemsResponse.data || [];

      const existingSubsystems: ExistingSubsystem[] = subsystems
        .filter(sub => {
          const systemType = (sub.systemType || sub.type) as SubsystemType;
          if (!SUBSYSTEM_WIZARD_CONFIG[systemType]) {
            console.warn(`[useExtendWizardState] Unknown subsystem type "${sub.systemType}" – skipping.`);
            return false;
          }
          return true;
        })
        .map(sub => {
          const systemType = (sub.systemType || sub.type) as SubsystemType;
          const tasks: TaskDetail[] = (sub.tasks || []).map(task => {
            const meta = task.metadata || {};
            return {
              id: task.id,
              taskNumber: task.taskNumber,
              taskType: task.taskType as TaskDetail['taskType'],
              nazwa: task.taskName || meta.nazwa || '',
              kilometraz: meta.kilometraz || '',
              kategoria: meta.kategoria || undefined,
              miejscowosc: meta.miejscowosc || '',
              nazwaNastawnii: meta.nazwaNastawnii || '',
              nazwaLCS: meta.nazwaLCS || '',
              liniaKolejowa: meta.liniaKolejowa || '',
              gpsLatitude: meta.gpsLatitude?.toString() || '',
              gpsLongitude: meta.gpsLongitude?.toString() || '',
              googleMapsUrl: meta.googleMapsUrl || '',
              taskWizardId: meta.taskWizardId || `existing-${task.taskNumber}`
            } as TaskDetail;
          });

          return {
            id: sub.id,
            type: systemType,
            taskCount: tasks.length,
            existingTasks: tasks,
            newTasks: [],
            addingNewTasks: false,
            ipPool: sub.ipPool
          } as ExistingSubsystem;
        });

      // Load task relationships for SMOKIP subsystems that have LCS or NASTAWNIA parent tasks.
      // Relationships for other subsystem types or task types are not used by the extend wizard.
      const taskRelationships: WizardTaskRelationships = {};
      for (const sub of existingSubsystems) {
        if ((sub.type !== 'SMOKIP_A' && sub.type !== 'SMOKIP_B') || !sub.id) continue;
        if (!sub.existingTasks.some(t => t.taskType === 'LCS' || t.taskType === 'NASTAWNIA')) continue;

        try {
          const rels = await taskRelationshipService.getBySubsystem(sub.id);
          for (const rel of rels) {
            const parentTask = sub.existingTasks.find(t => t.taskNumber === rel.parentTaskNumber);
            if (!parentTask?.taskWizardId) continue;

            taskRelationships[parentTask.taskWizardId] = {
              parentWizardId: parentTask.taskWizardId,
              parentType: rel.parentType,
              childTaskKeys: rel.children
                .map(child => {
                  const childTask = sub.existingTasks.find(t => t.taskNumber === child.childTaskNumber);
                  return childTask?.taskWizardId ?? `existing-${child.childTaskNumber}`;
                })
                .filter(Boolean)
            };
          }
        } catch (err) {
          console.warn(`[useExtendWizardState] Could not load relationships for subsystem ${sub.id} (non-fatal):`, err);
        }
      }

      setExtendData(prev => ({ ...prev, existingSubsystems, taskRelationships }));
    } catch (err) {
      console.error('[useExtendWizardState] Load error:', err);
      setError('Nie udało się wczytać danych kontraktu');
    } finally {
      setLoading(false);
    }
  };

  const toggleAddingNewTasks = (subsystemId: number) => {
    setExtendData(prev => ({
      ...prev,
      existingSubsystems: prev.existingSubsystems.map(sub =>
        sub.id === subsystemId ? { ...sub, addingNewTasks: !sub.addingNewTasks, newTasks: [] } : sub
      )
    }));
  };

  const addTaskToExisting = (subsystemId: number, taskType: TaskDetail['taskType']) => {
    setExtendData(prev => {
      const subsystem = prev.existingSubsystems.find(s => s.id === subsystemId);
      if (!subsystem) return prev;

      const newTask: TaskDetail = {
        taskType,
        taskWizardId: taskType === 'LCS' ? crypto.randomUUID() : `extend-${subsystemId}-${Date.now()}`,
        kilometraz: '',
        nazwa: '',
        kategoria: taskType === 'PRZEJAZD_KAT_A' ? 'KAT A' : taskType === 'PRZEJAZD_KAT_B' ? 'KAT B' : undefined
      };

      return {
        ...prev,
        existingSubsystems: prev.existingSubsystems.map(sub =>
          sub.id === subsystemId ? { ...sub, newTasks: [...sub.newTasks, newTask] } : sub
        )
      };
    });
  };

  const removeTaskFromExisting = (subsystemId: number, taskIndex: number) => {
    setExtendData(prev => ({
      ...prev,
      existingSubsystems: prev.existingSubsystems.map(sub =>
        sub.id === subsystemId
          ? { ...sub, newTasks: sub.newTasks.filter((_, idx) => idx !== taskIndex) }
          : sub
      )
    }));
  };

  const updateExistingTaskDetail = (subsystemId: number, taskIndex: number, updates: Partial<TaskDetail>) => {
    setExtendData(prev => ({
      ...prev,
      existingSubsystems: prev.existingSubsystems.map(sub =>
        sub.id === subsystemId
          ? { ...sub, newTasks: sub.newTasks.map((task, idx) => idx === taskIndex ? { ...task, ...updates } : task) }
          : sub
      )
    }));
  };

  const detectSubsystems = (name: string) => {
    const detected = detectSubsystemTypes(name);
    const railwayLine = detectRailwayLine(name);
    setDetectedSubsystems(detected);
    setExtendData(prev => ({ ...prev, customName: name, liniaKolejowa: railwayLine || prev.liniaKolejowa }));
  };

  const addNewSubsystem = (type: SubsystemType) => {
    const config = SUBSYSTEM_WIZARD_CONFIG[type];
    if (!config) return;

    const newSubsystem: SubsystemWizardData = { type, params: {}, taskDetails: [], ipPool: '' };
    setExtendData(prev => ({ ...prev, newSubsystems: [...prev.newSubsystems, newSubsystem] }));
  };

  const removeNewSubsystem = (index: number) => {
    setExtendData(prev => ({
      ...prev,
      newSubsystems: prev.newSubsystems.filter((_, idx) => idx !== index)
    }));
  };

  const updateNewSubsystemParams = (index: number, params: Record<string, number | boolean>) => {
    setExtendData(prev => ({
      ...prev,
      newSubsystems: prev.newSubsystems.map((sub, idx) => idx === index ? { ...sub, params } : sub)
    }));
  };

  const getNumericParam = (params: Record<string, number | boolean>, key: string): number => {
    const value = params[key];
    return typeof value === 'number' ? value : 0;
  };

  const initializeNewSubsystemTasks = (index: number) => {
    setExtendData(prev => {
      const subsystem = prev.newSubsystems[index];
      if (!subsystem || (subsystem.type !== 'SMOKIP_A' && subsystem.type !== 'SMOKIP_B')) return prev;

      const params = subsystem.params as Record<string, number | boolean>;
      const taskDetails: TaskDetail[] = [];

      if (subsystem.type === 'SMOKIP_A') {
        const przejazdyKatA = getNumericParam(params, 'przejazdyKatA');
        for (let i = 0; i < przejazdyKatA; i++) {
          taskDetails.push({ taskType: 'PRZEJAZD_KAT_A', kilometraz: '', kategoria: 'KAT A' });
        }

        const iloscSKP = getNumericParam(params, 'iloscSKP');
        for (let i = 0; i < iloscSKP; i++) {
          taskDetails.push({ taskType: 'SKP', kilometraz: '' });
        }

        const iloscNastawni = getNumericParam(params, 'iloscNastawni');
        for (let i = 0; i < iloscNastawni; i++) {
          taskDetails.push({ taskType: 'NASTAWNIA', nazwa: '', miejscowosc: '' });
        }

        const hasLCS = getNumericParam(params, 'hasLCS');
        for (let i = 0; i < hasLCS; i++) {
          taskDetails.push({ taskType: 'LCS', nazwa: '', miejscowosc: '', taskWizardId: crypto.randomUUID() });
        }
      } else if (subsystem.type === 'SMOKIP_B') {
        const przejazdyKatB = getNumericParam(params, 'przejazdyKatB');
        for (let i = 0; i < przejazdyKatB; i++) {
          taskDetails.push({ taskType: 'PRZEJAZD_KAT_B', kilometraz: '', kategoria: 'KAT B' });
        }

        const iloscNastawni = getNumericParam(params, 'iloscNastawni');
        for (let i = 0; i < iloscNastawni; i++) {
          taskDetails.push({ taskType: 'NASTAWNIA', nazwa: '', miejscowosc: '' });
        }

        const hasLCS = getNumericParam(params, 'hasLCS');
        for (let i = 0; i < hasLCS; i++) {
          taskDetails.push({ taskType: 'LCS', nazwa: '', miejscowosc: '', taskWizardId: crypto.randomUUID() });
        }
      }

      return {
        ...prev,
        newSubsystems: prev.newSubsystems.map((sub, idx) => idx === index ? { ...sub, taskDetails } : sub)
      };
    });
  };

  const updateNewTaskDetail = (subsystemIndex: number, taskIndex: number, updates: Partial<TaskDetail>) => {
    setExtendData(prev => ({
      ...prev,
      newSubsystems: prev.newSubsystems.map((sub, sIdx) =>
        sIdx === subsystemIndex
          ? { ...sub, taskDetails: sub.taskDetails?.map((task, tIdx) => tIdx === taskIndex ? { ...task, ...updates } : task) }
          : sub
      )
    }));
  };

  const addNewTaskDetail = (subsystemIndex: number, taskType: TaskDetail['taskType']) => {
    const newTask: TaskDetail = {
      taskType,
      taskWizardId: taskType === 'LCS' ? crypto.randomUUID() : `new-extra-${subsystemIndex}-${Date.now()}`,
      kilometraz: '',
      nazwa: '',
      kategoria: taskType === 'PRZEJAZD_KAT_A' ? 'KAT A' : taskType === 'PRZEJAZD_KAT_B' ? 'KAT B' : undefined
    };

    setExtendData(prev => ({
      ...prev,
      newSubsystems: prev.newSubsystems.map((sub, idx) =>
        idx === subsystemIndex ? { ...sub, taskDetails: [...(sub.taskDetails || []), newTask] } : sub
      )
    }));
  };

  const removeNewTaskDetail = (subsystemIndex: number, taskIndex: number) => {
    setExtendData(prev => ({
      ...prev,
      newSubsystems: prev.newSubsystems.map((sub, sIdx) =>
        sIdx === subsystemIndex
          ? { ...sub, taskDetails: sub.taskDetails?.filter((_, tIdx) => tIdx !== taskIndex) }
          : sub
      )
    }));
  };

  const handleKilometrazInput = (key: 'existing' | 'new', subsystemIdOrIndex: number, taskIndex: number, value: string) => {
    const cleaned = cleanKilometrazInput(value);
    if (key === 'existing') {
      updateExistingTaskDetail(subsystemIdOrIndex, taskIndex, { kilometraz: cleaned });
    } else {
      updateNewTaskDetail(subsystemIdOrIndex, taskIndex, { kilometraz: cleaned });
    }
  };

  const handleKilometrazBlur = (key: 'existing' | 'new', subsystemIdOrIndex: number, taskIndex: number, value: string) => {
    const formatted = formatKilometrazDisplay(value);
    if (key === 'existing') {
      updateExistingTaskDetail(subsystemIdOrIndex, taskIndex, { kilometraz: formatted });
    } else {
      updateNewTaskDetail(subsystemIdOrIndex, taskIndex, { kilometraz: formatted });
    }
  };

  const canProceedFromDetails = (key: 'existing' | 'new', subsystemIdOrIndex: number): boolean => {
    if (key === 'existing') {
      const subsystem = extendData.existingSubsystems.find(s => s.id === subsystemIdOrIndex);
      if (!subsystem || !subsystem.addingNewTasks) return true;
      return subsystem.newTasks.every(task => {
        if (task.taskType === 'PRZEJAZD_KAT_A' || task.taskType === 'PRZEJAZD_KAT_B' || task.taskType === 'SKP') {
          return !!task.kilometraz && task.kilometraz.trim() !== '';
        }
        return true;
      });
    } else {
      const subsystem = extendData.newSubsystems[subsystemIdOrIndex];
      if (!subsystem || !subsystem.taskDetails || subsystem.taskDetails.length === 0) return false;
      return subsystem.taskDetails.every(task => {
        if (task.taskType === 'PRZEJAZD_KAT_A' || task.taskType === 'PRZEJAZD_KAT_B' || task.taskType === 'SKP') {
          return !!task.kilometraz && task.kilometraz.trim() !== '';
        }
        return true;
      });
    }
  };

  const updateExtendData = (updates: Partial<ExtendWizardData>) => {
    setExtendData(prev => ({ ...prev, ...updates }));
  };

  const updateInfrastructure = (data: Partial<InfrastructureData>) => {
    setExtendData(prev => ({ ...prev, infrastructure: { ...prev.infrastructure, ...data } }));
  };

  const updateTaskInfrastructure = (taskNumber: string, data: Partial<TaskInfrastructure>) => {
    setExtendData(prev => ({
      ...prev,
      infrastructure: {
        ...prev.infrastructure,
        perTask: {
          ...(prev.infrastructure?.perTask || {}),
          [taskNumber]: { ...(prev.infrastructure?.perTask?.[taskNumber] || {}), ...data }
        }
      }
    }));
  };

  const updateLogistics = (data: Partial<LogisticsData>) => {
    setExtendData(prev => ({ ...prev, logistics: { ...prev.logistics, ...data } }));
  };

  const clearInfrastructure = () => {
    setExtendData(prev => ({ ...prev, infrastructure: undefined }));
  };

  const clearLogistics = () => {
    setExtendData(prev => ({ ...prev, logistics: undefined }));
  };

  return {
    extendData,
    detectedSubsystems,
    setDetectedSubsystems,
    detectSubsystems,
    loadContractData,
    toggleAddingNewTasks,
    addTaskToExisting,
    removeTaskFromExisting,
    updateExistingTaskDetail,
    addNewSubsystem,
    removeNewSubsystem,
    updateNewSubsystemParams,
    initializeNewSubsystemTasks,
    updateNewTaskDetail,
    addNewTaskDetail,
    removeNewTaskDetail,
    handleKilometrazInput,
    handleKilometrazBlur,
    canProceedFromDetails,
    updateExtendData,
    updateInfrastructure,
    updateTaskInfrastructure,
    updateLogistics,
    clearInfrastructure,
    clearLogistics
  };
};
