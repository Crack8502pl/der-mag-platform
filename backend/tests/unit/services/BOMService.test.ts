// tests/unit/services/BOMService.test.ts
import { BOMService } from '../../../src/services/BOMService';
import { AppDataSource } from '../../../src/config/database';
import { BOMTemplate } from '../../../src/entities/BOMTemplate';
import { TaskMaterial } from '../../../src/entities/TaskMaterial';
import { createMockRepository } from '../../mocks/database.mock';
import { BomTriggerService } from '../../../src/services/BomTriggerService';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../src/services/BomTriggerService', () => ({
  BomTriggerService: {
    executeTriggers: jest.fn(),
  },
}));

describe('BOMService', () => {
  let mockBOMRepository: any;
  let mockMaterialRepository: any;

  beforeEach(() => {
    mockBOMRepository = createMockRepository<BOMTemplate>();
    mockMaterialRepository = createMockRepository<TaskMaterial>();

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === BOMTemplate || entity?.name === 'BOMTemplate') return mockBOMRepository;
      if (entity === TaskMaterial || entity?.name === 'TaskMaterial') return mockMaterialRepository;
      return createMockRepository();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplatesForTaskType', () => {
    it('should return BOM templates for a task type', async () => {
      const mockTemplates = [
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
      ] as any;

      mockBOMRepository.find.mockResolvedValue(mockTemplates);

      const result = await BOMService.getTemplatesForTaskType(1);

      expect(mockBOMRepository.find).toHaveBeenCalledWith({
        where: { taskTypeId: 1, active: true },
        relations: ['taskType'],
      });
      expect(result).toEqual(mockTemplates);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no templates found', async () => {
      mockBOMRepository.find.mockResolvedValue([]);

      const result = await BOMService.getTemplatesForTaskType(999);

      expect(result).toEqual([]);
    });
  });

  describe('createTemplate', () => {
    it('should create a BOM template', async () => {
      const templateData = {
        taskTypeId: 1,
        materialName: 'New Material',
        defaultQuantity: 50,
        unit: 'kg',
        category: 'Materials',
        active: true,
      };

      const mockCreatedTemplate = {
        id: 3,
        ...templateData,
      } as any;

      mockBOMRepository.create.mockReturnValue(mockCreatedTemplate);
      mockBOMRepository.save.mockResolvedValue(mockCreatedTemplate);

      const result = await BOMService.createTemplate(templateData);

      expect(mockBOMRepository.create).toHaveBeenCalledWith(templateData);
      expect(mockBOMRepository.save).toHaveBeenCalledWith(mockCreatedTemplate);
      expect(result).toEqual(mockCreatedTemplate);
    });
  });

  describe('getTaskMaterials', () => {
    it('should return materials for a task', async () => {
      const mockMaterials = [
        {
          id: 1,
          taskId: 1,
          materialName: 'Cable',
          plannedQuantity: 100,
          usedQuantity: 80,
          unit: 'm',
        },
        {
          id: 2,
          taskId: 1,
          materialName: 'Connector',
          plannedQuantity: 10,
          usedQuantity: 10,
          unit: 'pcs',
        },
      ] as any;

      mockMaterialRepository.find.mockResolvedValue(mockMaterials);

      const result = await BOMService.getTaskMaterials(1);

      expect(mockMaterialRepository.find).toHaveBeenCalledWith({
        where: { taskId: 1 },
        relations: ['bomTemplate'],
      });
      expect(result).toEqual(mockMaterials);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if task has no materials', async () => {
      mockMaterialRepository.find.mockResolvedValue([]);

      const result = await BOMService.getTaskMaterials(999);

      expect(result).toEqual([]);
    });
  });

  describe('updateMaterialUsage', () => {
    it('should update material usage quantity', async () => {
      const mockMaterial = {
        id: 1,
        taskId: 1,
        materialName: 'Cable',
        plannedQuantity: 100,
        usedQuantity: 50,
        unit: 'm',
      } as any;

      mockMaterialRepository.findOne.mockResolvedValue(mockMaterial);
      mockMaterialRepository.save.mockResolvedValue({ ...mockMaterial, usedQuantity: 75 });

      const result = await BOMService.updateMaterialUsage(1, 75);

      expect(mockMaterialRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockMaterial.usedQuantity).toBe(75);
      expect(mockMaterialRepository.save).toHaveBeenCalled();
    });

    it('should update material usage with serial numbers', async () => {
      const mockMaterial = {
        id: 1,
        taskId: 1,
        materialName: 'Device',
        plannedQuantity: 5,
        usedQuantity: 3,
        unit: 'pcs',
        serialNumbers: [],
      } as any;

      const serialNumbers = ['SN001', 'SN002', 'SN003'];

      mockMaterialRepository.findOne.mockResolvedValue(mockMaterial);
      mockMaterialRepository.save.mockResolvedValue({ ...mockMaterial, serialNumbers });

      const result = await BOMService.updateMaterialUsage(1, 3, serialNumbers);

      expect(mockMaterial.usedQuantity).toBe(3);
      expect(mockMaterial.serialNumbers).toEqual(serialNumbers);
      expect(mockMaterialRepository.save).toHaveBeenCalled();
    });

    it('should throw error if material not found', async () => {
      mockMaterialRepository.findOne.mockResolvedValue(null);

      await expect(BOMService.updateMaterialUsage(999, 50)).rejects.toThrow(
        'Materiał nie znaleziony'
      );
    });
  });
});
