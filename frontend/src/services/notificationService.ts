import api from './api';

export interface NotificationItem {
  id: number;
  title: string;
  message?: string;
  type: 'info' | 'warning' | 'error' | 'success' | string;
  module?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  modules: Record<string, boolean>;
}

export const notificationService = {
  async getNotifications(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    const response = await api.get('/notifications', { params });
    return {
      data: response.data.data as NotificationItem[],
      pagination: response.data.pagination as { page: number; limit: number; total: number; totalPages: number },
    };
  },

  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data.data.count as number;
  },

  async markAsRead(id: number) {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead() {
    await api.put('/notifications/read-all');
  },

  async getSettings(): Promise<NotificationSettings> {
    const response = await api.get('/notifications/settings');
    return response.data.data;
  },

  async updateSettings(data: NotificationSettings): Promise<NotificationSettings> {
    const response = await api.put('/notifications/settings', data);
    return response.data.data;
  },
};
