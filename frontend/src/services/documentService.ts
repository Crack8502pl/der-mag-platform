import api from './api';

export interface DocumentItem {
  id: number;
  name: string;
  type: string;
  category: string;
  fileSize: number;
  createdAt: string;
  originalFilename: string;
}

export interface DocumentTemplateItem {
  id: number;
  name: string;
  type: string;
  description?: string;
  placeholders?: Record<string, unknown>;
}

export const documentService = {
  async getDocuments(params?: { search?: string; type?: string; page?: number; limit?: number }) {
    const response = await api.get('/documents', {
      params: {
        search: params?.search,
        category: params?.type,
        limit: params?.limit ?? 10,
        offset: ((params?.page ?? 1) - 1) * (params?.limit ?? 10),
      },
    });

    const total = response.data.pagination?.total ?? 0;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;

    return {
      data: response.data.data as DocumentItem[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async uploadDocument(file: File, metadata: { name: string; type: string; description?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name);
    formData.append('category', metadata.type);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async deleteDocument(id: number) {
    await api.delete(`/documents/${id}`);
  },

  async getTemplates() {
    const response = await api.get('/document-templates');
    return (response.data.data || response.data) as DocumentTemplateItem[];
  },

  async uploadTemplate(file: File, metadata: Record<string, unknown>) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await api.post('/document-templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async deleteTemplate(id: number) {
    await api.delete(`/document-templates/${id}`);
  },

  async generateDocument(templateId: number, data: Record<string, unknown>) {
    const response = await api.post(`/documents/generate/${templateId}`, data);
    return response.data;
  },

  async downloadDocument(id: number) {
    const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
    return response.data as Blob;
  },
};
