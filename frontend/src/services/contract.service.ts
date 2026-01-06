// src/services/contract.service.ts
// Service for contract management

import api from './api';

export interface Contract {
  id: number;
  contractNumber: string;
  customName: string;
  orderDate: string;
  managerCode: string;
  status: string;
  projectManagerId?: number;
  projectManager?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
  jowiszRef?: string;
  subsystems?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractDto {
  contractNumber?: string;
  customName: string;
  orderDate: string;
  managerCode: string;
  projectManagerId: number;
  jowiszRef?: string;
}

class ContractService {
  async getContracts(params?: any): Promise<{ data: Contract[]; count: number }> {
    const response = await api.get('/contracts', { params });
    return response.data;
  }

  async getContract(id: number): Promise<Contract> {
    const response = await api.get(`/contracts/${id}`);
    return response.data.data;
  }

  async createContract(data: CreateContractDto): Promise<Contract> {
    const response = await api.post('/contracts', data);
    return response.data.data;
  }

  async updateContract(id: number, data: Partial<CreateContractDto>): Promise<Contract> {
    const response = await api.put(`/contracts/${id}`, data);
    return response.data.data;
  }

  async deleteContract(id: number): Promise<void> {
    await api.delete(`/contracts/${id}`);
  }

  async approveContract(id: number): Promise<Contract> {
    const response = await api.post(`/contracts/${id}/approve`);
    return response.data.data;
  }

  async importContracts(file: File): Promise<{ imported: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/contracts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async getContractStats(): Promise<{ total: number; byStatus: Record<string, number> }> {
    const response = await api.get('/contracts/stats');
    return response.data.data;
  }

  async exportReport(id: number, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await api.get(`/contracts/${id}/report`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async createContractWithWizard(data: {
    customName: string;
    orderDate: string;
    projectManagerId: number;
    managerCode: string;
    subsystemType: string | null;
    subsystemParams: {
      [key: string]: number | boolean;
    };
    tasks: Array<{ number: string; name: string; type: string }>;
  }): Promise<Contract> {
    const response = await api.post('/contracts/wizard', data);
    return response.data.data;
  }
}

export default new ContractService();
