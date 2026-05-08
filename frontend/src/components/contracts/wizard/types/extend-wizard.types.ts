import type { SubsystemWizardData, TaskDetail, WizardTaskRelationships, InfrastructureData, LogisticsData } from './wizard.types';
import type { SubsystemType } from '../../../../config/subsystemWizardConfig';
import type { TopologyNode, TopologyConnection } from '../../../../types/network-topology.types';

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
  /** Original relationships loaded from backend – preserved to detect edits */
  existingTaskRelationships?: WizardTaskRelationships;
  infrastructure?: InfrastructureData;
  logistics?: Partial<LogisticsData>;
  networkTopologies?: Record<number | string, { nodes: TopologyNode[]; connections: TopologyConnection[] }>;
  customOrdersEnabled?: boolean;
  taskConfigurations?: Record<string, import('./wizard.types').TaskConfiguration>;
  customOrders?: import('./wizard.types').CustomOrderItem[];
}

export interface ExtendStepInfo {
  type: 'review' | 'subsystems-overview' | 'config' | 'details' | 'add-tasks' | 'relationships' | 'topology' | 'infrastructure' | 'logistics' | 'task-config' | 'custom-orders' | 'preview' | 'success';
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
