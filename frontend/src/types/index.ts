export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: number;
    name: string;
    description: string;
  };
}

export interface Task {
  id: number;
  taskNumber: string;
  title: string;
  description: string;
  status: string;
  location: string;
  client: string;
  priority: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  createdAt: string;
  updatedAt: string;
  taskType: {
    id: number;
    name: string;
    description: string;
    code: string;
  };
}

export interface TaskType {
  id: number;
  name: string;
  description: string;
  code: string;
  active: boolean;
  configuration: {
    has_bom: boolean;
    has_ip_config: boolean;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DashboardMetrics {
  total: number;
  active: number;
  completed: number;
  today: number;
  byType: Array<{ taskType: string; count: string }>;
  byStatus: Array<{ status: string; count: string }>;
  avgCompletionTime: number;
}
