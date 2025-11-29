import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { AuthResponse, ApiResponse, Task, DashboardMetrics, PaginatedResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - dodaj token do każdego żądania
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - obsługa błędów
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token wygasł - wyczyść storage i przekieruj na login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', {
      username,
      password,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async getMe(): Promise<ApiResponse<any>> {
    const response = await this.client.get<ApiResponse<any>>('/auth/me');
    return response.data;
  }

  // Task endpoints
  async getTasks(params?: {
    status?: string;
    taskType?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<Task>> {
    const response = await this.client.get<PaginatedResponse<Task>>('/tasks', {
      params,
    });
    return response.data;
  }

  async getTask(taskNumber: string): Promise<ApiResponse<Task>> {
    const response = await this.client.get<ApiResponse<Task>>(`/tasks/${taskNumber}`);
    return response.data;
  }

  async getMyTasks(): Promise<ApiResponse<Task[]>> {
    const response = await this.client.get<ApiResponse<Task[]>>('/tasks/my');
    return response.data;
  }

  // Metrics endpoints
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    const response = await this.client.get<ApiResponse<DashboardMetrics>>('/metrics/dashboard');
    return response.data;
  }

  // Generic request method
  async request<T>(method: string, url: string, data?: any): Promise<T> {
    const response = await this.client.request<T>({
      method,
      url,
      data,
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
