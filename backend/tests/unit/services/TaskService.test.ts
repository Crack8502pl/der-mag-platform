// tests/unit/services/TaskService.test.ts
import { TaskService } from '../../../src/services/TaskService';
import { AppDataSource } from '../../../src/config/database';
import { Task } from '../../../src/entities/Task';
import { TaskType } from '../../../src/entities/TaskType';
import { TaskMaterial } from '../../../src/entities/TaskMaterial';
import { BOMTemplate } from '../../../src/entities/BOMTemplate';
import { TaskActivity } from '../../../src/entities/TaskActivity';
import { ActivityTemplate } from '../../../src/entities/ActivityTemplate';
import { TaskNumberGenerator } from '../../../src/services/TaskNumberGenerator';
import { createMockRepository } from '../../mocks/database.mock';
import { BomTriggerService } from '../../../src/services/BomTriggerService';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/TaskNumberGenerator');

jest.mock('../../../src/services/BomTriggerService', () => ({
  BomTriggerService: {
    executeTriggers: jest.fn(),
  },
}));

describe('TaskService', () => {
  let mockTaskRepository: any;
  let mockTaskTypeRepository: any;
  let mockBOMTemplateRepository: any;
  let mockTaskMaterialRepository: any;
  let mockActivityTemplateRepository: any;
  let mockTaskActivityRepository: any;

  beforeEach(() => {
    mockTaskRepository = createMockRepository<Task>();
    mockTaskTypeRepository = createMockRepository<TaskType>();
    mockBOMTemplateRepository = createMockRepository<BOMTemplate>();
    mockTaskMaterialRepository = createMockRepository<TaskMaterial>();
    mockActivityTemplateRepository = createMockRepository<ActivityTemplate>();
    mockTaskActivityRepository = createMockRepository<TaskActivity>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === Task || entity?.name === 'Task') return mockTaskRepository;
      if (entity === TaskType || entity?.name === 'TaskType') return mockTaskTypeRepository;
      if (entity === BOMTemplate || entity?.name === 'BOMTemplate') return mockBOMTemplateRepository;
      if (entity === TaskMaterial || entity?.name === 'TaskMaterial') return mockTaskMaterialRepository;
      if (entity === ActivityTemplate || entity?.name === 'ActivityTemplate') return mockActivityTemplateRepository;
      if (entity === TaskActivity || entity?.name === 'TaskActivity') return mockTaskActivityRepository;
      return createMockRepository();
    });

    (TaskNumberGenerator.generate as jest.Mock).mockResolvedValue('123456789');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const mockTaskData = {
      taskTypeId: 1,
      title: 'Test Task',
      description: 'Test Description',
      plannedStartDate: '2024-01-01',
      plannedEndDate: '2024-01-31',
    };

    it('should create a task with generated task number', async () => {
      const mockTaskType = { id: 1, name: 'SMW', active: true };
      const mockCreatedTask = {
        id: 1,
        taskNumber: '123456789',
        ...mockTaskData,
        status: 'created',
      };

      mockTaskTypeRepository.findOne.mockResolvedValue(mockTaskType);
      mockTaskRepository.create.mockReturnValue(mockCreatedTask);
      mockTaskRepository.save.mockResolvedValue(mockCreatedTask);
      mockBOMTemplateRepository.find.mockResolvedValue([]);
      mockActivityTemplateRepository.find.mockResolvedValue([]);
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockCreatedTask,
        taskType: mockTaskType,
        materials: [],
        activities: [],
      });

      const result = await TaskService.createTask(mockTaskData);

      expect(TaskNumberGenerator.generate).toHaveBeenCalled();
      expect(mockTaskTypeRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTaskData.taskTypeId, active: true },
      });
      expect(mockTaskRepository.create).toHaveBeenCalledWith({
        ...mockTaskData,
        taskNumber: '123456789',
        status: 'created',
      });
      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(result.taskNumber).toBe('123456789');
    });

    it('should throw error if task type does not exist', async () => {
      mockTaskTypeRepository.findOne.mockResolvedValue(null);

      await expect(TaskService.createTask(mockTaskData)).rejects.toThrow('Nieznany typ zadania');
      expect(mockTaskRepository.create).not.toHaveBeenCalled();
    });

    it('should initialize BOM materials from templates', async () => {
      const mockTaskType = { id: 1, name: 'SMW', active: true };
      const mockCreatedTask = {
        id: 1,
        taskNumber: '123456789',
        ...mockTaskData,
        status: 'created',
      };
      const mockBOMTemplates = [
        {
          id: 1,
          taskTypeId: 1,
          materialName: 'Cable',
          defaultQuantity: 100,
          unit: 'm',
          category: 'Cables',
          active: true,
        },
        {
          id: 2,
          taskTypeId: 1,
          materialName: 'Connector',
          defaultQuantity: 10,
          unit: 'pcs',
          category: 'Hardware',
          active: true,
        },
      ];

      mockTaskTypeRepository.findOne.mockResolvedValue(mockTaskType);
      mockTaskRepository.create.mockReturnValue(mockCreatedTask);
      mockTaskRepository.save.mockResolvedValue(mockCreatedTask);
      mockBOMTemplateRepository.find.mockResolvedValue(mockBOMTemplates);
      mockActivityTemplateRepository.find.mockResolvedValue([]);
      mockTaskMaterialRepository.create.mockImplementation((data: any) => data);
      mockTaskMaterialRepository.save.mockResolvedValue({});
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockCreatedTask,
        taskType: mockTaskType,
        materials: [],
        activities: [],
      });

      await TaskService.createTask(mockTaskData);

      expect(mockBOMTemplateRepository.find).toHaveBeenCalledWith({
        where: { taskTypeId: 1, active: true },
      });
      expect(mockTaskMaterialRepository.create).toHaveBeenCalledTimes(2);
      expect(mockTaskMaterialRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should initialize activities from templates', async () => {
      const mockTaskType = { id: 1, name: 'SMW', active: true };
      const mockCreatedTask = {
        id: 1,
        taskNumber: '123456789',
        ...mockTaskData,
        status: 'created',
      };
      const mockActivityTemplates = [
        {
          id: 1,
          taskTypeId: 1,
          name: 'Installation',
          description: 'Install equipment',
          sequence: 1,
          requiresPhoto: true,
          active: true,
        },
        {
          id: 2,
          taskTypeId: 1,
          name: 'Testing',
          description: 'Test equipment',
          sequence: 2,
          requiresPhoto: false,
          active: true,
        },
      ];

      mockTaskTypeRepository.findOne.mockResolvedValue(mockTaskType);
      mockTaskRepository.create.mockReturnValue(mockCreatedTask);
      mockTaskRepository.save.mockResolvedValue(mockCreatedTask);
      mockBOMTemplateRepository.find.mockResolvedValue([]);
      mockActivityTemplateRepository.find.mockResolvedValue(mockActivityTemplates);
      mockTaskActivityRepository.create.mockImplementation((data: any) => data);
      mockTaskActivityRepository.save.mockResolvedValue({});
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockCreatedTask,
        taskType: mockTaskType,
        materials: [],
        activities: [],
      });

      await TaskService.createTask(mockTaskData);

      expect(mockActivityTemplateRepository.find).toHaveBeenCalledWith({
        where: { taskTypeId: 1, active: true },
        order: { sequence: 'ASC' },
      });
      expect(mockTaskActivityRepository.create).toHaveBeenCalledTimes(2);
      expect(mockTaskActivityRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const mockTask = {
        id: 1,
        taskNumber: '123456789',
        status: 'created',
        actualStartDate: null,
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, status: 'in_progress' });

      const result = await TaskService.updateTaskStatus('123456789', 'in_progress', 1);

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { taskNumber: '123456789' },
      });
      expect(mockTask.status).toBe('in_progress');
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should throw error if task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(TaskService.updateTaskStatus('999999999', 'in_progress', 1)).rejects.toThrow(
        'Zadanie nie znalezione'
      );
    });

    it('should set actualStartDate when status changed to started', async () => {
      const mockTask = {
        id: 1,
        taskNumber: '123456789',
        status: 'created',
        actualStartDate: null,
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskService.updateTaskStatus('123456789', 'started', 1);

      expect(mockTask.actualStartDate).toBeInstanceOf(Date);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should set actualEndDate when status changed to completed', async () => {
      const mockTask = {
        id: 1,
        taskNumber: '123456789',
        status: 'in_progress',
        actualStartDate: new Date(),
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskService.updateTaskStatus('123456789', 'completed', 1);

      expect(mockTask.actualEndDate).toBeInstanceOf(Date);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });

    it('should not update actualStartDate if already set', async () => {
      const existingStartDate = new Date('2024-01-01');
      const mockTask = {
        id: 1,
        taskNumber: '123456789',
        status: 'created',
        actualStartDate: existingStartDate,
        actualEndDate: null,
      };

      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      await TaskService.updateTaskStatus('123456789', 'started', 1);

      expect(mockTask.actualStartDate).toBe(existingStartDate);
      expect(mockTaskRepository.save).toHaveBeenCalled();
    });
  });
});
