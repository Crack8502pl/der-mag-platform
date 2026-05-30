import api from './api';

export interface PhotoAlbum {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  photoCount?: number;
}

export interface PhotoItem {
  id: number;
  originalName: string;
  filePath: string;
  thumbnailPath?: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  notes?: string | null;
  createdAt: string;
  albumId?: number | null;
}

export const photoService = {
  async getAlbums() {
    const response = await api.get('/photos/albums');
    return response.data.data as PhotoAlbum[];
  },

  async createAlbum(data: { name: string; description?: string }) {
    const response = await api.post('/photos/albums', data);
    return response.data.data as PhotoAlbum;
  },

  async getPhotos(params?: { albumId?: number; approvalStatus?: string; contractId?: number }) {
    const response = await api.get('/photos', { params });
    return response.data.data as PhotoItem[];
  },

  async uploadPhoto(file: File, data: { albumId?: number; description?: string; taskId?: number }) {
    const formData = new FormData();
    formData.append('photo', file);
    if (data.albumId) formData.append('albumId', String(data.albumId));
    if (data.description) formData.append('description', data.description);
    if (data.taskId) formData.append('taskId', String(data.taskId));

    const response = await api.post('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as PhotoItem;
  },

  async approvePhoto(id: number) {
    const response = await api.put(`/photos/${id}/approve`);
    return response.data.data as PhotoItem;
  },

  async rejectPhoto(id: number) {
    const response = await api.put(`/photos/${id}/reject`);
    return response.data.data as PhotoItem;
  },

  async deletePhoto(id: number) {
    await api.delete(`/photos/${id}`);
  },

  getThumbnailUrl(id: number) {
    return `${api.defaults.baseURL}/photos/${id}/thumbnail`;
  },
};
