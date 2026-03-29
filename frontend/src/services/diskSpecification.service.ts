// src/services/diskSpecification.service.ts
// API client for disk specification operations

import api from './api';

export type DiskType = 'HDD_SURVEILLANCE' | 'HDD_ENTERPRISE' | 'SSD';

export interface DiskSpecification {
  id: number;
  warehouseStockId: number;
  capacityTb: number;
  diskType: DiskType;
  compatibleRecorderIds: number[];
  isActive: boolean;
  priority: number;
  warehouseStock?: {
    id: number;
    catalogNumber: string;
    materialName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiskSpecificationDto {
  warehouseStockId: number;
  capacityTb: number;
  diskType?: DiskType;
  compatibleRecorderIds?: number[];
  isActive?: boolean;
  priority?: number;
}

export interface DiskCalculationResult {
  requiredTb: number;
  diskSelections: Array<{
    diskId: number;
    quantity: number;
    capacityTb: number;
    totalTb: number;
  }>;
  totalTb: number;
  totalDisks: number;
}

export const diskSpecificationService = {
  async getAll(): Promise<DiskSpecification[]> {
    const response = await api.get('/disk-specifications');
    return response.data.data || [];
  },

  async getById(id: number): Promise<DiskSpecification> {
    const response = await api.get(`/disk-specifications/${id}`);
    return response.data.data;
  },

  async calculate(params: {
    cameraCount: number;
    recordingDays: number;
    bitrateMbps?: number;
    recorderId?: number;
    diskSlots?: number;
  }): Promise<DiskCalculationResult> {
    const response = await api.post('/disk-specifications/calculate', params);
    return response.data.data;
  },

  async create(data: CreateDiskSpecificationDto): Promise<DiskSpecification> {
    const response = await api.post('/disk-specifications', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<CreateDiskSpecificationDto>): Promise<DiskSpecification> {
    const response = await api.put(`/disk-specifications/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/disk-specifications/${id}`);
  }
};

export default diskSpecificationService;
