// tests/unit/utils/TaskNumberGenerator.test.ts
import { TaskNumberGenerator } from '../../../src/services/TaskNumberGenerator';
import { AppDataSource } from '../../../src/config/database';
import { Task } from '../../../src/entities/Task';
import { createMockRepository } from '../../mocks/database.mock';

// Mock the database module
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('TaskNumberGenerator', () => {
  let mockTaskRepository: any;

  beforeEach(() => {
    mockTaskRepository = createMockRepository<Task>();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockTaskRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a unique 9-digit task number', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      const taskNumber = await TaskNumberGenerator.generate();

      expect(taskNumber).toBeDefined();
      expect(taskNumber.length).toBe(9);
      expect(parseInt(taskNumber)).toBeGreaterThanOrEqual(100000000);
      expect(parseInt(taskNumber)).toBeLessThanOrEqual(999999999);
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { taskNumber },
      });
    });

    it('should retry if first generated number already exists', async () => {
      // First call returns existing task, second returns null
      mockTaskRepository.findOne
        .mockResolvedValueOnce({ id: 1, taskNumber: '123456789' })
        .mockResolvedValueOnce(null);

      const taskNumber = await TaskNumberGenerator.generate();

      expect(taskNumber).toBeDefined();
      expect(taskNumber.length).toBe(9);
      expect(mockTaskRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      // Always return existing task
      mockTaskRepository.findOne.mockResolvedValue({ id: 1, taskNumber: '123456789' });

      await expect(TaskNumberGenerator.generate()).rejects.toThrow(
        'Nie udało się wygenerować unikalnego numeru zadania po wielu próbach'
      );
      
      expect(mockTaskRepository.findOne).toHaveBeenCalledTimes(10);
    });
  });

  describe('validate', () => {
    it('should return true for valid task number', () => {
      expect(TaskNumberGenerator.validate('123456789')).toBe(true);
      expect(TaskNumberGenerator.validate('100000000')).toBe(true);
      expect(TaskNumberGenerator.validate('999999999')).toBe(true);
    });

    it('should return false for invalid length', () => {
      expect(TaskNumberGenerator.validate('12345678')).toBe(false);
      expect(TaskNumberGenerator.validate('1234567890')).toBe(false);
      expect(TaskNumberGenerator.validate('')).toBe(false);
    });

    it('should return false for non-numeric values', () => {
      expect(TaskNumberGenerator.validate('12345678a')).toBe(false);
      expect(TaskNumberGenerator.validate('abcdefghi')).toBe(false);
    });

    it('should return false for numbers outside valid range', () => {
      expect(TaskNumberGenerator.validate('099999999')).toBe(false);
      expect(TaskNumberGenerator.validate('000000001')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(TaskNumberGenerator.validate(null as any)).toBe(false);
      expect(TaskNumberGenerator.validate(undefined as any)).toBe(false);
    });
  });
});
