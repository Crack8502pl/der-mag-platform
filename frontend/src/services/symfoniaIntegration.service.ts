// src/services/symfoniaIntegration.service.ts
// Service for Symfonia MSSQL integration API calls

import api from './api';

export interface SymfoniaConnectionStatus {
  connected: boolean;
  server: string;
  database: string;
  message: string;
}

export interface SymfoniaTable {
  schema: string;
  name: string;
  rowCount: number;
}

export interface SymfoniaColumn {
  columnName: string;
  dataType: string;
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
}

export interface SymfoniaForeignKey {
  fkName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface SymfoniaView {
  schema: string;
  name: string;
}

const BASE = '/admin/symfonia-integration';

export class SymfoniaIntegrationService {
  async testConnection(): Promise<SymfoniaConnectionStatus> {
    const response = await api.get(`${BASE}/status`);
    return response.data.data;
  }

  async getTables(): Promise<SymfoniaTable[]> {
    const response = await api.get(`${BASE}/tables`);
    return response.data.data;
  }

  async getTableStructure(schema: string, tableName: string): Promise<SymfoniaColumn[]> {
    const response = await api.get(`${BASE}/tables/${encodeURIComponent(tableName)}`, {
      params: { schema },
    });
    return response.data.data;
  }

  async getTableData(schema: string, tableName: string, limit: number = 10): Promise<any[]> {
    const response = await api.get(`${BASE}/tables/${encodeURIComponent(tableName)}/data`, {
      params: { schema, limit },
    });
    return response.data.data;
  }

  async getForeignKeys(): Promise<SymfoniaForeignKey[]> {
    const response = await api.get(`${BASE}/foreign-keys`);
    return response.data.data;
  }

  async getViews(): Promise<SymfoniaView[]> {
    const response = await api.get(`${BASE}/views`);
    return response.data.data;
  }

  async exportSchema(): Promise<void> {
    const response = await api.get(`${BASE}/export`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'symfonia-schema-export.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async searchInTable(
    schema: string,
    tableName: string,
    columnName: string,
    searchValue: string,
    limit: number = 100
  ): Promise<any[]> {
    const response = await api.get(`${BASE}/tables/${encodeURIComponent(tableName)}/search`, {
      params: { schema, column: columnName, value: searchValue, limit },
    });
    return response.data.data;
  }

  async batchSearch(
    schema: string,
    tableName: string,
    columnName: string,
    values: string[]
  ): Promise<{ found: any[]; notFound: string[] }> {
    const response = await api.post(`${BASE}/tables/${encodeURIComponent(tableName)}/batch-search`, {
      schema,
      columnName,
      values,
    });
    return response.data.data;
  }

  async getTableDataPaginated(
    schema: string,
    tableName: string,
    page: number,
    pageSize: number
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const response = await api.get(`${BASE}/tables/${encodeURIComponent(tableName)}/data-paginated`, {
      params: { schema, page, pageSize },
    });
    return response.data.data;
  }
}

export default new SymfoniaIntegrationService();
