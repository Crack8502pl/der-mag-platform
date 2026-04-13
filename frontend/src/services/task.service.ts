// src/services/task.service.ts
// Service for task management

import api from './api';
import type { Task, TaskType, CreateTaskDto, UpdateTaskDto, TaskFilters, Pagination } from '../types/task.types';

class TaskService {
  /**
   * Get all tasks with filters
   */
  async getAll(filters?: TaskFilters): Promise<{ data: Task[]; pagination: Pagination }> {
    const response = await api.get('/tasks', { params: filters });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    };
  }

  /**
   * Get task by task number
   */
  async getById(taskNumber: string): Promise<Task> {
    const response = await api.get(`/tasks/${taskNumber}`);
    return response.data.data;
  }

  /**
   * Get tasks assigned to current user
   */
  async getMyTasks(): Promise<Task[]> {
    const response = await api.get('/tasks/my');
    return response.data.data || [];
  }

  /**
   * Create new task
   */
  async create(data: CreateTaskDto): Promise<Task> {
    const response = await api.post('/tasks', data);
    return response.data.data;
  }

  /**
   * Update task
   */
  async update(taskNumber: string, data: UpdateTaskDto): Promise<Task> {
    const response = await api.put(`/tasks/${taskNumber}`, data);
    return response.data.data;
  }

  /**
   * Update task status
   */
  async updateStatus(taskNumber: string, status: string): Promise<Task> {
    const response = await api.patch(`/tasks/${taskNumber}/status`, { status });
    return response.data.data;
  }

  /**
   * Delete task
   */
  async delete(taskNumber: string): Promise<void> {
    await api.delete(`/tasks/${taskNumber}`);
  }

  /**
   * Assign users to task
   */
  async assign(taskNumber: string, userIds: number[]): Promise<void> {
    await api.post(`/tasks/${taskNumber}/assign`, { userIds });
  }

  /**
   * Complete task and create an asset
   */
  async completeAndCreateAsset(
    taskNumber: string,
    payload: {
      assetData: {
        name: string;
        category?: string;
        liniaKolejowa?: string;
        kilometraz?: string;
        gpsLatitude?: number | null;
        gpsLongitude?: number | null;
        googleMapsUrl?: string;
        miejscowosc?: string;
        notes?: string;
        actualInstallationDate?: string;
        warrantyExpiryDate?: string;
      };
      deviceSerialNumbers?: string[];
    }
  ): Promise<{
    task: { id: number; taskNumber: string; status: string; linkedAssetId: number };
    asset: { id: number; assetNumber: string; name: string; status: string; actualInstallationDate?: string; warrantyExpiryDate?: string };
    linkedDevices?: { deviceId: number; serialNumber: string; status: string }[];
    warnings?: string[];
  }> {
    const response = await api.post(`/subsystem-tasks/${taskNumber}/complete-and-create-asset`, payload);
    return response.data.data;
  }

  /**
   * Get all task types
   */
  async getTaskTypes(): Promise<TaskType[]> {
    const response = await api.get('/task-types');
    return response.data.data || [];
  }
}

export default new TaskService();
