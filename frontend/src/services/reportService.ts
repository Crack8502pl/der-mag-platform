import api from './api';

export interface ContractStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  progressPercent: number;
  recentContracts: Array<{ id: number; contractNumber: string; customName: string; status: string; createdAt: string }>;
}

export interface TaskStats {
  byStatus: Record<string, number>;
  overdueTasks: Array<{ id: number; taskNumber: string; title: string; plannedEndDate?: string | null; status: string }>;
  sla: {
    total: number;
    onTime: number;
    delayed: number;
    avgCompletionDays: number;
  };
}

export interface ResourceStats {
  lowStock: Array<{ id: number; catalogNumber: string; materialName: string; quantityAvailable: number; minStockLevel: number }>;
}

export interface KpiRow {
  month: string;
  contracts: number;
  tasks: number;
  newDevices: number;
}

export const reportService = {
  async getContractStats(): Promise<ContractStats> {
    const response = await api.get('/reports/contracts');
    return response.data.data;
  },

  async getTaskStats(): Promise<TaskStats> {
    const response = await api.get('/reports/tasks');
    return response.data.data;
  },

  async getResourceStats(): Promise<ResourceStats> {
    const response = await api.get('/reports/resources');
    return response.data.data;
  },

  async getKpiData(): Promise<KpiRow[]> {
    const response = await api.get('/reports/kpi');
    return response.data.data;
  },

  async exportExcel(type: string): Promise<Blob> {
    const response = await api.post('/reports/export/excel', { type }, { responseType: 'blob' });
    return response.data;
  },

  async exportPdf(type: string): Promise<Blob> {
    const response = await api.post('/reports/export/pdf', { type }, { responseType: 'blob' });
    return response.data;
  },
};
