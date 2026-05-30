import api from './api';

export type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned' | string;

export interface DeviceDto {
  id: number;
  serialNumber: string;
  name: string;
  model?: string | null;
  manufacturer?: string | null;
  deviceType?: string | null;
  location?: string | null;
  status: DeviceStatus;
  notes?: string | null;
  configuration?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceHistoryEvent {
  id: string;
  type: string;
  timestamp: string;
  description: string;
}

export interface DeviceListResponse {
  data: DeviceDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateDeviceDto {
  serialNumber: string;
  name: string;
  model?: string;
  manufacturer?: string;
  deviceType?: string;
  status?: DeviceStatus;
  location?: string;
  notes?: string;
  configuration?: Record<string, unknown>;
}

export type UpdateDeviceDto = Partial<CreateDeviceDto>;

export const deviceService = {
  async getDevices(params?: { search?: string; status?: string; deviceType?: string; page?: number; limit?: number }): Promise<DeviceListResponse> {
    const response = await api.get('/devices', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getDevice(id: number): Promise<DeviceDto> {
    const response = await api.get(`/devices/${id}`);
    return response.data.data;
  },

  async createDevice(data: CreateDeviceDto): Promise<DeviceDto> {
    const response = await api.post('/devices', data);
    return response.data.data;
  },

  async updateDevice(id: number, data: UpdateDeviceDto): Promise<DeviceDto> {
    const response = await api.put(`/devices/${id}`, data);
    return response.data.data;
  },

  async deleteDevice(id: number): Promise<void> {
    await api.delete(`/devices/${id}`);
  },

  async getDeviceHistory(id: number): Promise<DeviceHistoryEvent[]> {
    const response = await api.get(`/devices/${id}/history`);
    return response.data.data;
  },
};
