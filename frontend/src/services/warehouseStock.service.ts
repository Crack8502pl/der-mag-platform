// src/services/warehouseStock.service.ts
// API client for warehouse stock operations

import axios from 'axios';
import type {
  WarehouseStock,
  StockFilters,
  StockPagination,
  WarehouseStockHistory,
  ImportResult,
  ReserveStockRequest,
  ReleaseStockRequest,
  MapToBomRequest,
  MapToWorkflowBomRequest
} from '../types/warehouseStock.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    Authorization: `Bearer ${token}`
  };
};

export interface WarehouseStockListResponse {
  success: boolean;
  data: WarehouseStock[];
  pagination: StockPagination;
}

export interface WarehouseStockResponse {
  success: boolean;
  data: WarehouseStock;
  message?: string;
}

export const warehouseStockService = {
  /**
   * Pobierz wszystkie materiały z filtrami i paginacją
   */
  async getAll(
    filters: StockFilters = {},
    page: number = 1,
    limit: number = 30,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<WarehouseStockListResponse> {
    const params: any = { page, limit, sortBy, sortOrder, ...filters };
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock`, {
      headers: getAuthHeaders(),
      params
    });
    return response.data;
  },

  /**
   * Pobierz materiał po ID
   */
  async getById(id: number): Promise<WarehouseStockResponse> {
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Utwórz nowy materiał
   */
  async create(data: Partial<WarehouseStock>): Promise<WarehouseStockResponse> {
    const response = await axios.post(`${API_BASE_URL}/warehouse-stock`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Aktualizuj materiał
   */
  async update(id: number, data: Partial<WarehouseStock>): Promise<WarehouseStockResponse> {
    const response = await axios.put(`${API_BASE_URL}/warehouse-stock/${id}`, data, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Usuń materiał
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${API_BASE_URL}/warehouse-stock/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Pobierz listę kategorii
   */
  async getCategories(): Promise<string[]> {
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock/categories`, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },

  /**
   * Pobierz listę dostawców
   */
  async getSuppliers(): Promise<string[]> {
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock/suppliers`, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },

  /**
   * Zarezerwuj materiał
   */
  async reserve(id: number, request: ReserveStockRequest): Promise<WarehouseStockResponse> {
    const response = await axios.post(`${API_BASE_URL}/warehouse-stock/${id}/reserve`, request, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Zwolnij rezerwację
   */
  async release(id: number, request: ReleaseStockRequest): Promise<WarehouseStockResponse> {
    const response = await axios.post(`${API_BASE_URL}/warehouse-stock/${id}/release`, request, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Import z CSV
   */
  async importFromCSV(file: File): Promise<{ success: boolean; data: ImportResult; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_BASE_URL}/warehouse-stock/import`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Pobierz szablon CSV
   */
  async downloadTemplate(): Promise<void> {
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock/template`, {
      headers: getAuthHeaders(),
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'warehouse_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  /**
   * Export do Excel
   */
  async exportToExcel(filters: StockFilters = {}): Promise<void> {
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock/export`, {
      headers: getAuthHeaders(),
      params: filters
    });

    // Konwertuj dane do CSV i pobierz
    const data = response.data.data;
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `warehouse_stock_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  /**
   * Auto-przypisanie do subsystemu
   */
  async autoAssignToSubsystem(subsystemId: number): Promise<{ success: boolean; data: { count: number }; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/warehouse-stock/subsystem/${subsystemId}/auto-assign`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Auto-przypisanie do taska
   */
  async autoAssignToTask(taskId: number, taskTypeId: number): Promise<{ success: boolean; data: { count: number }; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/warehouse-stock/task/${taskId}/auto-assign`,
      { taskTypeId },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  /**
   * Mapuj do BOM template
   */
  async mapToBom(id: number, request: MapToBomRequest): Promise<{ success: boolean; data: any; message: string }> {
    const response = await axios.post(`${API_BASE_URL}/warehouse-stock/${id}/map-bom`, request, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Mapuj do workflow BOM item
   */
  async mapToWorkflowBom(id: number, request: MapToWorkflowBomRequest): Promise<{ success: boolean; data: any; message: string }> {
    const response = await axios.post(`${API_BASE_URL}/warehouse-stock/${id}/map-workflow-bom`, request, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Pobierz historię operacji
   */
  async getHistory(id: number, limit: number = 50): Promise<{ success: boolean; data: WarehouseStockHistory[] }> {
    const response = await axios.get(`${API_BASE_URL}/warehouse-stock/${id}/history`, {
      headers: getAuthHeaders(),
      params: { limit }
    });
    return response.data;
  },

  /**
   * Helper: Konwertuj dane do CSV
   */
  convertToCSV(data: WarehouseStock[]): string {
    if (data.length === 0) return '';

    const headers = [
      'ID', 'Numer Katalogowy', 'Nazwa', 'Kategoria', 'Typ', 'Jednostka',
      'Stan', 'Zarezerwowane', 'Dostępne', 'Min. Poziom', 'Lokalizacja',
      'Dostawca', 'Cena Jednostkowa', 'Waluta', 'Status'
    ];

    const rows = data.map(item => [
      item.id,
      item.catalogNumber,
      item.materialName,
      item.category || '',
      item.materialType,
      item.unit,
      item.quantityInStock,
      item.quantityReserved,
      item.quantityAvailable,
      item.minStockLevel || '',
      item.warehouseLocation || '',
      item.supplier || '',
      item.unitPrice || '',
      item.currency,
      item.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }
};
