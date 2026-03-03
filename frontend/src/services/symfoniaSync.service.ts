// src/services/symfoniaSync.service.ts
// Frontend service for Symfonia warehouse stock sync API

import api from './api';

export interface SyncResult {
  success: boolean;
  syncType: 'full' | 'quick';
  startedAt: string;
  completedAt: string;
  duration: number;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors?: Array<{ catalogNumber?: string; message: string }>;
}

export interface SyncStatus {
  lastFullSync: string | null;
  lastQuickSync: string | null;
  nextScheduledSync: string;
  isRunning: boolean;
  cronEnabled: boolean;
}

export interface SyncHistory {
  id: number;
  syncType: 'full' | 'quick';
  triggeredBy: 'admin' | 'cron';
  userId?: number;
  startedAt: string;
  completedAt: string;
  status: 'success' | 'partial' | 'failed';
  stats: {
    totalProcessed?: number;
    created?: number;
    updated?: number;
    skipped?: number;
    errors?: number;
  };
}

export interface SyncProgress {
  phase: 'fetching' | 'processing' | 'saving' | 'completed';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

const BASE = '/admin/symfonia-sync';

export class SymfoniaSyncService {
  async fullSync(): Promise<SyncResult> {
    const response = await api.post(`${BASE}/full`, {}, { timeout: 300000 }); // 5 minut
    return response.data.data;
  }

  async quickSync(): Promise<SyncResult> {
    const response = await api.post(`${BASE}/quick`, {}, { timeout: 120000 }); // 2 minuty
    return response.data.data;
  }

  async getStatus(): Promise<SyncStatus> {
    const response = await api.get(`${BASE}/status`);
    return response.data.data;
  }

  async getHistory(limit: number = 10): Promise<SyncHistory[]> {
    const response = await api.get(`${BASE}/history`, { params: { limit } });
    return response.data.data;
  }
}

export default new SymfoniaSyncService();
