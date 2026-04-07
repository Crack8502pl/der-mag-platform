// src/components/contracts/wizard/types/wizard.types.ts
// Type definitions for Contract Wizard

import type { SubsystemType, SmwWizardData } from '../../../../config/subsystemWizardConfig';
import type { Contract } from '../../../../services/contract.service';
import type { FiberConnection } from '../../../../types/fiber.types';

export interface WizardProps {
  onClose: () => void;
  onSuccess: () => void;
  editMode?: boolean;
  contractToEdit?: Contract;
  onRequestShipping?: (contractId: number) => void;
  onRequestShippingForContract?: (contract: Contract) => void;
}

export interface TaskDetail {
  id?: number;
  /** Stable wizard-session ID (UUID) assigned at creation; used for CUID-LCS linking. */
  taskWizardId?: string;
  taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID' | 'SMW_PLATFORM' | 'SMW_SOK' | 'SMW_LCS' | 'SMW_EXTRA_VIEWING';
  kilometraz?: string;
  kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F';
  nazwa?: string;
  miejscowosc?: string;
  smwCabinets?: Array<{ type: string; name: string }>;
  liniaKolejowa?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  googleMapsUrl?: string;
  fiberConnections?: FiberConnection[];
  hasCUID?: boolean; // For LCS tasks: whether a CUiD task has been linked to this LCS
  /** Stable LCS `taskWizardId` that this CUID task was created for (used for targeted removal). */
  linkedLCSId?: string;
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
  liniaKolejowa?: string; // Optional railway line field
  detectedRailwayLine?: string; // Auto-detected from contract name (e.g. "LK123")
  subsystems: SubsystemWizardData[];
}

export interface GeneratedTask {
  number: string;
  name: string;
  type: string;
  subsystemType: SubsystemType;
}

export interface StepInfo {
  type: 'basic' | 'selection' | 'config' | 'details' | 'preview' | 'success' | 'shipping';
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
  onNext?: () => void;  // Optional - only needed for SmwConfigStep's internal multi-step navigation
  onPrev?: () => void;  // Optional - only needed for SmwConfigStep's internal multi-step navigation
}
