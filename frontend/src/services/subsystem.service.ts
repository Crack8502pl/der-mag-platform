// src/services/subsystem.service.ts
// API service for subsystems

import api from './api';

export interface Subsystem {
  id: number;
  subsystemNumber: string;
  systemType: string;
  quantity: number;
  status: string;
  contract: {
    id: number;
    contractNumber: string;
    projectManager: string;
  };
  documentCount?: number;
  createdAt: string;
}

export interface SubsystemDocument {
  id: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
  uploadedAt: string;
}

export const subsystemService = {
  /**
   * Get list of subsystems with filters
   */
  async getList(filters?: {
    systemType?: string;
    projectManager?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }) {
    const response = await api.get('/subsystems', { params: filters });
    return response.data;
  },

  /**
   * Get documentation for a subsystem
   */
  async getDocumentation(subsystemId: number) {
    const response = await api.get(`/subsystems/${subsystemId}/documentation`);
    return response.data;
  },

  /**
   * Upload a document for a subsystem
   */
  async uploadDocument(subsystemId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(
      `/subsystems/${subsystemId}/documentation`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },

  /**
   * Download a document
   */
  async downloadDocument(subsystemId: number, docId: number) {
    const response = await api.get(
      `/subsystems/${subsystemId}/documentation/${docId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Delete a document
   */
  async deleteDocument(subsystemId: number, docId: number) {
    const response = await api.delete(
      `/subsystems/${subsystemId}/documentation/${docId}`
    );
    return response.data;
  }
};
