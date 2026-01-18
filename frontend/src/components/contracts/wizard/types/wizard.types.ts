// src/components/contracts/wizard/types/wizard.types.ts
// Type definitions for Contract Wizard

import type { SubsystemType, SmwWizardData } from '../../../../config/subsystemWizardConfig';
import type { Contract } from '../../../../services/contract.service';

export interface WizardProps {
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;
  contractToEdit?: Contract;
}

export interface TaskDetail {
  id?: number;
  taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID' | 'SMW_PLATFORM' | 'SMW_SOK' | 'SMW_LCS' | 'SMW_EXTRA_VIEWING';
  kilometraz?: string;
  kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F';
  nazwa?: string;
  miejscowosc?: string;
  smwCabinets?: Array<{ type: string; name: string }>;
}

export interface SubsystemWizardData {
  id?: number;
  type: SubsystemType;
  params: Record<string, number | boolean> | SmwWizardData;
  taskDetails?: TaskDetail[];
  isExisting?: boolean;
  taskCount?: number;
  ipPool?: string;
  smwData?: SmwWizardData;
  smwStep?: number;
}

export interface WizardData {
  contractNumber: string;
  customName: string;
  orderDate: string;
  projectManagerId: string;
  managerCode: string;
  subsystems: SubsystemWizardData[];
}

export interface GeneratedTask {
  number: string;
  name: string;
  type: string;
  subsystemType: SubsystemType;
}

export interface StepInfo {
  type: 'basic' | 'subsystem-selection' | 'config' | 'details' | 'preview' | 'success';
  subsystemIndex?: number;
  subsystemType?: SubsystemType;
}

export interface StepProps {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

export interface SubsystemConfigStepProps {
  subsystem: SubsystemWizardData;
  subsystemIndex: number;
  onUpdate: (index: number, updates: Partial<SubsystemWizardData>) => void;
}
