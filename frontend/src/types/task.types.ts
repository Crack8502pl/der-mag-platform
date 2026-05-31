/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/task.types.ts
// Type definitions for Task module

export interface TaskType {
  id: number;
  name: string;
  description: string;
  code: string;
  active: boolean;
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  id: number;
  taskId: number;
  userId: number;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
  };
  assignedAt: string;
}

export interface TaskConfigParams {
  [key: string]: unknown;
  cameraCount?: number;
  retentionDays?: number;
  selectedRecorderId?: number | null;
  selectedModels?: Record<string, { checked: boolean; quantity: number }>;
  appliedBomTemplateId?: number | null;
  wizardResolvedAt?: string;
}

export interface TaskMetadata {
  subsystemType?: string;
  taskVariant?: string | null;
  isStandaloneNastawnia?: boolean;
  lcsConfig?: Record<string, unknown>;
  nastawniConfig?: Record<string, unknown>;
  configParams?: TaskConfigParams;
  bomId?: number | null;
  bomGenerated?: boolean;
}

export interface Task {
  id: number;
  taskNumber: string;
  title: string;
  description: string;
  taskType: TaskType;
  taskTypeId: number;
  status: string;
  location: string;
  client: string;
  contractNumber: string;
  parentTaskId: number;
  contractId: number;
  subsystemId: number;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  priority: number;
  metadata: TaskMetadata & Record<string, any>;
  assignments?: TaskAssignment[];
  createdAt: string;
  updatedAt: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  googleMapsUrl?: string | null;
  linkedAssetId?: number | null;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  taskTypeId: number;
  status?: string;
  location?: string;
  client?: string;
  contractNumber?: string;
  contractId?: number;
  subsystemId?: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  priority?: number;
  metadata?: TaskMetadata & Record<string, any>;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  googleMapsUrl?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  taskTypeId?: number;
  status?: string;
  location?: string;
  client?: string;
  contractNumber?: string;
  contractId?: number;
  subsystemId?: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  priority?: number;
  metadata?: TaskMetadata & Record<string, any>;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  googleMapsUrl?: string | null;
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  status?: string;
  taskTypeId?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
