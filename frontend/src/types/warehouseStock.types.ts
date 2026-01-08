// src/types/warehouseStock.types.ts
// Types for Warehouse Stock module

export enum MaterialType {
  CONSUMABLE = 'consumable',
  DEVICE = 'device',
  TOOL = 'tool',
  COMPONENT = 'component'
}

export enum StockStatus {
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
  ORDERED = 'ORDERED'
}

export enum StockOperationType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
  RESERVED = 'RESERVED',
  RESERVATION_RELEASED = 'RESERVATION_RELEASED',
  ASSIGNED_TO_SUBSYSTEM = 'ASSIGNED_TO_SUBSYSTEM',
  ASSIGNED_TO_TASK = 'ASSIGNED_TO_TASK',
  MAPPED_TO_BOM = 'MAPPED_TO_BOM',
  MAPPED_TO_WORKFLOW = 'MAPPED_TO_WORKFLOW',
  PRICE_UPDATE = 'PRICE_UPDATE',
  LOCATION_CHANGE = 'LOCATION_CHANGE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  IMPORT = 'IMPORT'
}

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
