// src/services/asset.service.ts
// API service for assets (Obiekty)

import api from './api';

export type AssetType = 'PRZEJAZD' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID';
export type AssetCategory = 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F';
export type AssetStatus = 'planned' | 'installed' | 'active' | 'in_service' | 'faulty' | 'inactive' | 'decommissioned';

export interface Asset {
  id: number;
  assetNumber: string;
  assetType: AssetType;
  name: string;
  category: AssetCategory | null;
  status: AssetStatus;
  liniaKolejowa: string | null;
  kilometraz: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  miejscowosc: string | null;
  contractId: number | null;
  contract: {
    id: number;
    contractNumber: string;
    name: string;
  } | null;
  subsystemId: number | null;
  subsystem: {
    id: number;
    subsystemNumber: string;
    systemType: string;
  } | null;
  plannedInstallationDate: string | null;
  actualInstallationDate: string | null;
  warrantyExpiryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetFilters {
  search?: string;
  assetType?: string;
  status?: string;
  contractId?: number;
  subsystemId?: number;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AssetPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const assetService = {
  /**
   * Get all assets with optional filters and pagination
   */
  async getAll(filters?: AssetFilters): Promise<{ data: Asset[]; pagination: AssetPagination }> {
    const response = await api.get('/assets', { params: filters });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  },

  /**
   * Get a single asset by ID
   */
  async getById(id: number): Promise<Asset> {
    const response = await api.get(`/assets/${id}`);
    return response.data.data;
  },

  /**
   * Get a single asset by asset number
   */
  async getByNumber(assetNumber: string): Promise<Asset> {
    const response = await api.get(`/assets/number/${assetNumber}`);
    return response.data.data;
  }
};

export default assetService;
