// src/services/completion.service.ts
// Service for completion/scanner API calls

import api from './api';
import type {
  CompletionOrder,
  ScanItemRequest,
  ScanItemResponse,
  ReportMissingRequest,
  AssignPalletRequest,
  MakeDecisionRequest
} from '../types/completion.types';

class CompletionService {
  /**
   * Get list of completion orders
   */
  async getOrders(filters?: { status?: string; assignedTo?: number; all?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo.toString());
    if (filters?.all) params.append('all', 'true');

    const response = await api.get<{ success: boolean; data: CompletionOrder[] }>(
      `/completion/orders?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get single completion order
   */
  async getOrder(id: number) {
    const response = await api.get<{ success: boolean; data: CompletionOrder }>(
      `/completion/orders/${id}`
    );
    return response.data;
  }

  /**
   * Scan a barcode
   */
  async scanItem(orderId: number, data: ScanItemRequest) {
    const response = await api.post<ScanItemResponse>(
      `/completion/orders/${orderId}/scan`,
      data
    );
    return response.data;
  }

  /**
   * Report an item as missing
   */
  async reportMissing(orderId: number, data: ReportMissingRequest) {
    const response = await api.post<{ success: boolean; message: string }>(
      `/completion/orders/${orderId}/report-missing`,
      data
    );
    return response.data;
  }

  /**
   * Assign items to pallet
   */
  async assignPallet(orderId: number, data: AssignPalletRequest) {
    const response = await api.post<{ success: boolean; message: string }>(
      `/completion/orders/${orderId}/assign-pallet`,
      data
    );
    return response.data;
  }

  /**
   * Make decision on partial completion
   */
  async makeDecision(orderId: number, data: MakeDecisionRequest) {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/completion/orders/${orderId}/decision`,
      data
    );
    return response.data;
  }

  /**
   * Complete the order
   */
  async completeOrder(orderId: number) {
    const response = await api.post<{ success: boolean; message: string }>(
      `/completion/orders/${orderId}/complete`
    );
    return response.data;
  }
}

export default new CompletionService();
