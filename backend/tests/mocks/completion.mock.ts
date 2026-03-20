// tests/mocks/completion.mock.ts
// Helper functions for creating Completion-related mock objects

import { CompletionOrder, CompletionOrderStatus, CompletionDecision } from '../../src/entities/CompletionOrder';
import { CompletionItem, CompletionItemStatus } from '../../src/entities/CompletionItem';
import { Pallet, PalletStatus } from '../../src/entities/Pallet';

/**
 * Creates a mock CompletionOrder with default values
 */
export const createMockCompletionOrder = (overrides: Partial<CompletionOrder> = {}): CompletionOrder => {
  const order: CompletionOrder = {
    id: 1,
    subsystemId: 1,
    subsystem: null as any,
    generatedBomId: 1,
    generatedBom: null as any,
    taskNumber: null,
    assignedToId: 1,
    assignedTo: null as any,
    status: CompletionOrderStatus.CREATED,
    decision: null as any,
    decisionNotes: null as any,
    decisionBy: null as any,
    decisionAt: null as any,
    items: [],
    pallets: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    completedAt: null as any,
    ...overrides,
  };
  return order;
};

/**
 * Creates a mock CompletionItem with default values
 */
export const createMockCompletionItem = (overrides: Partial<CompletionItem> = {}): CompletionItem => {
  const item: CompletionItem = {
    id: 1,
    completionOrderId: 1,
    completionOrder: null as any,
    bomItemId: null,
    bomItem: null as any,
    generatedBomItemId: null,
    taskMaterial: null,
    taskMaterialId: null,
    expectedQuantity: 10,
    scannedQuantity: 0,
    status: CompletionItemStatus.PENDING,
    scannedBarcode: null as any,
    serialNumber: null as any,
    pallet: null as any,
    palletId: null as any,
    scannedBy: null as any,
    scannedAt: null as any,
    notes: null as any,
    warehouseStock: null,
    warehouseStockId: null,
    // New fields for completion page redesign
    lp: 1,
    materialName: '',
    catalogNumber: null as any,
    plannedQuantity: 10,
    stockQuantity: null as any,
    warehouseLocation: null as any,
    requiresSerialNumber: false,
    isSerialized: false,
    serialNumbers: [],
    ...overrides,
  };
  return item;
};

/**
 * Creates a mock Pallet with default values
 */
export const createMockPallet = (overrides: Partial<Pallet> = {}): Pallet => {
  const pallet: Pallet = {
    id: 1,
    palletNumber: 'PAL-001',
    completionOrderId: 1,
    completionOrder: null as any,
    items: [],
    status: PalletStatus.OPEN,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    closedAt: null as any,
    ...overrides,
  };
  return pallet;
};

/**
 * Creates a mock CompletionProgress object
 */
export const createMockCompletionProgress = (overrides: {
  totalItems?: number;
  scannedItems?: number;
  missingItems?: number;
  partialItems?: number;
} = {}) => {
  const totalItems = overrides.totalItems ?? 5;
  const scannedItems = overrides.scannedItems ?? 2;
  const missingItems = overrides.missingItems ?? 0;
  const partialItems = overrides.partialItems ?? 0;

  return {
    totalItems,
    scannedItems,
    missingItems,
    partialItems,
    pendingItems: totalItems - scannedItems - missingItems - partialItems,
    completionPercentage: totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0,
  };
};
