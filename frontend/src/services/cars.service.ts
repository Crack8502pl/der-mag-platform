// src/services/cars.service.ts
// Serwis dla modułu samochodów

import api from './api';

export interface Car {
  id: number;
  symfoniaLp: string;
  registration: string;
  symfoniaElementId: number | null;
  active: boolean;
  brigadeId: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CarSyncResult {
  success: boolean;
  syncType: 'full';
  startedAt: string;
  completedAt: string;
  duration: number;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    archived: number;
  };
  errors: Array<{ message: string }>;
}

class CarsService {
  async getAll(): Promise<Car[]> {
    const response = await api.get('/cars');
    return response.data.data;
  }

  async toggleBrigade(carId: number, createBrigade: boolean): Promise<Car> {
    const response = await api.post(`/cars/${carId}/toggle-brigade`, { createBrigade });
    return response.data.data;
  }

  async sync(): Promise<CarSyncResult> {
    const response = await api.post('/admin/cars/sync', {}, { timeout: 120000 });
    return response.data.data;
  }
}

export default new CarsService();
