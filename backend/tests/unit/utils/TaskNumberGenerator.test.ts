// tests/unit/utils/TaskNumberGenerator.test.ts
import { TaskNumberGenerator } from '../../../src/services/TaskNumberGenerator';
import { AppDataSource } from '../../../src/config/database';
import { Task } from '../../../src/entities/Task';
import { SubsystemTask } from '../../../src/entities/SubsystemTask';
import { createMockRepository } from '../../mocks/database.mock';

// Mock the database module
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('TaskNumberGenerator', () => {
  let mockTaskRepository: any;
  let mockSubsystemTaskRepository: any;

  beforeEach(() => {
    mockTaskRepository = createMockRepository<Task>();
    mockSubsystemTaskRepository = createMockRepository<SubsystemTask>();
    
    // Mock getRepository to return appropriate repository based on entity type
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Task) {
        return mockTaskRepository;
      } else if (entity === SubsystemTask) {
        return mockSubsystemTaskRepository;
      }
      return mockTaskRepository;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate task number in ZXXXXMMRR format when no tasks exist', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);
      
      const taskNumber = await TaskNumberGenerator.generate();
      
      expect(taskNumber).toBeDefined();
      expect(taskNumber.length).toBe(9);
      expect(taskNumber.startsWith('Z')).toBe(true);
      expect(/^Z\d{4}(0[1-9]|1[0-2])\d{2}$/.test(taskNumber)).toBe(true);
    });

    it('should increment sequence number when tasks exist in tasks table', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z0005${month}${year}`
        }),
      };
      
      const mockSubsystemTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockTaskQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockSubsystemTaskQueryBuilder);
      
      const taskNumber = await TaskNumberGenerator.generate();
      
      expect(taskNumber).toBe(`Z0006${month}${year}`);
    });

    it('should increment sequence number when tasks exist in subsystem_tasks table', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      
      const mockSubsystemTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z0010${month}${year}`
        }),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockTaskQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockSubsystemTaskQueryBuilder);
      
      const taskNumber = await TaskNumberGenerator.generate();
      
      expect(taskNumber).toBe(`Z0011${month}${year}`);
    });

    it('should use the maximum sequence number from both tables', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z0005${month}${year}` // Lower number in tasks table
        }),
      };
      
      const mockSubsystemTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z0010${month}${year}` // Higher number in subsystem_tasks table
        }),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockTaskQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockSubsystemTaskQueryBuilder);
      
      const taskNumber = await TaskNumberGenerator.generate();
      
      // Should use the higher number from subsystem_tasks and increment it
      expect(taskNumber).toBe(`Z0011${month}${year}`);
    });

    it('should use the maximum sequence number when subsystem_tasks has lower number', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z0020${month}${year}` // Higher number in tasks table
        }),
      };
      
      const mockSubsystemTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z0005${month}${year}` // Lower number in subsystem_tasks table
        }),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockTaskQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockSubsystemTaskQueryBuilder);
      
      const taskNumber = await TaskNumberGenerator.generate();
      
      // Should use the higher number from tasks and increment it
      expect(taskNumber).toBe(`Z0021${month}${year}`);
    });

    it('should throw error when max sequence reached in tasks table', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z9999${month}${year}`
        }),
      };
      
      const mockSubsystemTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockTaskQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockSubsystemTaskQueryBuilder);
      
      await expect(TaskNumberGenerator.generate()).rejects.toThrow(
        `Maksymalna liczba zadań (9999) osiągnięta dla miesiąca ${month}/${year}`
      );
    });

    it('should throw error when max sequence reached in subsystem_tasks table', async () => {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      
      const mockTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      
      const mockSubsystemTaskQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          taskNumber: `Z9999${month}${year}`
        }),
      };
      
      mockTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockTaskQueryBuilder);
      mockSubsystemTaskRepository.createQueryBuilder = jest.fn().mockReturnValue(mockSubsystemTaskQueryBuilder);
      
      await expect(TaskNumberGenerator.generate()).rejects.toThrow(
        `Maksymalna liczba zadań (9999) osiągnięta dla miesiąca ${month}/${year}`
      );
    });
  });

  describe('validate', () => {
    it('should return true for valid ZXXXXMMRR format', () => {
      expect(TaskNumberGenerator.validate('Z00010126')).toBe(true);
      expect(TaskNumberGenerator.validate('Z99991225')).toBe(true);
      expect(TaskNumberGenerator.validate('Z00050626')).toBe(true);
    });

    it('should return false for invalid length', () => {
      expect(TaskNumberGenerator.validate('Z0001012')).toBe(false); // Too short
      expect(TaskNumberGenerator.validate('Z00010126X')).toBe(false); // Too long
      expect(TaskNumberGenerator.validate('')).toBe(false);
    });

    it('should return false for not starting with Z', () => {
      expect(TaskNumberGenerator.validate('A00010126')).toBe(false);
      expect(TaskNumberGenerator.validate('100010126')).toBe(false);
    });

    it('should return false for invalid month', () => {
      expect(TaskNumberGenerator.validate('Z00011326')).toBe(false); // Month 13
      expect(TaskNumberGenerator.validate('Z00010026')).toBe(false); // Month 00
    });

    it('should return false for old numeric format', () => {
      expect(TaskNumberGenerator.validate('123456789')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(TaskNumberGenerator.validate(null as any)).toBe(false);
      expect(TaskNumberGenerator.validate(undefined as any)).toBe(false);
    });
  });
});
