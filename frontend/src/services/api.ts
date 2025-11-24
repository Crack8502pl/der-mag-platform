import axios from 'axios';
import type { AuthResponse, ApiResponse, Task, TaskType, DashboardMetrics } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

export const taskApi = {
  getAll: async (params?: {
    status?: string;
    taskTypeId?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Task[]>> => {
    const response = await api.get<ApiResponse<Task[]>>('/tasks', { params });
    return response.data;
  },

  getById: async (taskNumber: string): Promise<ApiResponse<Task>> => {
    const response = await api.get<ApiResponse<Task>>(`/tasks/${taskNumber}`);
    return response.data;
  },

  create: async (data: Partial<Task>): Promise<ApiResponse<Task>> => {
    const response = await api.post<ApiResponse<Task>>('/tasks', data);
    return response.data;
  },

  update: async (taskNumber: string, data: Partial<Task>): Promise<ApiResponse<Task>> => {
    const response = await api.put<ApiResponse<Task>>(`/tasks/${taskNumber}`, data);
    return response.data;
  },
};

export const taskTypeApi = {
  getAll: async (): Promise<ApiResponse<TaskType[]>> => {
    const response = await api.get<ApiResponse<TaskType[]>>('/tasks/types');
    return response.data;
  },
};

export const metricsApi = {
  getDashboard: async (): Promise<ApiResponse<DashboardMetrics>> => {
    const response = await api.get<ApiResponse<DashboardMetrics>>('/metrics/dashboard');
    return response.data;
  },
};

export default api;
