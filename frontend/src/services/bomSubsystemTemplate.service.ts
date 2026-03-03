// src/services/bomSubsystemTemplate.service.ts
// API client for BOM subsystem template operations

import api from './api';

export interface BomSubsystemTemplate {
  id: number;
  templateName: string;
  subsystemType: string;
  taskVariant: string | null;
  version: number;
  isActive: boolean;
  description?: string;
  createdById?: number;
  updatedById?: number;
  items: BomSubsystemTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BomSubsystemTemplateItem {
  id?: number;
  templateId?: number;
  warehouseStockId?: number;
  materialName: string;
  catalogNumber?: string;
  unit: string;
  defaultQuantity: number;
  quantitySource: 'FIXED' | 'FROM_CONFIG' | 'PER_UNIT' | 'DEPENDENT';
  configParamName?: string;
  dependsOnItemId?: number;
  dependencyFormula?: string;
  requiresIp: boolean;
  isRequired: boolean;
  groupName?: string;
  sortOrder: number;
  notes?: string;
  warehouseStock?: any; // Full warehouse stock data if loaded
}

export interface CreateTemplateDto {
  templateName: string;
  subsystemType: string;
  taskVariant?: string | null;
  description?: string;
  items: Omit<BomSubsystemTemplateItem, 'templateId'>[];
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  isActive?: boolean;
  items?: BomSubsystemTemplateItem[]; // Allow items with IDs for updates
}

export interface ApplyTemplateDto {
  configParams: Record<string, any>;
}

export interface TemplateFilters {
  subsystemType?: string;
  taskVariant?: string | null;
  isActive?: boolean;
}

const bomSubsystemTemplateService = {
  /**
   * Get all templates with optional filters
   */
  async getAll(filters?: TemplateFilters): Promise<BomSubsystemTemplate[]> {
    const params: any = {};
    if (filters?.subsystemType) params.subsystemType = filters.subsystemType;
    if (filters?.taskVariant !== undefined) {
      params.taskVariant = filters.taskVariant === null ? 'null' : filters.taskVariant;
    }
    if (filters?.isActive !== undefined) params.isActive = filters.isActive;

    const response = await api.get('/bom-subsystem-templates', { params });
    return response.data.data;
  },

  /**
   * Get a specific template by ID
   */
  async getById(id: number): Promise<BomSubsystemTemplate> {
    const response = await api.get(`/bom-subsystem-templates/${id}`);
    return response.data.data;
  },

  /**
   * Get active template for specific subsystem type and variant
   */
  async getTemplateFor(
    subsystemType: string,
    taskVariant?: string | null
  ): Promise<BomSubsystemTemplate | null> {
    try {
      const variantPath = taskVariant === null || !taskVariant ? 'null' : taskVariant;
      const response = await api.get(
        `/bom-subsystem-templates/for/${subsystemType}/${variantPath}`
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create a new template
   */
  async create(data: CreateTemplateDto): Promise<BomSubsystemTemplate> {
    const response = await api.post('/bom-subsystem-templates', data);
    return response.data.data;
  },

  /**
   * Update an existing template
   */
  async update(id: number, data: UpdateTemplateDto): Promise<BomSubsystemTemplate> {
    const response = await api.put(`/bom-subsystem-templates/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete a template (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/bom-subsystem-templates/${id}`);
  },

  /**
   * Apply template to a task
   */
  async applyToTask(
    templateId: number,
    taskId: number,
    configParams: Record<string, any>
  ): Promise<any> {
    const response = await api.post(
      `/bom-subsystem-templates/${templateId}/apply/${taskId}`,
      { configParams }
    );
    return response.data;
  },

  /**
   * Export template to CSV (triggers download)
   */
  async exportTemplate(id: number): Promise<void> {
    const response = await api.get(`/bom-subsystem-templates/${id}/export`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bom-template-${id}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  },

  /**
   * Import template from CSV file
   */
  async importTemplate(
    file: File,
    metadata: {
      templateName: string;
      subsystemType: string;
      taskVariant?: string | null;
      description?: string;
    }
  ): Promise<BomSubsystemTemplate> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateName', metadata.templateName);
    formData.append('subsystemType', metadata.subsystemType);
    if (metadata.taskVariant) formData.append('taskVariant', metadata.taskVariant);
    if (metadata.description) formData.append('description', metadata.description);

    const response = await api.post('/bom-subsystem-templates/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  },

  /**
   * Download empty CSV template
   */
  async getCsvTemplate(): Promise<void> {
    const response = await api.get('/bom-subsystem-templates/csv-template', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bom-template-empty.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }
};

export default bomSubsystemTemplateService;
