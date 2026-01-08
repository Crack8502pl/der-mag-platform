// src/types/warehouseStock.types.ts
// Types for Warehouse Stock module

export type MaterialType = 'consumable' | 'device' | 'tool' | 'component';

export const MaterialType = {
  CONSUMABLE: 'consumable' as MaterialType,
  DEVICE: 'device' as MaterialType,
  TOOL: 'tool' as MaterialType,
  COMPONENT: 'component' as MaterialType
};

export type StockStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED' | 'ORDERED';

export const StockStatus = {
  ACTIVE: 'ACTIVE' as StockStatus,
  OUT_OF_STOCK: 'OUT_OF_STOCK' as StockStatus,
  DISCONTINUED: 'DISCONTINUED' as StockStatus,
  ORDERED: 'ORDERED' as StockStatus
};

export type StockOperationType = 
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'STOCK_ADJUSTMENT'
  | 'RESERVED'
  | 'RESERVATION_RELEASED'
  | 'ASSIGNED_TO_SUBSYSTEM'
  | 'ASSIGNED_TO_TASK'
  | 'MAPPED_TO_BOM'
  | 'MAPPED_TO_WORKFLOW'
  | 'PRICE_UPDATE'
  | 'LOCATION_CHANGE'
  | 'STATUS_CHANGE'
  | 'IMPORT';

export const StockOperationType = {
  CREATED: 'CREATED' as StockOperationType,
  UPDATED: 'UPDATED' as StockOperationType,
  DELETED: 'DELETED' as StockOperationType,
  STOCK_IN: 'STOCK_IN' as StockOperationType,
  STOCK_OUT: 'STOCK_OUT' as StockOperationType,
  STOCK_ADJUSTMENT: 'STOCK_ADJUSTMENT' as StockOperationType,
  RESERVED: 'RESERVED' as StockOperationType,
  RESERVATION_RELEASED: 'RESERVATION_RELEASED' as StockOperationType,
  ASSIGNED_TO_SUBSYSTEM: 'ASSIGNED_TO_SUBSYSTEM' as StockOperationType,
  ASSIGNED_TO_TASK: 'ASSIGNED_TO_TASK' as StockOperationType,
  MAPPED_TO_BOM: 'MAPPED_TO_BOM' as StockOperationType,
  MAPPED_TO_WORKFLOW: 'MAPPED_TO_WORKFLOW' as StockOperationType,
  PRICE_UPDATE: 'PRICE_UPDATE' as StockOperationType,
  LOCATION_CHANGE: 'LOCATION_CHANGE' as StockOperationType,
  STATUS_CHANGE: 'STATUS_CHANGE' as StockOperationType,
  IMPORT: 'IMPORT' as StockOperationType
};

export interface WarehouseStock {
  id: number;
  uuid: string;
  catalogNumber: string;
  materialName: string;
  description?: string;
  category?: string;
  subcategory?: string;
  materialType: MaterialType;
  unit: string;
  quantityInStock: number;
  quantityReserved: number;
  quantityAvailable: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  warehouseLocation?: string;
  storageZone?: string;
  supplier?: string;
  supplierCatalogNumber?: string;
  manufacturer?: string;
  partNumber?: string;
  unitPrice?: number;
  purchasePrice?: number;
  lastPurchasePrice?: number;
  averagePrice?: number;
  currency: string;
  isSerialized: boolean;
  isBatchTracked: boolean;
  requiresIpAddress: boolean;
  isActive: boolean;
  isHazardous: boolean;
  requiresCertification: boolean;
  deviceCategory?: string;
  technicalSpecs?: any;
  lastPurchaseDate?: string;
  lastStockCheckDate?: string;
  expiryDate?: string;
  status: StockStatus;
  imageUrl?: string;
  datasheetUrl?: string;
  documents?: any[];
  notes?: string;
  internalNotes?: string;
  createdBy?: any;
  updatedBy?: any;
  createdAt: string;
  updatedAt: string;
}

export interface StockFilters {
  search?: string;
  category?: string;
  supplier?: string;
  status?: StockStatus;
  materialType?: MaterialType;
  lowStock?: boolean;
  warehouseLocation?: string;
}

export interface StockPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WarehouseStockHistory {
  id: number;
  warehouseStockId: number;
  operationType: StockOperationType;
  quantityChange?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  referenceType?: string;
  referenceId?: number;
  details?: any;
  notes?: string;
  performedBy?: any;
  performedAt: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export interface ImportRow {
  rowNumber: number;
  catalog_number: string;
  material_name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  material_type?: string;
  unit?: string;
  quantity_in_stock?: string;
  min_stock_level?: string;
  supplier?: string;
  unit_price?: string;
  warehouse_location?: string;
}

export interface AnalyzedRow extends ImportRow {
  status: 'new' | 'duplicate_catalog' | 'duplicate_name' | 'conflict';
  existingRecord?: WarehouseStock;
  changedFields?: string[];
  validationErrors?: string[];
}

export interface UpdateOptions {
  updateQuantity: boolean;
  updatePrice: boolean;
  updateDescription: boolean;
  updateLocation: boolean;
  updateSupplier: boolean;
  skipDuplicates: boolean;
}

export interface ImportResultDetailed {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; field?: string; error: string }>;
}

export interface AnalyzeResult {
  totalRows: number;
  newRecords: AnalyzedRow[];
  duplicates: AnalyzedRow[];
  errors: AnalyzedRow[];
}

export interface ReserveStockRequest {
  quantity: number;
  referenceType: string;
  referenceId: number;
}

export interface ReleaseStockRequest {
  quantity: number;
  referenceType: string;
  referenceId: number;
}

export interface MapToBomRequest {
  bomTemplateId: number;
  quantityPerUnit?: number;
  isOptional?: boolean;
  isAlternative?: boolean;
  notes?: string;
}

export interface MapToWorkflowBomRequest {
  workflowBomTemplateItemId: number;
  quantityPerUnit?: number;
  isOptional?: boolean;
  isAlternative?: boolean;
  notes?: string;
}
