// src/types/completion.types.ts
// Types for completion/scanner functionality

export const CompletionOrderStatus = {
  CREATED: 'CREATED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_DECISION: 'WAITING_DECISION',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export type CompletionOrderStatus = typeof CompletionOrderStatus[keyof typeof CompletionOrderStatus];

export const CompletionItemStatus = {
  PENDING: 'PENDING',
  SCANNED: 'SCANNED',
  MISSING: 'MISSING',
  PARTIAL: 'PARTIAL'
} as const;

export type CompletionItemStatus = typeof CompletionItemStatus[keyof typeof CompletionItemStatus];

export const CompletionDecision = {
  CONTINUE_PARTIAL: 'CONTINUE_PARTIAL',
  WAIT_FOR_COMPLETE: 'WAIT_FOR_COMPLETE'
} as const;

export type CompletionDecision = typeof CompletionDecision[keyof typeof CompletionDecision];

export interface TemplateItem {
  id: number;
  partNumber: string;
  name: string;
  description?: string;
  unit: string;
}

export interface BomItem {
  id: number;
  quantity: number;
  templateItem?: TemplateItem;
}

export interface CompletionItem {
  id: number;
  completionOrderId: number;
  bomItemId: number;
  bomItem?: BomItem;
  status: CompletionItemStatus;
  scannedBarcode?: string;
  serialNumber?: string;
  palletId?: number;
  scannedQuantity: number;
  scannedBy?: number;
  scannedAt?: string;
  notes?: string;
}

export interface Pallet {
  id: number;
  palletNumber: string;
  status: string;
  completionOrderId: number;
}

export interface CompletionProgress {
  totalItems: number;
  scannedItems: number;
  missingItems: number;
  partialItems: number;
  pendingItems: number;
  completionPercentage: number;
}

export interface CompletionOrder {
  id: number;
  subsystemId: number;
  generatedBomId: number;
  assignedToId: number;
  status: CompletionOrderStatus;
  decision?: CompletionDecision;
  decisionNotes?: string;
  decisionBy?: number;
  decisionAt?: string;
  items: CompletionItem[];
  pallets?: Pallet[];
  createdAt: string;
  completedAt?: string;
  progress?: CompletionProgress;
  subsystem?: {
    id: number;
    name: string;
  };
  assignedTo?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface ScanItemRequest {
  barcode: string;
  quantity?: number;
}

export interface ScanItemResponse {
  success: boolean;
  message: string;
  data: {
    scannedItem: CompletionItem;
    remainingItems: number;
    totalItems: number;
    scannedItems: number;
  };
}

export interface ReportMissingRequest {
  itemId: number;
  notes?: string;
}

export interface AssignPalletRequest {
  itemIds: number[];
  palletCode: string;
}

export interface MakeDecisionRequest {
  decision: CompletionDecision;
  notes?: string;
}

export interface ScanResult {
  barcode: string;
  timestamp: Date;
  success: boolean;
  itemName?: string;
}
