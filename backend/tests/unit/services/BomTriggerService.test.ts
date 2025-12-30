// tests/unit/services/BomTriggerService.test.ts
import { BomTriggerService } from '../../../src/services/BomTriggerService';
import { AppDataSource } from '../../../src/config/database';
import { BomTrigger } from '../../../src/entities/BomTrigger';
import { BomTriggerLog } from '../../../src/entities/BomTriggerLog';
import { createMockRepository } from '../../mocks/database.mock';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('BomTriggerService', () => {
  let mockTriggerRepository: any;
  let mockLogRepository: any;

  beforeEach(() => {
    mockTriggerRepository = createMockRepository<BomTrigger>();
    mockLogRepository = createMockRepository<BomTriggerLog>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === BomTrigger || entity?.name === 'BomTrigger') return mockTriggerRepository;
      if (entity === BomTriggerLog || entity?.name === 'BomTriggerLog') return mockLogRepository;
      return createMockRepository();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTriggers', () => {
    it('should return all active triggers', async () => {
      const mockTriggers = [
        {
          id: 1,
          name: 'Test Trigger',
          triggerEvent: 'ON_TASK_CREATE',
          actionType: 'ADD_MATERIAL',
          isActive: true,
        },
      ] as any;

      mockTriggerRepository.find.mockResolvedValue(mockTriggers);

      const result = await BomTriggerService.getAllTriggers({ isActive: true });

      expect(mockTriggerRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        relations: ['sourceTaskType', 'targetTaskType', 'creator'],
        order: { priority: 'DESC', createdAt: 'DESC' },
      });
      expect(result).toEqual(mockTriggers);
    });
  });

  describe('getTriggerById', () => {
    it('should return a trigger by ID', async () => {
      const mockTrigger = {
        id: 1,
        name: 'Test Trigger',
        triggerEvent: 'ON_TASK_CREATE',
        actionType: 'ADD_MATERIAL',
        isActive: true,
      } as any;

      mockTriggerRepository.findOne.mockResolvedValue(mockTrigger);

      const result = await BomTriggerService.getTriggerById(1);

      expect(mockTriggerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['sourceTaskType', 'targetTaskType', 'creator'],
      });
      expect(result).toEqual(mockTrigger);
    });
  });

  describe('createTrigger', () => {
    it('should create a new trigger', async () => {
      const triggerData = {
        name: 'New Trigger',
        triggerEvent: 'ON_TASK_CREATE' as const,
        actionType: 'ADD_MATERIAL' as const,
        actionConfig: { materialName: 'Test Material' },
      };

      const createdTrigger = {
        id: 1,
        ...triggerData,
        createdBy: 1,
        priority: 10,
        isActive: true,
      } as any;

      mockTriggerRepository.create.mockReturnValue(createdTrigger);
      mockTriggerRepository.save.mockResolvedValue(createdTrigger);

      const result = await BomTriggerService.createTrigger(triggerData, 1);

      expect(mockTriggerRepository.create).toHaveBeenCalled();
      expect(mockTriggerRepository.save).toHaveBeenCalled();
      expect(result).toEqual(createdTrigger);
    });
  });

  describe('toggleTrigger', () => {
    it('should toggle trigger active status', async () => {
      const mockTrigger = {
        id: 1,
        isActive: true,
      } as any;

      mockTriggerRepository.findOne.mockResolvedValue(mockTrigger);
      mockTriggerRepository.save.mockResolvedValue({ ...mockTrigger, isActive: false });

      const result = await BomTriggerService.toggleTrigger(1);

      expect(mockTriggerRepository.findOne).toHaveBeenCalled();
      expect(mockTriggerRepository.save).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });

    it('should throw error if trigger not found', async () => {
      mockTriggerRepository.findOne.mockResolvedValue(null);

      await expect(BomTriggerService.toggleTrigger(999)).rejects.toThrow('Trigger nie znaleziony');
    });
  });

  describe('getAvailableEvents', () => {
    it('should return list of available events', () => {
      const events = BomTriggerService.getAvailableEvents();

      expect(events).toHaveLength(5);
      expect(events[0]).toHaveProperty('value');
      expect(events[0]).toHaveProperty('label');
      expect(events[0]).toHaveProperty('description');
    });
  });

  describe('getAvailableActions', () => {
    it('should return list of available actions', () => {
      const actions = BomTriggerService.getAvailableActions();

      expect(actions).toHaveLength(5);
      expect(actions[0]).toHaveProperty('value');
      expect(actions[0]).toHaveProperty('label');
      expect(actions[0]).toHaveProperty('description');
    });
  });
});
