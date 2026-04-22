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
  /** Actual task number from the backend (e.g. "Z0001MMRR") – set when loading edit mode */
  taskNumber?: string;
  /** Stable wizard-session ID (UUID) assigned at creation; used for CUID-LCS linking. */
  taskWizardId?: string;
  taskType: 'PRZEJAZD_KAT_A' | 'PRZEJAZD_KAT_B' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID' | 'SMW_PLATFORM' | 'SMW_SOK' | 'SMW_LCS' | 'SMW_EXTRA_VIEWING';
  kilometraz?: string;
  kategoria?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F';
  /** Auto-generated read-only task name; derived from type-specific fields. */
  nazwa?: string;
  miejscowosc?: string;
  /** Name/code of the signal box (nastawnia), e.g. "ND GP1". Only for NASTAWNIA tasks. */
  nazwaNastawnii?: string;
  /** Name of the local control centre (LCS), e.g. "LCS Warszawa Wschód". Only for LCS/CUID tasks. */
  nazwaLCS?: string;
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

/**
 * Infrastructure parameters (per task or global)
 */
export type CabinetOption = 'SZAFA_TERENOWA' | 'SZAFA_WEWNETRZNA' | 'KONTENER' | '42U' | '24U';
export type PoleType = 'STALOWY' | 'KOMPOZYT' | 'INNY';

export interface PoleConfig {
  type?: PoleType;
  quantity?: string;
  productInfo?: string;
}

export interface TaskInfrastructure {
  taskNumber?: string;
  cabinetType?: CabinetOption;
  poles?: PoleConfig[];
  terrainNotes?: string;
  // Flag for automatic KOMPLETACJA_SZAF task creation
  generateCabinetCompletion?: boolean;
}

export interface InfrastructureData {
  global?: TaskInfrastructure;
  perTask?: Record<string, TaskInfrastructure>;
}

/**
 * Delivery address with associated task selection
 */
export interface DeliveryAddress {
  address: string;
  taskIds: string[];
}

/**
 * E-mail configuration for order notifications
 */
export interface OrderEmailsConfig {
  cameras?: string;     // E-mail for camera orders
  switches?: string;    // E-mail for switch/network device orders
  recorders?: string;   // E-mail for recorder orders
  general?: string;     // General e-mail for other items
  warehouse?: string;   // E-mail for warehouse person (not in system – notifications only)
  notes?: string;       // Additional notes
}

/**
 * Logistics/Shipping data
 */
export interface LogisticsData {
  deliveryAddress: string;
  deliveryAddresses?: DeliveryAddress[];
  contactPhone: string;
  contactPerson?: string;
  shippingNotes?: string;
  preferredDeliveryDate?: string;
  // E-mail addresses for order notifications
  orderEmails?: OrderEmailsConfig;
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
  infrastructure?: InfrastructureData;
  logistics?: Partial<LogisticsData>;
  /** Task relationships: maps LCS taskWizardId to an array of child task keys */
  taskRelationships?: WizardTaskRelationships;
}

export interface GeneratedTask {
  number: string;
  name: string;
  type: string;
  subsystemType: SubsystemType;
}

export interface StepInfo {
  type: 'basic' | 'selection' | 'config' | 'details' | 'relationships' | 'infrastructure' | 'logistics' | 'preview' | 'success' | 'shipping';
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

/**
 * Wizard task relationship – maps an LCS taskWizardId to child task keys.
 * Child task key format: "{subsystemIndex}-{taskDetailIndex}"
 */
export interface WizardLCSRelationship {
  lcsWizardId: string;
  /** Array of "{subsystemIndex}-{taskDetailIndex}" keys for assigned children */
  childTaskKeys: string[];
}

/**
 * All task relationships in the wizard, keyed by LCS taskWizardId.
 */
export type WizardTaskRelationships = Record<string, WizardLCSRelationship>;

