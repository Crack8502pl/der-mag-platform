// src/services/material-import.service.ts
// Service for material import functionality

import api from './api';
import type {
  Material,
  MaterialImportPreview,
  MaterialImportHistory,
  BOMTemplate,
  TaskType,
} from '../types/admin.types';

export class MaterialImportService {
  /**
   * Upload file and get import preview
   */
  async uploadForPreview(file: File): Promise<MaterialImportPreview> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/materials/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Confirm and execute import
   */
  async confirmImport(file: File): Promise<{ successCount: number; errorCount: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/materials/import/confirm', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Get import history
   */
  async getImportHistory(page: number = 1, perPage: number = 10): Promise<{
    items: MaterialImportHistory[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const response = await api.get('/materials/import/history', {
      params: { page, perPage },
    });

    return response.data.data;
  }

  /**
   * Download CSV template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await api.get('/materials/import/template', {
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Get all materials
   */
  async getMaterials(search?: string, category?: string): Promise<Material[]> {
    const response = await api.get('/materials', {
      params: { search, category },
    });

    return response.data.data;
  }

  /**
   * Create material
   */
  async createMaterial(material: Partial<Material>): Promise<Material> {
    const response = await api.post('/materials', material);
    return response.data.data;
  }

  /**
   * Update material
   */
  async updateMaterial(id: number, material: Partial<Material>): Promise<Material> {
    const response = await api.put(`/materials/${id}`, material);
    return response.data.data;
  }

  /**
   * Delete material (soft delete)
   */
  async deleteMaterial(id: number): Promise<void> {
    await api.delete(`/materials/${id}`);
  }

  /**
   * Get BOM templates
   */
  async getBOMTemplates(): Promise<BOMTemplate[]> {
    const response = await api.get('/bom-builder/templates');
    return response.data.data;
  }

  /**
   * Get task types
   */
  async getTaskTypes(): Promise<TaskType[]> {
    const response = await api.get('/bom-builder/task-types');
    return response.data.data;
  }

  /**
   * Create BOM template
   */
  async createBOMTemplate(taskTypeId: number, materials: Array<{
    materialId: number;
    quantity: number;
    required: boolean;
  }>): Promise<BOMTemplate> {
    const response = await api.post('/bom-builder/templates', {
      taskTypeId,
      materials,
    });

    return response.data.data;
  }

  /**
   * Update BOM template
   */
  async updateBOMTemplate(id: number, materials: Array<{
    materialId: number;
    quantity: number;
    required: boolean;
  }>): Promise<BOMTemplate> {
    const response = await api.put(`/bom-builder/templates/${id}`, {
      materials,
    });

    return response.data.data;
  }

  /**
   * Copy BOM template to another task type
   */
  async copyBOMTemplate(sourceTaskTypeId: number, targetTaskTypeId: number): Promise<BOMTemplate> {
    const response = await api.post('/bom-builder/templates/copy', {
      sourceTaskTypeId,
      targetTaskTypeId,
    });

    return response.data.data;
  }
}

export default new MaterialImportService();
