import type { SubsystemWizardData, TaskDetail, WizardTaskRelationships, InfrastructureData, LogisticsData } from './wizard.types';
import type { SubsystemType } from '../../../../config/subsystemWizardConfig';

export interface ExistingSubsystem {
  id: number;
  type: SubsystemType;
  taskCount: number;
  existingTasks: TaskDetail[];
  newTasks: TaskDetail[];
  addingNewTasks: boolean;
  ipPool?: string;
}

export interface ExtendWizardData {
  contractId: number;
  contractNumber: string;
  customName: string;
  orderDate: string;
  projectManagerId: string;
  managerCode: string;
  liniaKolejowa?: string;
  existingSubsystems: ExistingSubsystem[];
  newSubsystems: SubsystemWizardData[];
  taskRelationships?: WizardTaskRelationships;
  infrastructure?: InfrastructureData;
  logistics?: Partial<LogisticsData>;
}

export interface ExtendStepInfo {
  type: 'review' | 'subsystems-overview' | 'config' | 'details' | 'add-tasks' | 'relationships' | 'infrastructure' | 'logistics' | 'preview' | 'success';
  subsystemIndex?: number;
  isNew?: boolean;
}

export interface ExtendContractPayload {
  newSubsystems: Array<{ type: SubsystemType; params: Record<string, unknown>; taskDetails?: TaskDetail[]; ipPool?: string; }>;
  extendedSubsystems: Array<{ id: number; type: SubsystemType; newTasks: TaskDetail[]; }>;
  taskRelationships?: WizardTaskRelationships;
  infrastructure?: InfrastructureData;
  logistics?: Partial<LogisticsData>;
}

export interface ExtendWizardModalProps {
  contract: { id: number; contractNumber: string; customName: string; orderDate: string | Date; projectManagerId?: number; managerCode?: string; liniaKolejowa?: string; status: string; };
  onClose: () => void;
  onSuccess: () => void;
}
