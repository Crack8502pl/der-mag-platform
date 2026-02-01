// src/services/bom-template.service.ts
// Service for BOM Template API calls

import { api } from './api';

export interface BomTemplate {
  id: number;
  taskTypeId: number;
  materialName: string;
  catalogNumber?: string;
  description?: string;
  unit: string;
  defaultQuantity: number;
  category?: string;
  systemType?: string;
  isRequired: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DependencyCondition {
  materialCategory: string;
  field: 'quantity' | 'exists';
  operator: '>' | '>=' | '=' | '<' | '<=' | 'exists';
  value: number | boolean;
}

export interface DependencyAction {
  targetMaterialCategory: string;
  field: 'minQuantity' | 'minPorts' | 'required' | 'suggested';
  formula: string;
  message?: string;
}

export interface BomDependencyRule {
  id: number;
  name: string;
  description?: string;
  conditions: DependencyCondition[];
  conditionOperator: 'AND' | 'OR';
  actions: DependencyAction[];
  category?: string;
  systemType?: string;
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetTemplatesParams {
  page?: number;
  limit?: number;
  category?: string;
  systemType?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateTemplateDto {
  taskTypeId: number;
  materialName: string;
  catalogNumber?: string;
  description?: string;
  unit: string;
  defaultQuantity: number;
  category?: string;
  systemType?: string;
  isRequired: boolean;
  sortOrder?: number;
}

export interface CreateRuleDto {
  name: string;
  description?: string;
  conditions: DependencyCondition[];
  conditionOperator: 'AND' | 'OR';
  actions: DependencyAction[];
  category?: string;
  systemType?: string;
  priority?: number;
  active?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

class BomTemplateService {
  // ========== TEMPLATES ==========

  async getTemplates(params: GetTemplatesParams = {}) {
    const response = await api.get<{ success: boolean; data: PaginatedResponse<BomTemplate> }>(
      '/bom-templates/templates',
      { params }
    );
    return response.data.data;
  }

  async getTemplate(id: number) {
    const response = await api.get<{ success: boolean; data: BomTemplate }>(
      `/bom-templates/templates/${id}`
    );
    return response.data.data;
  }

  async getCategories() {
    const response = await api.get<{ success: boolean; data: string[] }>(
      '/bom-templates/templates/categories'
    );
    return response.data.data;
  }

  async getCsvTemplate() {
    const response = await api.get('/bom-templates/templates/csv-template', {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bom-template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async createTemplate(data: CreateTemplateDto) {
    const response = await api.post<{ success: boolean; data: BomTemplate }>(
      '/bom-templates/templates',
      data
    );
    return response.data.data;
  }

  async updateTemplate(id: number, data: Partial<CreateTemplateDto>) {
    const response = await api.put<{ success: boolean; data: BomTemplate }>(
      `/bom-templates/templates/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteTemplate(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/bom-templates/templates/${id}`
    );
    return response.data;
  }

  async importCsv(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ 
      success: boolean; 
      data: { imported: number; skipped: number; total: number }; 
      message: string 
    }>('/bom-templates/templates/import-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async copyTemplate(id: number, targetCategoryId: string) {
    const response = await api.post<{ success: boolean; data: BomTemplate; message: string }>(
      `/bom-templates/templates/${id}/copy/${targetCategoryId}`
    );
    return response.data;
  }

  // ========== DEPENDENCY RULES ==========

  async getDependencies(params: { category?: string; systemType?: string; active?: boolean } = {}) {
    const response = await api.get<{ success: boolean; data: BomDependencyRule[] }>(
      '/bom-templates/dependencies',
      { params }
    );
    return response.data.data;
  }

  async getDependency(id: number) {
    const response = await api.get<{ success: boolean; data: BomDependencyRule }>(
      `/bom-templates/dependencies/${id}`
    );
    return response.data.data;
  }

  async createDependency(data: CreateRuleDto) {
    const response = await api.post<{ success: boolean; data: BomDependencyRule }>(
      '/bom-templates/dependencies',
      data
    );
    return response.data.data;
  }

  async updateDependency(id: number, data: Partial<CreateRuleDto>) {
    const response = await api.put<{ success: boolean; data: BomDependencyRule }>(
      `/bom-templates/dependencies/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteDependency(id: number) {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/bom-templates/dependencies/${id}`
    );
    return response.data;
  }

  async validateBom(
    materials: Array<{ category: string; quantity: number; ports?: number }>,
    category?: string,
    systemType?: string
  ) {
    const response = await api.post<{ 
      success: boolean; 
      data: ValidationResult; 
      valid: boolean 
    }>('/bom-templates/dependencies/validate', {
      materials,
      category,
      systemType,
    });
    return response.data.data;
  }
}

export const bomTemplateService = new BomTemplateService();
export default bomTemplateService;
