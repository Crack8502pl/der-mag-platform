// src/services/recorderSpecification.service.ts
// API client for recorder specification operations

import api from './api';

export interface RecorderSpecification {
  id: number;
  warehouseStockId: number;
  modelName: string;
  minCameras: number;
  maxCameras: number;
  diskSlots: number;
  maxStorageTb?: number | null;
  supportedDiskCapacities: number[];
  requiresExtension: boolean;
  extensionWarehouseStockId?: number | null;
  isActive: boolean;
  notes?: string | null;
  warehouseStock?: {
    id: number;
    catalogNumber: string;
    materialName: string;
  };
  extensionWarehouseStock?: {
    id: number;
    catalogNumber: string;
    materialName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecorderSpecificationDto {
  warehouseStockId: number;
  modelName: string;
  minCameras: number;
  maxCameras: number;
  diskSlots?: number;
  maxStorageTb?: number;
  supportedDiskCapacities?: number[];
  requiresExtension?: boolean;
  extensionWarehouseStockId?: number;
  isActive?: boolean;
  notes?: string;
}

export const recorderSpecificationService = {
  async getAll(): Promise<RecorderSpecification[]> {
    const response = await api.get('/recorder-specifications');
    return response.data.data || [];
  },

  async getById(id: number): Promise<RecorderSpecification> {
    const response = await api.get(`/recorder-specifications/${id}`);
    return response.data.data;
  },

  async selectForCameras(cameraCount: number): Promise<RecorderSpecification> {
    const response = await api.get(`/recorder-specifications/select/${cameraCount}`);
    return response.data.data;
  },

  async create(data: CreateRecorderSpecificationDto): Promise<RecorderSpecification> {
    const response = await api.post('/recorder-specifications', data);
    return response.data.data;
  },

  async update(id: number, data: Partial<CreateRecorderSpecificationDto>): Promise<RecorderSpecification> {
    const response = await api.put(`/recorder-specifications/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/recorder-specifications/${id}`);
  }
};

export default recorderSpecificationService;
