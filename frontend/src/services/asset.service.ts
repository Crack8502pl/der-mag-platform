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
   * Get asset by ID with all relations (BOM, tasks, history)
   */
  async getAssetDetails(id: number): Promise<{
    success: boolean;
    data: Asset & {
      contract?: { id: number; contractNumber: string; name: string };
      subsystem?: { id: number; name: string; subsystemType: string };
      devices?: Array<{
        id: number;
        serialNumber: string;
        materialName: string;
        catalogNumber?: string;
        status: string;
      }>;
      tasks?: Array<{
        id: number;
        taskNumber: string;
        name: string;
        status: string;
        taskRole: string;
        scheduledStartDate?: string;
        actualStartDate?: string;
        actualCompletionDate?: string;
      }>;
      statusHistory?: Array<{
        id: number;
        oldStatus: string;
        newStatus: string;
        reason?: string;
        changedAt: string;
        changedBy: { firstName: string; lastName: string };
      }>;
    };
  }> {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },

  /**
   * Get asset's BOM materials
   */
  async getAssetBOM(id: number): Promise<{
    success: boolean;
    data: Array<{
      materialName: string;
      catalogNumber?: string;
      quantity: number;
      unit: string;
      serialNumber?: string;
      deviceId?: number;
    }>;
  }> {
    const response = await api.get(`/assets/${id}/bom`);
    return response.data;
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
