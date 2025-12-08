// Mock implementations for common services
import { Task } from '../../src/entities/Task';
import { User } from '../../src/entities/User';

/**
 * Mock TaskService
 */
export const mockTaskService = {
  createTask: jest.fn(),
  getTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  listTasks: jest.fn(),
  updateStatus: jest.fn(),
  assignUsers: jest.fn(),
};

/**
 * Mock EmailQueueService
 */
export const mockEmailQueueService = {
  addToQueue: jest.fn(),
  sendEmail: jest.fn(),
  processQueue: jest.fn(),
};

/**
 * Mock PhotoService
 */
export const mockPhotoService = {
  processPhoto: jest.fn(),
  extractExif: jest.fn(),
  compressImage: jest.fn(),
  generateThumbnail: jest.fn(),
};

/**
 * Mock BOMService
 */
export const mockBOMService = {
  getTemplates: jest.fn(),
  createMaterial: jest.fn(),
  updateQuantity: jest.fn(),
  deleteMaterial: jest.fn(),
};

/**
 * Mock MetricsService
 */
export const mockMetricsService = {
  getDashboardMetrics: jest.fn(),
  getTaskTypeStats: jest.fn(),
  getUserStats: jest.fn(),
};

/**
 * Mock TaskNumberGenerator
 */
export const mockTaskNumberGenerator = {
  generate: jest.fn().mockResolvedValue('123456789'),
  validate: jest.fn().mockReturnValue(true),
};

/**
 * Reset all service mocks
 */
export const resetAllServiceMocks = () => {
  Object.values(mockTaskService).forEach(mock => mock.mockReset());
  Object.values(mockEmailQueueService).forEach(mock => mock.mockReset());
  Object.values(mockPhotoService).forEach(mock => mock.mockReset());
  Object.values(mockBOMService).forEach(mock => mock.mockReset());
  Object.values(mockMetricsService).forEach(mock => mock.mockReset());
  Object.values(mockTaskNumberGenerator).forEach(mock => mock.mockReset());
};
