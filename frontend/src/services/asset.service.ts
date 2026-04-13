// src/services/asset.service.ts
// Service for asset management

import api from './api';

export interface Asset {
  id: number;
  assetNumber: string;
  assetType: 'PRZEJAZD' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID';
  name: string;
  category: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F' | null;
  status: 'planned' | 'installed' | 'active' | 'in_service' | 'faulty' | 'inactive' | 'decommissioned';
  liniaKolejowa: string | null;
  kilometraz: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  miejscowosc: string | null;
  contractId: number | null;
  subsystemId: number | null;
  actualInstallationDate: string | null;
  warrantyExpiryDate: string | null;
  lastServiceDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListResponse {
  success: boolean;
  data: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssetStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface AssetFilters {
  assetType?: string;
  status?: string;
  contractId?: number;
  subsystemId?: number;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface HistoryFilters {
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  status?: string;     // Filter by new status
  userId?: number;     // Filter by user (not used in client-side fallback)
  page?: number;
  limit?: number;      // Default: 20
}

export interface StatusHistoryEntry {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  reason?: string | null;
  changedAt: string;
  changedBy: { id?: number; firstName: string; lastName: string } | null;
}

export interface AssetHistoryResponse {
  data: StatusHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssetDetails extends Asset {
  contract?: { id: number; contractNumber: string; name: string } | null;
  subsystem?: { id: number; name: string; subsystemType: string } | null;
  devices?: Array<{
    id: number;
    serialNumber: string;
    materialName: string;
    status: string;
  }>;
  tasks?: Array<{
    id: number;
    taskNumber: string;
    name: string;
    status: string;
    taskRole: string;
    scheduledStartDate?: string | null;
    actualStartDate?: string | null;
    actualCompletionDate?: string | null;
  }>;
  statusHistory?: Array<{
    id: number;
    oldStatus: string | null;
    newStatus: string;
    reason?: string | null;
    changedAt: string;
    changedBy: { firstName: string; lastName: string } | null;
  }>;
}

const assetService = {
  /**
   * Get all assets with filters and pagination
   */
  async getAssets(filters: AssetFilters = {}): Promise<AssetListResponse> {
    const params: Record<string, string | number> = {};

    if (filters.assetType) params.assetType = filters.assetType;
    if (filters.status) params.status = filters.status;
    if (filters.contractId) params.contractId = filters.contractId;
    if (filters.subsystemId) params.subsystemId = filters.subsystemId;
    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await api.get('/assets', { params });
    return response.data;
  },

  /**
   * Get asset by ID
   */
  async getAssetById(id: number): Promise<Asset> {
    const response = await api.get(`/assets/${id}`);
    return response.data.data;
  },

  /**
   * Get asset by ID with all relations, normalized for display.
   * Maps backend fields: installedDevices→devices, assetTasks→tasks,
   * changedByUser→changedBy, taskName→name, taskRole from AssetTask join.
   */
  async getAssetDetails(id: number): Promise<AssetDetails> {
    const response = await api.get(`/assets/${id}`);
    const raw = response.data.data as Asset & {
      contract?: { id: number; contractNumber: string; name: string } | null;
      subsystem?: { id: number; name: string; subsystemType: string } | null;
      installedDevices?: Array<{
        id: number;
        serialNumber: string;
        deviceType: string;
        deviceModel?: string | null;
        inventoryStatus?: string | null;
        status?: string | null;
      }>;
      assetTasks?: Array<{
        taskRole: string;
        task?: {
          id: number;
          taskNumber: string;
          taskName: string;
          status: string;
          deploymentScheduledAt?: string | null;
          realizationStartedAt?: string | null;
          realizationCompletedAt?: string | null;
        } | null;
      }>;
      statusHistory?: Array<{
        id: number;
        oldStatus: string | null;
        newStatus: string;
        reason?: string | null;
        changedAt: string;
        changedByUser?: { firstName: string; lastName: string } | null;
      }>;
    };

    return {
      ...raw,
      devices: raw.installedDevices?.map(d => ({
        id: d.id,
        serialNumber: d.serialNumber,
        materialName: d.deviceModel || d.deviceType,
        status: d.inventoryStatus || d.status || ''
      })),
      tasks: raw.assetTasks
        ?.filter(at => at.task != null)
        .map(at => ({
          id: at.task!.id,
          taskNumber: at.task!.taskNumber,
          name: at.task!.taskName,
          status: at.task!.status,
          taskRole: at.taskRole,
          scheduledStartDate: at.task!.deploymentScheduledAt,
          actualStartDate: at.task!.realizationStartedAt,
          actualCompletionDate: at.task!.realizationCompletedAt
        })),
      statusHistory: raw.statusHistory?.map(h => ({
        id: h.id,
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        changedAt: h.changedAt,
        changedBy: h.changedByUser ?? null
      }))
    };
  },

  /**
   * Get devices installed on an asset (GET /assets/:id/devices)
   */
  async getAssetBOM(id: number): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      serialNumber: string;
      deviceType: string;
      deviceModel?: string | null;
      inventoryStatus?: string | null;
    }>;
  }> {
    const response = await api.get(`/assets/${id}/devices`);
    return response.data;
  },

  /**
   * Get paginated and filtered status history for an asset.
   * Uses data from getAssetDetails as a client-side fallback (backend endpoint not yet available).
   */
  async getAssetStatusHistory(
    assetId: number,
    filters?: HistoryFilters
  ): Promise<AssetHistoryResponse> {
    const details = await assetService.getAssetDetails(assetId);
    let history: StatusHistoryEntry[] = (details.statusHistory ?? []).map(h => ({
      ...h,
      changedBy: h.changedBy
    }));

    // Apply client-side filters
    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      history = history.filter(h => new Date(h.changedAt) >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      history = history.filter(h => new Date(h.changedAt) <= end);
    }
    if (filters?.status) {
      history = history.filter(h => h.newStatus === filters.status);
    }

    // Sort descending (newest first)
    history.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const total = history.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = history.slice(start, start + limit);

    return {
      data: paginated,
      pagination: { page, limit, total, totalPages }
    };
  },

  /**
   * Get asset statistics
   */
  async getAssetStats(): Promise<AssetStats> {
    const response = await api.get('/assets/stats');
    return response.data.data;
  }
};

export default assetService;
