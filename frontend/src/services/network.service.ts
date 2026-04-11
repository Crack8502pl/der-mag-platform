// src/services/network.service.ts
// Service for network IP management

import api from './api';

export interface NetworkPool {
  id: number;
  name: string;
  cidrRange: string;
  priority: number;
  isActive: boolean;
  description: string | null;
  allocations?: NetworkAllocation[];
  createdAt: string;
}

export interface NetworkAllocation {
  id: number;
  contractId: number;
  subsystemId: number;
  poolId: number;
  systemType: string;
  allocatedRange: string;
  gateway: string;
  subnetMask: string;
  ntpServer: string;
  firstUsableIP: string;
  lastUsableIP: string;
  totalHosts: number;
  usedHosts: number;
  contract?: { contractNumber: string; customName: string };
  subsystem?: { subsystemNumber: string; systemType: string };
  pool?: NetworkPool;
  deviceAssignments?: DeviceIPAssignment[];
  createdAt: string;
}

export type DeviceCategory =
  | 'CAMERA'
  | 'SWITCH'
  | 'ROUTER'
  | 'NVR'
  | 'SERVER'
  | 'IOT'
  | 'ACCESS_POINT'
  | 'OTHER';

export type DeviceIPStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'CONFIGURED'
  | 'VERIFIED'
  | 'DEPLOYED';

export interface DeviceIPAssignment {
  id: number;
  allocationId: number;
  ipAddress: string;
  serialNumber: string | null;
  deviceCategory: DeviceCategory;
  deviceType: string;
  hostname: string;
  description: string | null;
  status: DeviceIPStatus;
  configuredBy: number | null;
  configuredAt: string | null;
  verifiedBy: number | null;
  verifiedAt: string | null;
  firmwareVersion: string | null;
  testResults: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoolDto {
  name: string;
  cidrRange: string;
  priority: number;
  description?: string;
}

export interface UpdatePoolDto {
  name?: string;
  cidrRange?: string;
  priority?: number;
  description?: string;
  isActive?: boolean;
}

export interface AssignIPDto {
  allocationId: number;
  deviceCategory: DeviceCategory;
  deviceType: string;
  hostname: string;
  description?: string;
  serialNumber?: string;
}

class NetworkService {
  // === Pools ===

  async getPools(activeOnly?: boolean): Promise<NetworkPool[]> {
    const params = activeOnly !== undefined ? { activeOnly } : {};
    const response = await api.get('/network/pools', { params });
    return response.data.data;
  }

  async createPool(data: CreatePoolDto): Promise<NetworkPool> {
    const response = await api.post('/network/pools', data);
    return response.data.data;
  }

  async updatePool(id: number, data: UpdatePoolDto): Promise<NetworkPool> {
    const response = await api.put(`/network/pools/${id}`, data);
    return response.data.data;
  }

  async deletePool(id: number): Promise<void> {
    await api.delete(`/network/pools/${id}`);
  }

  // === Allocations ===

  async getAllocations(contractId?: number): Promise<NetworkAllocation[]> {
    const params = contractId ? { contractId } : {};
    const response = await api.get('/network/allocations', { params });
    return response.data.data;
  }

  // === IP Assignments ===

  async assignIP(data: AssignIPDto): Promise<DeviceIPAssignment> {
    const response = await api.post('/network/assignments', data);
    return response.data.data;
  }

  async configureDevice(id: number, firmwareVersion?: string): Promise<DeviceIPAssignment> {
    const response = await api.post(`/network/assignments/${id}/configure`, { firmwareVersion });
    return response.data.data;
  }

  async verifyDevice(id: number, testResults?: Record<string, unknown>): Promise<DeviceIPAssignment> {
    const response = await api.post(`/network/assignments/${id}/verify`, { testResults });
    return response.data.data;
  }

  async checkCIDRAvailability(cidr: string): Promise<{
    success: boolean;
    available: boolean;
    message: string;
    conflicts?: Array<{ id: number; name: string; cidr: string }>;
  }> {
    const response = await api.post('/network/check-cidr-availability', { cidr });
    return response.data;
  }
}

export default new NetworkService();
