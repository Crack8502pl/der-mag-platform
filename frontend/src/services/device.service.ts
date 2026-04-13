// src/services/device.service.ts
// Service for device management

import api from './api';

export interface Device {
  id: number;
  serialNumber: string;
  deviceType: string;
  deviceModel?: string | null;
  manufacturer?: string | null;
  catalogNumber?: string | null;
  inventoryStatus: 'in_stock' | 'reserved' | 'installed' | 'faulty' | 'returned' | 'decommissioned' | null;
  status: string;
  prefabricationDate?: string | null;
  verificationDate?: string | null;
  installationDate?: string | null;
  installedAssetId?: number | null;
  taskId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstalledAsset {
  id: number;
  assetNumber: string;
  assetType: 'PRZEJAZD' | 'SKP' | 'NASTAWNIA' | 'LCS' | 'CUID';
  name: string;
  category?: 'KAT A' | 'KAT B' | 'KAT C' | 'KAT E' | 'KAT F' | null;
  status: 'planned' | 'installed' | 'active' | 'in_service' | 'faulty' | 'inactive' | 'decommissioned';
  liniaKolejowa?: string | null;
  kilometraz?: string | null;
  miejscowosc?: string | null;
  actualInstallationDate?: string | null;
}

export interface DeviceDetails extends Device {
  installedAsset?: InstalledAsset | null;
  task?: {
    id: number;
    taskNumber: string;
    name: string;
  } | null;
}

const deviceService = {
  /**
   * Get device by ID with relations (installed asset, task)
   */
  async getDeviceById(id: number): Promise<DeviceDetails> {
    const response = await api.get(`/devices/${id}`);
    return response.data.data;
  },

  /**
   * Get all devices with filters
   */
  async getDevices(filters?: Record<string, unknown>): Promise<{ data: Device[]; count: number }> {
    const response = await api.get('/devices', { params: filters });
    return response.data;
  }
};

export default deviceService;
