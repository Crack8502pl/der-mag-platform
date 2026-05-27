// src/services/cronConfig.service.ts
// Frontend service for CRON schedule management API

import api from './api';

export interface CronJobConfig {
  jobId: string;
  label: string;
  cronExpression: string;
  enabled: boolean;
  isRunning: boolean;
  lastRun?: string | null;
  nextRun?: string | null;
}

const cronConfigService = {
  getAll: async (): Promise<CronJobConfig[]> => {
    const response = await api.get<{ success: boolean; data: CronJobConfig[] }>('/admin/cron/schedules');
    return response.data.data;
  },

  update: async (jobId: string, cronExpression: string, enabled: boolean): Promise<CronJobConfig> => {
    const response = await api.put<{ success: boolean; data: CronJobConfig }>(
      `/admin/cron/schedules/${jobId}`,
      { cronExpression, enabled }
    );
    return response.data.data;
  },

  triggerNow: async (jobId: string): Promise<{ message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      `/admin/cron/schedules/${jobId}/trigger`
    );
    return { message: response.data.message };
  },
};

export default cronConfigService;
