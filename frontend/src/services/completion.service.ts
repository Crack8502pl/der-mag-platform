// src/services/completion.service.ts
// Service for completion/scanner API calls

import api from './api';
import type {
  CompletionOrder,
  ScanItemRequest,
  ScanItemResponse,
  ReportMissingRequest,
  AssignPalletRequest,
  MakeDecisionRequest,
  SerialPatternsConfig
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

  /**
   * Cancel the order
   */
  async cancelOrder(orderId: number) {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/completion/orders/${orderId}/cancel`
    );
    return response.data;
  }

  /**
   * Save serial numbers for a completion item
   */
  async saveItemSerials(orderId: number, itemId: number, serialNumbers: string[]) {
    const response = await api.patch<{ success: boolean; message: string; data: { itemId: number; serialNumbers: string[]; scannedQuantity: number } }>(
      `/completion/orders/${orderId}/items/${itemId}/serials`,
      { serialNumbers }
    );
    return response.data;
  }

  /**
   * Update warehouse location for a completion item
   */
  async updateWarehouseLocation(orderId: number, itemId: number, location: string): Promise<void> {
    await api.patch(
      `/completion/orders/${orderId}/items/${itemId}/warehouse-location`,
      { location }
    );
  }

  /**
   * Request partial issue (send to manager for approval)
   */
  async requestPartialIssue(orderId: number, issuedQuantities: Record<number, number>, notes?: string) {
    const response = await api.post<{ success: boolean; message: string; data: CompletionOrder }>(
      `/completion/orders/${orderId}/request-partial`,
      { issuedQuantities, notes }
    );
    return response.data;
  }

  /**
   * Approve partial issue (manager only)
   */
  async approvePartialIssue(orderId: number, notes?: string) {
    const response = await api.post<{ success: boolean; message: string; data: CompletionOrder }>(
      `/completion/orders/${orderId}/approve-partial`,
      { notes }
    );
    return response.data;
  }

  /**
   * Reopen a partial order for further completion
   */
  async reopenOrder(orderId: number) {
    const response = await api.post<{ success: boolean; message: string; data: CompletionOrder }>(
      `/completion/orders/${orderId}/reopen`
    );
    return response.data;
  }

  /**
   * Get completed orders (COMPLETED + PARTIAL_ISSUED)
   */
  async getCompletedOrders(filters?: { assignedTo?: number; subsystemId?: number }) {
    const params = new URLSearchParams();
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo.toString());
    if (filters?.subsystemId) params.append('subsystemId', filters.subsystemId.toString());

    const response = await api.get<{ success: boolean; data: CompletionOrder[] }>(
      `/completion/completed?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Save issued quantities for non-serialized items
   */
  async saveIssuedQuantities(orderId: number, quantities: Record<number, number>) {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/completion/orders/${orderId}/issued-quantities`,
      { quantities }
    );
    return response.data;
  }

  /**
   * Get serial number validation patterns (admin)
   */
  async getSerialPatterns() {
    const response = await api.get<{ success: boolean; data: SerialPatternsConfig }>(
      `/admin/config/serial-patterns`
    );
    return response.data;
  }

  /**
   * Update serial number validation patterns (admin)
   */
  async setSerialPatterns(config: SerialPatternsConfig) {
    const response = await api.put<{ success: boolean; message: string; data: SerialPatternsConfig }>(
      `/admin/config/serial-patterns`,
      config
    );
    return response.data;
  }
}

export default new CompletionService();
