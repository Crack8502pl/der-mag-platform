// frontend/src/services/railway.service.ts
// Service for PKP PLK railway data endpoints

import { api } from './api';

export interface RailwayLineDto {
  id: number;
  code: string;
  name: string;
  kmFrom: number | null;
  kmTo: number | null;
  manager: string | null;
}

export interface RailwayStationDto {
  id: number;
  name: string;
  code: string | null;
  lineCode: string;
  type: string;
  kmPosition: number | null;
  latitude: number | null;
  longitude: number | null;
  municipality: string | null;
}

export const railwayService = {
  async searchLines(q?: string): Promise<RailwayLineDto[]> {
    const params = q ? { q } : {};
    const res = await api.get<{ success: boolean; data: RailwayLineDto[] }>('/railway/lines', { params });
    return res.data.data;
  },

  async getLineByCode(code: string): Promise<RailwayLineDto | null> {
    try {
      const res = await api.get<{ success: boolean; data: RailwayLineDto }>(`/railway/lines/${encodeURIComponent(code)}`);
      return res.data.data;
    } catch {
      return null;
    }
  },

  async searchStations(q: string, line?: string, limit = 10): Promise<RailwayStationDto[]> {
    const params: Record<string, string | number> = { q, limit };
    if (line) params.line = line;
    const res = await api.get<{ success: boolean; data: RailwayStationDto[] }>('/railway/stations', { params });
    return res.data.data;
  },

  async getStationsForLine(lineCode: string): Promise<RailwayStationDto[]> {
    const res = await api.get<{ success: boolean; data: RailwayStationDto[] }>(
      `/railway/stations/line/${encodeURIComponent(lineCode)}`
    );
    return res.data.data;
  },

  async validateKilometraz(km: number, lineCode: string): Promise<{ valid: boolean; min: number; max: number }> {
    const res = await api.post<{ success: boolean; data: { valid: boolean; min: number; max: number } }>(
      '/railway/validate-km',
      { km, lineCode }
    );
    return res.data.data;
  },
};
