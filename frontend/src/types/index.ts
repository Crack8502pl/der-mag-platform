// Typy dla Der-Mag Platform Frontend

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician' | 'viewer' | 'coordinator';
  active: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface Task {
  id: number;
  taskNumber: string;
  title: string;
  description?: string;
  status: 'created' | 'assigned' | 'started' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  location: string;
  client?: string;
  taskType: TaskType;
  createdBy: User;
  assignedTo?: User[];
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskType {
  id: number;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface DashboardMetrics {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  delayedTasks: number;
  tasksByStatus: {
    status: string;
    count: number;
  }[];
  tasksByType: {
    taskType: string;
    count: number;
  }[];
  recentTasks: Task[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
